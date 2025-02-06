import { Signer, ZeroAddress, ethers } from 'ethers'
import { OnChainContract, Target, clearDeploymentRecorder, deployContract, deployContract3, execContractMethod, getContractAt, getDeploymentRecorderData, saveDeploymentInfo, setupTarget, setupWallet } from '../shared/chain.js'
import { Context, getContext } from '../shared/context.js'
import { FacetCut, FacetCutAction, getFinalizedFacetCuts, resolveClean, resolveUpgrade } from '../shared/diamond.js'
import { $, loadJson, saveJson } from '../shared/fs.js'
import { error, info, notice, trace, warn } from '../shared/log.js'
import { createCommand, loadExistingDeploymentAndLog, loadFacetArtifactsAndLog, logSuccess } from './common.js'

export const command = () =>
  createCommand('deploy', 'Deploy/upgrade a diamond.')
    .argument('target', 'target to deploy/upgrade')
    .option('-d, --dry', 'do a dry run without actually deploying anything')
    .option('-n, --new', 'do a fresh deployment with a new contract address, overwriting any existing one')
    .option('-r, --reset', 'remove all non-core facet selectors from an existing deployment and start afresh')
    .option('--upgrade-init-contract <contract>', 'deploy a custom initialization contract to run during an upgrade')
    .option('--upgrade-init-method <method>', 'method to call on the custom initialization contract during the upgrade')
    .option('--pause-cut-to-file <file>', 'pause before the diamondCut() method is called and the write the cut info to a file')
    .option('--resume-cut-from-file <file>', 'resume a diamondCut() method call using the cut info in the given file')
    .action(async (targetArg, args) => {
      const ctx = await getContext(args)

      info(`Selected target: ${targetArg}`)
      const t = ctx.config.targets[targetArg]
      if (!t) {
        error(`Target not found in config: ${targetArg}`)
      }

      info(`Setting up target network connection "${t.network}" ...`)
      const target = await setupTarget(ctx, t)
      info(`   Network chainId: ${target.network.chainId}`)

      info(`Setting up wallet "${t.wallet}" ...`)
      const walletConfig = ctx.config.wallets[t.wallet]
      const wallet = setupWallet(walletConfig)!
      const walletAddress = await wallet.getAddress()
      info(`Wallet deployer address: ${walletAddress}`)

      const signer = wallet.connect(target.network.provider)

      const $$ = $({ 
        cwd: ctx.folder, 
        quiet: args.quiet,
        env: {
          GEMFORGE_DEPLOY_TARGET: targetArg,
          GEMFORGE_DEPLOY_CHAIN_ID: `${target.network.chainId}`,
        }
      })

      // run pre-deploy hook
      if (ctx.config.hooks.preDeploy) {
        if (args.dry) {
          warn(`Dry run requested. Skipping pre-deploy hook...`)
        } else {
          info('Running pre-deploy hook...')
          await $$`${ctx.config.hooks.preDeploy}`
        }
      }

      let hasCustomUpgradeInit: boolean = false

      if (args.upgradeInitContract || args.upgradeInitMethod) {
        if (!args.upgradeInitContract) {
          error(`No upgrade initialization contract specified.`)
        }

        if (!args.upgradeInitMethod) {
          error(`No upgrade initialization method specified.`)
        }

        hasCustomUpgradeInit = true
      }

      let proxyInterface: OnChainContract

      let isNewDeployment = false

      // reset deploment records
      clearDeploymentRecorder()

      if (args.new) {
        info('New deployment requested. Skipping any existing deployment...')
        if (args.dry) {
          warn(`Dry run requested. Skipping new deployment...`)
        } else {
          proxyInterface = await deployNewDiamond(ctx, signer, target)
        }
        isNewDeployment = true
      } else {
        info(`Load existing deployment ...`)
        const ret = await loadExistingDeploymentAndLog({
          ctx,
          targetArg,
          target,
          signer,
        })

        if (ret?.proxyInterface) {
          proxyInterface = ret.proxyInterface
        } else {
          info(`   No existing deployment found.`)
          if (args.dry) {
            warn(`Dry run requested. Skipping deployment...`)
          } else {
            proxyInterface = await deployNewDiamond(ctx, signer, target)
          }
          isNewDeployment = true
        }
      }

      const { userFacetArtifacts, coreFacets } = await loadFacetArtifactsAndLog(ctx)

      // reset existing deployment?
      if (!isNewDeployment && args.reset) {
        info('Resetting existing deployment...')
        warn('This will remove all non-core facet selectors from the existing deployment.')
        const cleanCut = await resolveClean({
          coreFacets,
          diamondProxy: proxyInterface!,
          signer
        })
        info(`   ${cleanCut.functionSelectors.length} selectors to remove.`)
        if (args.dry) {
          warn(`Dry run requested. Skipping the reset...`)
        } else {
          await callDiamondCut(proxyInterface!, [cleanCut])
        }
      }
      
      let skipPostDeployHook = false

      // resuming cut from file?
      if (!isNewDeployment && args.resumeCutFromFile) {
        info(`Resuming diamondCut() with info from file: ${args.resumeCutFromFile} ...`)
        const resumed = loadJson(args.resumeCutFromFile) as {
          cuts: FacetCut[],
          initContractAddress: string,
          initData: string
        }
        if (args.dry) {
          warn(`Dry run requested. Skipping the cut...`)
        } else {
          await callDiamondCut(proxyInterface!, resumed.cuts, resumed.initContractAddress, resumed.initData)
        }
      } 
      // otherwise, resolve changes and deploy
      else {
        info('Resolving what changes need to be applied ...')      
        const changes = await resolveUpgrade({
          userFacets: userFacetArtifacts,
          coreFacets,
          diamondProxy: proxyInterface!,
          signer
        })
        const numAdds = changes.namedCuts.filter(c => c.action === FacetCutAction.Add).length
        const numReplacements = changes.namedCuts.filter(c => c.action === FacetCutAction.Replace).length
        const numRemovals = changes.namedCuts.filter(c => c.action === FacetCutAction.Remove).length
        info(`   ${changes.facetsToDeploy.length} facets need to be deployed.`)
        info(`   ${changes.namedCuts.length} facet cuts need to be applied (Add = ${numAdds}, Replace = ${numReplacements}, Remove = ${numRemovals}).`)

        if (changes.namedCuts.length === 0 && !hasCustomUpgradeInit) {
          info('No changes need to be applied.')
        } else {
          const facetContracts: Record<string, OnChainContract> = {}

          if (changes.facetsToDeploy.length) {
            if (args.dry) {
              warn(`Dry run requested. Skipping facet deployment...`)
            } else {
              info('Deploying facets...')
              for (const name of changes.facetsToDeploy) {
                info(`   Deploying ${name} ...`)
                const contract = await deployContract(ctx, target, name, signer)
                facetContracts[name] = contract
                info(`   Deployed ${name} at: ${await contract.address}`)
              }
            }
          } else {
            info('No new facets need to be deployed.')
          }

          let initContractAddress: string = ethers.ZeroAddress
          let initData: string = '0x'

          if (isNewDeployment && ctx.config.diamond.init) {
            const { contract: initContract, function: initFunction } = ctx.config.diamond.init

            if (args.dry) {
              warn(`Dry run requested. Skipping initialization...`)
            } else {
              const { address, data } = await deployAndEncodeInitData(
                ctx,
                target,
                signer,
                initContract,
                initFunction,
                target.config.initArgs,
                "initialization"
              )
              initContractAddress = address
              initData = data
            }
          } else if (hasCustomUpgradeInit) {
            if (args.dry) {
              warn(`Dry run requested. Skipping custom upgrade initialization...`)
            } else {
              const { address, data } = await deployAndEncodeInitData(
                ctx,
                target,
                signer,
                args.upgradeInitContract,
                args.upgradeInitMethod,
                [],
                "custom upgrade initialization"
              )
              initContractAddress = address
              initData = data              
            }
          }
        
          const cuts = getFinalizedFacetCuts(changes.namedCuts, facetContracts)
          if (args.dry) {
            warn(`Dry run requested. Skipping diamondCut() call...`)
          } else if (args.pauseCutToFile) {
            info(`Pausing before diamondCut(), writing cut info to ${args.pauseCutToFile} ...`)
            saveJson(args.pauseCutToFile, {
              cuts,
              initContractAddress,
              initData
            })
            skipPostDeployHook = true
          } else {
            if (t.upgrades?.manualCut) {
              notice('Outputting upgrade tx params so that you can do the upgrade manually...\n\n')
              notice(`================================================================================\n`)
              notice(`Diamond: ${proxyInterface!.address}\n`)
              notice(`Tx data: ${proxyInterface!.contract.interface.encodeFunctionData('diamondCut', [cuts, initContractAddress, initData])}\n`)
              notice(`================================================================================\n\n`)
            } else {
              await callDiamondCut(proxyInterface!, cuts, initContractAddress, initData)
            }
          }
        }
      }

      const deploymentRecords = getDeploymentRecorderData()
      if (deploymentRecords.length) {
        info(`Deployments took place, saving info...`)
        saveDeploymentInfo(ctx.deploymentInfoJsonPath, targetArg, target, getDeploymentRecorderData(), isNewDeployment)
      }

      // run post-deploy hook
      if (ctx.config.hooks.postDeploy && !skipPostDeployHook) {
        if (args.dry) {
          warn(`Dry run requested. Skipping post-deploy hook...`)
        } else {
          info('Running post-deploy hook...')
          await $$`${ctx.config.hooks.postDeploy}`
        }
      }

      logSuccess()
    })


  const callDiamondCut = async (diamondProxy: OnChainContract, cuts: FacetCut[], initContractAddress: string = ZeroAddress, initData: string = '0x') => {
    info('Calling diamondCut() on the proxy...')        
    await execContractMethod(diamondProxy, 'diamondCut', [cuts, initContractAddress, initData])
  }

  
  const deployNewDiamond = async (ctx: Context, signer: Signer, target: Target) => {
    info(`Deploying diamond...`)
    const { create3Salt } = target.config
    let salt32bytes = create3Salt
    if (!salt32bytes) {
      salt32bytes = ethers.keccak256(ethers.hexlify(ethers.randomBytes(32)))
      info(`   CREATE3 salt (randomized): ${salt32bytes}`)
    } else {
      info(`   CREATE3 salt (specified): ${salt32bytes}`)
    }
    const diamond = await deployContract3(ctx, target, 'DiamondProxy', signer, salt32bytes, await signer.getAddress())
    info(`   ...deployed at: ${diamond.address}`)
    return await getContractAt(ctx, 'IDiamondProxy', signer, diamond.address)
  }

  
  const deployAndEncodeInitData = async (
    ctx: Context,
    target: Target,
    signer: Signer,
    contractName: string,
    methodName: string,
    initArgs: any[],
    logPrefix: string
  ): Promise<{ address: string; data: string }> => {
    info(`Deploying ${logPrefix} contract: ${contractName} ...`)
    const contract = await deployContract(ctx, target, contractName, signer)
    const address = contract.address
    info(`   ...deployed at: ${address}`)

    const methodSelector = contract.contract.interface.getFunction(methodName)
    if (!methodSelector) {
      error(`${logPrefix} contract ${contractName} does not have a ${methodName}() function.`)
    }

    info(`Encoding ${logPrefix} call data...`)
    let data: string
    try {
      trace(`   Encoding ${logPrefix} call data: [${initArgs.join(", ")}]`)
      data = contract.contract.interface.encodeFunctionData(methodSelector!, initArgs)
      trace(`   Encoded ${logPrefix} call data: ${data}`)
    } catch (err: any) {
      error(`Error encoding ${logPrefix} call data: ${err.message}\n\nCheck your initArgs.`)
    }

    return { address, data: data! }
  }
