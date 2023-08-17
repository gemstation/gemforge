import { getContext } from '../shared/context.js'
import { fileExists, getFacetsAndFunctions, writeFile, writeTemplate } from '../shared/fs.js'
import path from 'node:path'
import { createCommand, logSuccess } from './common.js'
import { error, info, trace } from '../shared/log.js'

export const command = () =>
  createCommand('build', 'Build a project.')
    .action(async args => {
      const ctx = await getContext(args)

      const { $$ } = ctx

      const generatedSolidityPath = path.resolve(ctx.folder, ctx.config.paths.output.solidity)
      const generatedSupportPath = path.resolve(ctx.folder, ctx.config.paths.output.support)

      info('Checking diamond folder lib path...')
      if (!fileExists(path.join(ctx.folder, ctx.config.paths.diamondLib, 'contracts/Diamond.sol'))) {
        error(`Diamond folder lib path does not contain Diamond contracts: ${ctx.config.paths.diamondLib}`)
      }

      info('Creating folder for solidity output...')
      await $$`mkdir -p ${generatedSolidityPath}`
      writeFile(`${generatedSolidityPath}/.gitignore`, '*.sol')

      info('Generating DiamondProxy.sol...')
      writeTemplate('DiamondProxy.sol', `${generatedSolidityPath}/DiamondProxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.diamondLib,
      })

      const facets = getFacetsAndFunctions(ctx)
      trace(`${facets.length} facet(s) found`)
      facets.forEach(f => {
        trace(`  ${f.contractName} => ${f.functions.length} function(s)`)
      })
      
      info('Generating IDiamondProxy.sol...')
      writeTemplate('IDiamondProxy.sol', `${generatedSolidityPath}/IDiamondProxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.diamondLib,
        __METHODS__: facets
          .reduce((m, f) => m.concat(f.functions), [] as any[])
          .map(f => `${f.signature};`)
          .join('\n')
      })

      info('Creating folder for support output...')
      await $$`mkdir -p ${generatedSupportPath}`
      writeFile(`${generatedSupportPath}/.gitignore`, '*.json')

      info('Generating facets.json...')
      const obj = facets.reduce((m, f) => {
        m[f.contractName] = f.functions.reduce((m, f) => {
          m[f.name] = {
            hash: f.hash,
            signature: f.signature,
          }
          return m
        }, {} as any)
        return m
      }, {} as any)
      writeFile(`${generatedSupportPath}/facets.json`, JSON.stringify(obj, null, 2))

      // run forge build
      info('Running forge build...')
      await $$`forge build`

      logSuccess()
    })

  