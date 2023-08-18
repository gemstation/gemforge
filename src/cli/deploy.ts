import { ethers } from 'ethers'
import { error, info } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { FacetDefinition, loadJson, readDeployedAddress, updateDeployedAddress } from '../shared/fs.js'
import path from 'node:path'
import { createCommand, logSuccess } from './common.js'
import { ContractArtifact, OnChainContract, deployContract, execContractMethod, getContractAt, getContractValue, loadContractArtifact, setupNetwork, setupWallet } from '../shared/chain.js'
import { getFinalizedFacetCuts, resolveUpgrade } from '../shared/diamond.js'
import { Signer } from 'ethers'

export const command = () =>
  createCommand('deploy', 'Deploy the diamond to a network.')
    .argument('[network]', 'network to deploy to', 'local')
    .option('-n, --new', 'do a fresh deployment, ignore any existing one')
    .action(async (networkArg, args) => {
      const ctx = await getContext(args)

      info(`Selected network: ${networkArg}`)
      const n = ctx.config.networks[networkArg]
      if (!n) {
        error(`Network not found in config: ${networkArg}`)
      }
      info('Setting up network connection...')
      const network = await setupNetwork(n)
      info(`   Network chainId: ${network.chainId}`)

      info(`Setting up wallet "${network.config.wallet}" ...`)
      const walletConfig = ctx.config.wallets[network.config.wallet]
      const wallet = setupWallet(walletConfig, network.provider)!
      const walletAddress = await wallet.getAddress()
      info(`Wallet deployer address: ${walletAddress}`)

      const signer = wallet.connect(network.provider)

      const generatedSupportPath = path.resolve(ctx.folder, ctx.config.paths.generated.support)
      const deployedAddressesJsonPath = path.resolve(ctx.folder, 'gemforge.deployments.json')
      const artifactsFolder = path.resolve(ctx.folder, ctx.config.paths.artifacts)

      let proxyInterface: OnChainContract

      if (args.new) {
        info('New deployment requested. Skipping any existing deployment...')
        proxyInterface = await deployNewDiamond(artifactsFolder, signer)
      } else {
        info(`Load existing deployment ...`)

        const existing = readDeployedAddress(deployedAddressesJsonPath, network)
        if (existing) {
          info(`   Existing deployment found at: ${existing}`)
          info(`Checking if existing deployment is still valid...`)
          proxyInterface = await getContractAt('IDiamondProxy', artifactsFolder, signer, existing)

          const isDiamond = await getContractValue(proxyInterface, 'supportsInterface', ['0x01ffc9a7'])
          if (!isDiamond) {
            error(`Existing deployment is not a diamond: supportsInterface() error`)
          }

          const facets = await getContractValue(proxyInterface, 'facets', [])
          if (!facets) {
          error(`Existing deployment is not a diamond: facets() error`)
          }
        } else {
          info(`   No existing deployment found.`)
          proxyInterface = await deployNewDiamond(artifactsFolder, signer)
        }
      }

      info('Loading facet artifacts...')
      const facets = loadJson(`${generatedSupportPath}/facets.json`) as Record<string, FacetDefinition>
      const facetContractNames = Object.keys(facets)
      info(`   ${facetContractNames.length} facets found.`)
      const facetArtifacts = facetContractNames.reduce((m, name) => {
        m[name] = loadContractArtifact(name, artifactsFolder)
        return m
      }, {} as Record<string, ContractArtifact>)

      info('Resolving what chaned need to be applied ...')
      const changes = await resolveUpgrade(facetArtifacts, proxyInterface, signer)
      info(`   ${changes.facetsToDeploy.length} facets need to be deployed.`)
      info(`   ${changes.namedCuts.length} facet cuts need to be applied.`)

      if (changes.namedCuts.length === 0) {
        info('No changes need to be applied.')
      } else {
        const facetContracts: Record<string, OnChainContract> = {}

        if (changes.facetsToDeploy.length) {
          info('Deploying facets...')
          await Promise.all(changes.facetsToDeploy.map(async name => {
            info(`   Deploying ${name} ...`)
            const contract = await deployContract(name, artifactsFolder, signer)
            facetContracts[name] = contract
            info(`   Deployed ${name} at: ${await contract.address}`)
          }))
        } else {
          info('No new facets need to be deployed.')
        }

        info('Upgrading the diamond proxy...')
        const cuts = getFinalizedFacetCuts(changes.namedCuts, facetContracts)
        await execContractMethod(proxyInterface, 'diamondCut', [cuts, ethers.ZeroAddress, '0x'])
      }

      info(`Saving deployment info...`)
      updateDeployedAddress(deployedAddressesJsonPath, network, proxyInterface.address)

      logSuccess()
    })

  
  const deployNewDiamond = async (artifactsFolder: string, signer: Signer) => {
    info(`Deploying diamond...`)
    const diamond = await deployContract('DiamondProxy', artifactsFolder, signer, await signer.getAddress())
    info(`   DiamondProxy deployed at: ${diamond.address}`)
    return await getContractAt('IDiamondProxy', artifactsFolder, signer, diamond.address)
  }