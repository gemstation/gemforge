import { Command } from 'commander'
import { info } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { fileExists, writeTemplate } from '../shared/fs.js'

export const command = () =>
  new Command('init')
    .description('Initialize a new project, generating necessary config files.')
    .option('-f, --folder <folder>', 'folder to create the scaffold in', '.')
    .option('-o, --overwrite', 'overwrite config file if it already exists')
    .action(async (args) => {
      const ctx = await getContext(args)

      const configFilePath = `${ctx.folder}/gemforge.config.cjs`

      if (fileExists(configFilePath) && !args.overwrite) {
        // if config file already exists
        info('Config file already exists.')
      } else {
        // write config file
        info('Writing config file...')
        writeTemplate('gemforge.config.cjs', configFilePath)
      }
    })
