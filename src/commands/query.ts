import { ContractArtifact, OnChainContract, getContractAt, getContractValue, loadContractArtifact, readDeploymentInfo, setupTarget, setupWallet } from '../shared/chain.js'
import { getContext } from '../shared/context.js'
import { FacetCutAction, resolveChainData, resolveUpgrade } from '../shared/diamond.js'
import { FacetDefinition, loadJson, writeFile } from '../shared/fs.js'
import { error, info } from '../shared/log.js'
import { createCommand, logSuccess } from './common.js'

export const command = () =>
  createCommand('query', 'Query a deployed Diamond.')
    .argument('target', 'deployment target to query')
    .option('--json', 'output in JSON format instead')
    .option('--output <file>', 'output to file instead of stdout')
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

      let proxyInterface: OnChainContract

      info(`Load existing deployment ...`)

      const existingTargetRecord = readDeploymentInfo(ctx.deploymentInfoJsonPath, targetArg, target)
      const existingProxy = (existingTargetRecord && existingTargetRecord.chainId == target.network.chainId) ? existingTargetRecord.contracts.find(r => r.name === 'DiamondProxy') : undefined
      if (existingProxy) {
        info(`   Existing deployment found at: ${existingProxy.onChain.address}`)
        info(`Checking if existing deployment is still valid...`)
        proxyInterface = await getContractAt(ctx, 'IDiamondProxy', signer, existingProxy.onChain.address)

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
          error(`Existing deployment is not a diamond: ${err.message}\n\nYou may want to do a fresh deployment first.`)
        }
      } else {
        error(`No existing deployment found at target.`)
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

      info('Resolving on-chain selectors ...')
      const diff = await resolveChainData({
        userFacets: userFacetArtifacts,
        coreFacets,
        diamondProxy: proxyInterface!,
        signer
      })

      let outputStr = `Diamond (${diff.proxyAddress})`

      if (!args.json) {
        outputStr += `Unrecognized facets: ${diff.unrecognizedFacets}\nUnrecognized functions: ${diff.unrecognizedFunctions}\n\n`

        Object.keys(diff.facets).forEach(f => {
          const facet = diff.facets[f]
          outputStr += `${facet.unrecognized ? `<unknown>` : f} (${facet.address})\n`
          facet.functions.forEach(fn => {
            outputStr += `  fn: ${fn.name || '<unknown>'} (${fn.selector})\n`
          })
        })
      } else {
        outputStr = JSON.stringify(diff, null, 2)
      }

      if (args.output) {
        info(`Writing output to file: ${args.output}`)
        await writeFile(args.output, outputStr)
      } else {
        console.log(outputStr)
      }

      logSuccess()
    })
