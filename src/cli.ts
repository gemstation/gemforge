import { Command } from 'commander'

import { loadJson } from './shared/fs.js'
import { command as init } from './cli/init.js'
import { command as build } from './cli/build.js'

const cli = new Command()

const { version } = loadJson(new URL('../package.json', import.meta.url)) as any

cli
  .version(version)
  .addCommand(init())
  .addCommand(build())

cli.parseAsync(process.argv)

