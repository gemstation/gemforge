import { Command } from 'commander'

export interface CreateCommandOptions {
  skipConfigOption?: boolean
}

export const createCommand = (name: string, desc: string, opts?: CreateCommandOptions) => {
  let c = new Command(name)
    .description(desc)
    .option('-f, --folder <folder>', 'folder to run the build in', '.')

  if (!opts?.skipConfigOption) {
    c = c.option('-c, --config <config>', 'gemforge config file', 'gemforge.config.cjs')
  }

  return c
}
