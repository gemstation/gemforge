import { getContext } from '../shared/context.js'
import { $, FacetDefinition, ensureGeneratedFolderExists, fileExists, getUserFacetsAndFunctions, saveJson, writeFile, writeTemplate } from '../shared/fs.js'
import path from 'node:path'
import { createCommand, logSuccess } from './common.js'
import { error, info, trace, warn } from '../shared/log.js'
import { generateUnifiedAbi } from '../shared/chain.js'

export const command = () =>
  createCommand('build', 'Build a project.')
    .action(async args => {
      const ctx = await getContext(args)

      const $$ = $({ cwd: ctx.folder, quiet: args.quiet })

      // run prebuild hook
      if (ctx.config.hooks.preBuild) {
        info('Running pre-build hook...')
        await $$`${ctx.config.hooks.preBuild}`
      }

      info('Checking diamond folder lib path...')
      if (!fileExists(path.join(ctx.libDiamondPath, 'contracts/Diamond.sol'))) {
        error(`Diamond folder lib path does not contain Diamond contracts: ${ctx.libDiamondPath}`)
      }

      info('Creating folder for solidity output...')
      await ensureGeneratedFolderExists(ctx.generatedSolidityPath)

      info('Loading user facets...')
      const facets = getUserFacetsAndFunctions(ctx)
      trace(`${facets.length} facets found`)
      facets.forEach(f => {
        trace(`  ${f.contractName} => ${f.functions.length} functions`)
      })

      info('Generating DiamondProxy.sol...')
      writeTemplate('DiamondProxy.sol', `${ctx.generatedSolidityPath}/DiamondProxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.lib.diamond,
      })
      
      info('Generating IDiamondProxy.sol...')
      let customImportsStr = ''
      ctx.config.generator.proxyInterface.imports.forEach(imp => {
        const p = path.resolve(ctx.folder, imp)
        if (fileExists(p)) {
          const impPath = path.relative(ctx.generatedSolidityPath, p)
          customImportsStr += `import "${impPath}";\n`
        } else {
          error(`Import file not found: ${p}`)
        }
      })
      writeTemplate('IDiamondProxy.sol', `${ctx.generatedSolidityPath}/IDiamondProxy.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.lib.diamond,
        __CUSTOM_IMPORTS__: customImportsStr,
        __METHODS__: facets
          .reduce((m, f) => m.concat(f.functions), [] as any[])
          .map(f => `${f.signature};`)
          .join('\n')
      })

      info('Generating LibDiamondHelper.sol ...')
      
      let numMethods = 0
      const importPaths: Record<string, string> = {}
      let facetSelectorsStr = ''
      
      let hasCustomStructs: string[] = []

      facets.forEach((f, facetNum) => {
        numMethods += f.functions.length

        if (!importPaths[f.contractName]) {
          const relativeImportPath = path.relative(ctx.generatedSolidityPath, f.file)
          importPaths[f.contractName] = relativeImportPath.startsWith('.') ? relativeImportPath : `./${relativeImportPath}`
        }

        const varName = `f`

        let arrayDeclaration = `bytes4[] memory ${varName} = new bytes4[](${f.functions.length});`;
        if (facetNum > 0) {
          arrayDeclaration = `${varName} = new bytes4[](${f.functions.length});`;
        }

        facetSelectorsStr += `
${arrayDeclaration}
${f.functions.map((fn, i) => {
  if (fn.userDefinedTypesInParams.length) {
    hasCustomStructs.push(fn.name)
    return `${varName}[${i}] = IDiamondProxy.${fn.name}.selector;`
  } else {
    return `${varName}[${i}] = bytes4(keccak256(bytes('${fn.signaturePacked}')));`
  }
}).join('\n')}
fs[${facetNum}] = FacetSelectors({
  addr: address(new ${f.contractName}()),
  sels: ${varName}
});
`
      })

      if (hasCustomStructs.length) {
        warn(`Custom structs found in facet method params. Polymorphism won't be supported for these methods: ${hasCustomStructs.join(', ')}`)
        warn(`See - https://github.com/gemstation/gemforge/pull/40#issuecomment-2284272273`)
      }
      
      writeTemplate('LibDiamondHelper.sol', `${ctx.generatedSolidityPath}/LibDiamondHelper.sol`, {
        __SOLC_SPDX__: ctx.config.solc.license,
        __SOLC_VERSION__: ctx.config.solc.version,
        __LIB_DIAMOND_PATH__: ctx.config.paths.lib.diamond,
        __FACET_IMPORTS__: Object.keys(importPaths).map(name => `import { ${name} } from "${importPaths[name]}";`).join('\n'),
        __NUM_FACETS__: `${facets.length}`,
        __FACET_SELECTORS__: facetSelectorsStr,
      })

      info('Creating folder for support output...')
      await ensureGeneratedFolderExists(ctx.generatedSupportPath)

      info('Generating facets.json...')
      const obj = facets.reduce((m, f) => {
        m[f.contractName] = f
        return m
      }, {} as Record<string, FacetDefinition>)
      saveJson(`${ctx.generatedSupportPath}/facets.json`, obj)

      // run build
      info('Running build...')
      await $$`${ctx.config.commands.build}`

      // generate abi.json
      info('Generating abi.json...')
      saveJson(`${ctx.generatedSolidityPath}/abi.json`, generateUnifiedAbi(ctx))

      // run post build hook
      if (ctx.config.hooks.postBuild) {
        info('Running post-build hook...')
        await $$`${ctx.config.hooks.postBuild}`
      }

      logSuccess()
    })

  