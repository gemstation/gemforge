import * as timersPromises from 'node:timers/promises';
import { ethers } from 'ethers'
import { error, info } from '../shared/log.js'
import { Context, getContext } from '../shared/context.js'
import { $, FacetDefinition, loadJson } from '../shared/fs.js'
import { createCommand, logSuccess } from './common.js'
import { ContractArtifact, OnChainContract, saveDeploymentInfo, deployContract, execContractMethod, getContractAt, getContractValue, loadContractArtifact, setupNetwork, setupWallet, clearDeploymentRecords, getDeploymentRecords, readDeploymentInfo } from '../shared/chain.js'
import { FacetCutAction, getFinalizedFacetCuts, resolveUpgrade } from '../shared/diamond.js'
import { Signer } from 'ethers'

export const command = () =>
  createCommand('deploy', 'Deploy the diamond to a network.')
    .argument('[network]', 'network to deploy to', 'local')
    .option('-n, --new', 'do a fresh deployment, ignoring any existing one')
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

      const $$ = $({ 
        cwd: ctx.folder, 
        quiet: args.quiet,
        env: {
          GEMFORGE_DEPLOY_CHAIN_ID: `${network.chainId}`,
        }
      })

      // run pre-deploy hook
      if (ctx.config.hooks.preDeploy) {
        info('Running pre-deploy hook...')
        await $$`${ctx.config.hooks.preDeploy}`
      }

      let proxyInterface: OnChainContract

      let isNewDeployment = false

      // reset deploment records
      clearDeploymentRecords()

      if (args.new) {
        info('New deployment requested. Skipping any existing deployment...')
        proxyInterface = await deployNewDiamond(ctx, signer)
        isNewDeployment = true
      } else {
        info(`Load existing deployment ...`)

        const existing = readDeploymentInfo(ctx.deploymentInfoJsonPath, network).find(r => r.name === 'DiamondProxy')
        if (existing) {
          info(`   Existing deployment found at: ${existing.contract.address}`)
          info(`Checking if existing deployment is still valid...`)
          proxyInterface = await getContractAt(ctx, 'IDiamondProxy', signer, existing.contract.address)

          try {
            const isDiamond = await getContractValue(proxyInterface, 'supportsInterface', ['0x01ffc9a7'], true)
            if (!isDiamond) {
              throw new Error(`supportsInterface() error`)
            }

            const facets = await getContractValue(proxyInterface, 'facets', [], true)
            if (!facets) {
              throw new Error(`facets() error`)
            }
          } catch (err: any) {
            error(`Existing deployment is not a diamond: ${err.message}\n\nYou may want to run with --new to force a fresh deployment.`)
          }
        } else {
          info(`   No existing deployment found.`)
          proxyInterface = await deployNewDiamond(ctx, signer)
          isNewDeployment = true
        }
      }

      info('Loading user facet artifacts...')
      const userFacets = loadJson(`${ctx.generatedSupportPath}/facets.json`) as Record<string, FacetDefinition>
      const userFacetContractNames = Object.keys(userFacets)
      info(`   ${userFacetContractNames.length} facets found.`)
      const userFacetArtifacts = userFacetContractNames.reduce((m, name) => {
        m[name] = loadContractArtifact(ctx, name)
        return m
      }, {} as Record<string, ContractArtifact>)

      info('Loading core facet artifacts...')
      const coreFacets = ctx.config.diamond.coreFacets.reduce((m, name) => {
        m[name] = loadContractArtifact(ctx, name)
        return m
      }, {} as Record<string, ContractArtifact>)

      info('Resolving what changes need to be applied ...')
      const changes = await resolveUpgrade({
        userFacets: userFacetArtifacts,
        coreFacets,
        diamondProxy: proxyInterface,
        signer
      })
      const numAdds = changes.namedCuts.filter(c => c.action === FacetCutAction.Add).length
      const numReplacements = changes.namedCuts.filter(c => c.action === FacetCutAction.Replace).length
      const numRemovals = changes.namedCuts.filter(c => c.action === FacetCutAction.Remove).length
      info(`   ${changes.facetsToDeploy.length} facets need to be deployed.`)
      info(`   ${changes.namedCuts.length} facet cuts need to be applied (Add = ${numAdds}, Replace = ${numReplacements}, Remove = ${numRemovals}).`)

      if (changes.namedCuts.length === 0) {
        info('No changes need to be applied.')
      } else {
        const facetContracts: Record<string, OnChainContract> = {}

        if (changes.facetsToDeploy.length) {
          info('Deploying facets...')
          /* 
            TODO: sometimes the parallelization fails so let's do it sequentially for now (above)
            
            await Promise.all(changes.facetsToDeploy.map(async name => {
              info(`   Deploying ${name} ...`)
              const contract = await deployContract(ctx, name, signer)
              await timersPromises.setTimeout(1000)
              facetContracts[name] = contract
              info(`   Deployed ${name} at: ${await contract.address}`)
            }))
          */
          for (const name of changes.facetsToDeploy) {
            info(`   Deploying ${name} ...`)
            const contract = await deployContract(ctx, name, signer)
            facetContracts[name] = contract
            info(`   Deployed ${name} at: ${await contract.address}`)
          }
        } else {
          info('No new facets need to be deployed.')
        }

        let initContractAddress: string = ethers.ZeroAddress
        let initData: string = '0x'

        if (isNewDeployment && ctx.config.diamond.init) {
          info(`Deploying initialization contract: ${ctx.config.diamond.init} ...`)
          const init = await deployContract(ctx, ctx.config.diamond.init, signer)
          if (!init.contract.interface.getFunction('init')) {
            error(`Initialization contract does not have an init() function.`)
          }
          initContractAddress = init.address
          initData = init.contract.interface.getFunction('init')!.selector
          info(`   Initialization contract deployed at: ${initContractAddress}`)
        }
        
        info('Calling diamondCut() on the proxy...')
        const cuts = getFinalizedFacetCuts(changes.namedCuts, facetContracts)
        await execContractMethod(proxyInterface, 'diamondCut', [cuts, initContractAddress, initData])
      }

      const deploymentRecords = getDeploymentRecords()
      if (deploymentRecords.length) {
        info(`Deployments took place, saving info...`)
        saveDeploymentInfo(ctx.deploymentInfoJsonPath, network, getDeploymentRecords(), isNewDeployment)
      }

      // run post-deploy hook
      if (ctx.config.hooks.postDeploy) {
        info('Running post-deploy hook...')
        await $$`${ctx.config.hooks.postDeploy}`
      }

      logSuccess()
    })

  
  const deployNewDiamond = async (ctx: Context, signer: Signer) => {
    info(`Deploying diamond...`)
    const diamond = await deployContract(ctx, 'DiamondProxy', signer, await signer.getAddress())
    info(`   DiamondProxy deployed at: ${diamond.address}`)
    return await getContractAt(ctx, 'IDiamondProxy', signer, diamond.address)
  }