import { info } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { fileExists, writeTemplate } from '../shared/fs.js'
import { createCommand, logSuccess } from './common.js'

export const command = () =>
  createCommand('init', 'Initialize a new project, generating necessary config files.', { skipConfigOption: true })
    .option('-n, --name <name>', 'name to use for the config file', 'gemforge.config.cjs')
    .option('-o, --overwrite', 'overwrite config file if it already exists')
    .option('--hardhat', 'generate config for a Hardhat project')
    .action(async (args) => {
      const ctx = await getContext(args)

      const configFilePath = `${ctx.folder}/${args.name}`

      if (args.hardhat) {
        info(`Initializing for hardhat ...`)
      } else {
        info(`Initializing for foundry ...`)
      }

      if (fileExists(configFilePath) && !args.overwrite) {
        // if config file already exists
        info(`Config file already exists: ${configFilePath}`)
      } else {
        // write config file
        info(`Writing config file...`)
        writeTemplate('gemforge.config.cjs', configFilePath, {
          __BUILD_COMAND__: args.hardhat ? 'npx hardhat compile' : 'forge build',
          __ARTIFACTS_DIR__: `${args.hardhat ? 'artifacts' : 'out'}`,
          __ARTIFACTS_FORMAT__: args.hardhat ? 'hardhat' : 'foundry',
          __FACETS_SRC__: `${args.hardhat ? 'contracts' : 'src'}/facets/*Facet.sol`,
          __GENERATED_SOL__: `${args.hardhat ? 'contracts' : 'src'}/generated`,
        })
        info(`Wrote config file: ${configFilePath}`)

        info(`Please edit the config file to your liking!`)
      }

      logSuccess()
    })
