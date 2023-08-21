import { Command } from 'commander'

import { loadJson } from './shared/fs.js'
import { command as init } from './cli/init.js'
import { command as scaffold } from './cli/scaffold.js'
import { command as build } from './cli/build.js'
import { command as deploy } from './cli/deploy.js'

const cli = new Command()

const { version } = loadJson(new URL('../package.json', import.meta.url)) as any

cli
  .version(version)
  .addCommand(init())
  .addCommand(scaffold())
  .addCommand(build())
  .addCommand(deploy())

cli.parseAsync(process.argv)

