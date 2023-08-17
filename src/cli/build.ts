import { Command } from 'commander'
import { info, trace } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { getFacetsAndFunctions, writeTemplate } from '../shared/fs.js'
import path from 'node:path'

export const command = () =>
  new Command('build')
    .description('Build a project.')
    .option('-f, --folder <folder>', 'folder to run the build in', '.')
    .option('-c, --config <config>', 'gemforge config file', 'gemforge.config.cjs')
    .action(async args => {
      const ctx = await getContext(args)

      const generatedFolderPath = path.resolve(ctx.folder, ctx.config.paths.generated)
      const { $$ } = ctx

      info('Creating folder for generated output...')
      await $$`mkdir -p ${generatedFolderPath}`

      info('Generating Proxy.sol...')
      writeTemplate('Proxy.sol', `${generatedFolderPath}/Proxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.diamondLib,
      })

      const facets = getFacetsAndFunctions(ctx)
      trace(`${facets.length} facet(s) found`)
      facets.forEach(f => {
        trace(`  ${f.name} => ${f.functions.length} function(s)`)
      })
      info('Generating IProxy.sol...')
      writeTemplate('IProxy.sol', `${generatedFolderPath}/IProxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.diamondLib,
        __METHODS__: facets
          .reduce((m, f) => m.concat(f.functions), [] as any[])
          .map(f => `${f.signature};`)
          .join('\n')
      })

      // run forge build
      info('Running forge build...')
      await $$`forge build`
    })

  