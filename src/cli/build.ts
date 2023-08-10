import { Command } from 'commander'

export const command = () =>
  new Command('init')
    .description('Build a project.')
    .option('-f, --folder <folder>', 'folder to run the build in', '.')
    .option('-c, --config <config>', 'gemforge config file', 'gemforge.config.js')
    .action(async (folder: string) => {
      console.log(typeof folder, folder)
      throw new Error('test')
    })
