import { Command } from 'commander'

import packageJson from '../package.json' assert { "type": "json" }
import { command as init } from './cli/init.js'
import { command as build } from './cli/build.js'

const { version } = packageJson

const cli = new Command()

cli
  .version(version)
  .addCommand(init())
  .addCommand(build())

cli.parseAsync(process.argv)

