import { ethers } from 'ethers'

import { error, info, trace } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { FacetDefinition, loadJson, updateDeployedAddresses } from '../shared/fs.js'
import path from 'node:path'
import { createCommand, logSuccess } from './common.js'
import { ContractArtifact, OnChainContract, deployContract, execContractMethod, getContractAt, loadContractArtifact, setupNetwork, setupWallet } from '../shared/chain.js'
import { Contract } from 'ethers'
import { getFacetCuts } from '../shared/diamond.js'

export const command = () =>
  createCommand('deploy', 'Deploy the diamond to a network.')
    .argument('[network]', 'network to deploy to', 'local')
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

      info('Loading facets.json...')
      const facets = loadJson(`${generatedSupportPath}/facets.json`) as Record<string, FacetDefinition>
      const facetContractNames = Object.keys(facets)

      const artifactsFolder = path.resolve(ctx.folder, ctx.config.paths.artifacts)

      info('Deploying facets...')
      const facetContracts: Record<string, OnChainContract> = {}
      await Promise.all(facetContractNames.map(async name => {
        info(`   Deploying ${name} ...`)
        const contract = await deployContract(name, artifactsFolder, signer)
        facetContracts[name] = contract
        info(`   Deployed ${name} at: ${await contract.address}`)
      }))

      info('Deploying diamond...')
      const diamond = await deployContract('DiamondProxy', artifactsFolder, signer, walletAddress)
      info(`   DiamondProxy deployed at: ${diamond.address}`)

      info('Register facets with the diamond...')
      const proxyInterface = await getContractAt('IDiamondProxy', artifactsFolder, signer, diamond.address)
      const cuts = await getFacetCuts(facets, facetContracts)
      await execContractMethod(proxyInterface, 'diamondCut', [cuts, ethers.ZeroAddress, '0x'])

      info('Updating gemforge.deployments.json')
      const deployedAddressesPath = path.resolve(ctx.folder, 'gemforge.deployments.json')
      updateDeployedAddresses(deployedAddressesPath, network, diamond)

      logSuccess()
    })

  