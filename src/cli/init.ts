import { Command } from 'commander'
import { $$, getContext, info, template } from './common.js'

export const command = () =>
  new Command('init')
    .description('Initialize a new project, generating all necessary scaffolding.')
    .option('-f, --folder <folder>', 'folder to create the scaffold in', '.')
    .action(async (args) => {
      const ctx = getContext(args)

      // write config file
      info('Writing config file...')
      await $$`cp ${template('gemforge.config.js')} ${ctx.folder}/gemforge.config.js`
    })
