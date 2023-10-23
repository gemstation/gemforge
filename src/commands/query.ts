import { setupTarget, setupWallet } from '../shared/chain.js'
import { getContext } from '../shared/context.js'
import { resolveChainData } from '../shared/diamond.js'
import { writeFile } from '../shared/fs.js'
import { error, info } from '../shared/log.js'
import { createCommand, loadExistingDeploymentAndLog, loadFacetArtifactsAndLog, logSuccess } from './common.js'

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

      info(`Load existing deployment ...`)
      const proxyInterface = await loadExistingDeploymentAndLog({ ctx, signer, targetArg, target })
      if (!proxyInterface) {
        error(`No existing deployment found at target.`)
      }

      const { userFacetArtifacts, coreFacets } = await loadFacetArtifactsAndLog(ctx)

      info('Resolving on-chain selectors ...')
      const diff = await resolveChainData({
        userFacets: userFacetArtifacts,
        coreFacets,
        diamondProxy: proxyInterface,
        signer
      })

      let outputStr = `Diamond (${diff.proxyAddress})\n\n`

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
