import { Command } from 'commander'
import { info } from '../shared/log.js'

export interface CreateCommandOptions {
  skipConfigOption?: boolean
}

export const createCommand = (name: string, desc: string, opts?: CreateCommandOptions) => {
  let c = new Command(name)
    .description(desc)
    .option('-v, --verbose', 'verbose logging output')
    .option('-q, --quiet', 'disable logging output')
    .option('-f, --folder <folder>', 'folder to run gemforge in', '.')

  if (!opts?.skipConfigOption) {
    c = c.option('-c, --config <config>', 'gemforge config file to use', 'gemforge.config.cjs')
  }

  return c
}


export const logSuccess = () => {
  info('All done.')
}

