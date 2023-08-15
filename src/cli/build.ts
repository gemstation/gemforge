import { Command } from 'commander'
import { info } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { getFacetsAndFunctions, writeTemplate } from '../shared/fs.js'

export const command = () =>
  new Command('build')
    .description('Build a project.')
    .option('-f, --folder <folder>', 'folder to run the build in', '.')
    .option('-c, --config <config>', 'gemforge config file', 'gemforge.config.cjs')
    .action(async args => {
      const ctx = await getContext(args)

      const generatedFolderPath = `${ctx.folder}/src/generated`
      const { $$ } = ctx

      info('Creating generated folder...')
      await $$`mkdir -p ${generatedFolderPath}`

      info('Generating Proxy.sol...')
      writeTemplate('Proxy.sol', `${generatedFolderPath}/Proxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
      })

      const facets = getFacetsAndFunctions(ctx)
      info('Generating IProxy.sol...')
      writeTemplate('IProxy.sol', `${generatedFolderPath}/IProxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __METHODS__: facets
          .reduce((m, f) => m.concat(f.functions), [] as any[])
          .map(f => `${f.signature};`)
          .join('\n')
      })

      info('Generating LibFacets.sol...')
      writeTemplate('LibFacets.sol', `${generatedFolderPath}/LibFacets.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
      })

      // run forge build
      info('Running forge build...')
      await $$`forge build`
    })

  