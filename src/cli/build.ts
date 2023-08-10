import { Command } from 'commander'
import { $$, getContext, info, writeTemplate } from './common.js'

export const command = () =>
  new Command('build')
    .description('Build a project.')
    .option('-f, --folder <folder>', 'folder to run the build in', '.')
    .option('-c, --config <config>', 'gemforge config file', 'gemforge.config.cjs')
    .action(async args => {
      const ctx = await getContext(args)

      const generatedFolderPath = `${ctx.folder}/src/generated`

      info('Creating generated folder...')
      await $$`mkdir -p ${generatedFolderPath}`

      info('Generating Proxy code...')
      writeTemplate('Proxy.sol', `${generatedFolderPath}/Proxy.sol`, {
        SOLC_SPDX: ctx.config.solc.license,
        SOLC_VERSION: ctx.config.solc.version,
      })
    })