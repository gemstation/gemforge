import { Command } from 'commander'

import { gemforgeVersion } from './shared/config/index.js'
import { command as init } from './cli/init.js'
import { command as scaffold } from './cli/scaffold.js'
import { command as build } from './cli/build.js'
import { command as deploy } from './cli/deploy.js'

const cli = new Command()

cli
  .version(gemforgeVersion)
  .addCommand(init())
  .addCommand(scaffold())
  .addCommand(build())
  .addCommand(deploy())

// in NPM global mode, the first two args are the node binary and the bin .js script path, so let's make sure we grab exactly the args we want
const realStartIndex = process.argv.findLastIndex(arg => arg.endsWith('/gemforge')) - 1

cli.parseAsync(0 <= realStartIndex ? process.argv.slice(realStartIndex) : process.argv)

