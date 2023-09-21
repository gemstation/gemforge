import semver from 'semver'
import { error, info } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { $, ensureFolderExistsAndIsEmpty, fileExists, writeTemplate } from '../shared/fs.js'
import { createCommand, logSuccess } from './common.js'

const HARDHAT_GIT_REPO = 'https://github.com/gemstation/contracts-hardhat.git'
const FOUNDRY_GIT_REPO = 'https://github.com/gemstation/contracts-foundry.git'

export const command = () =>
  createCommand('scaffold', 'Generate a demo Gemforge project as a starting point.', { skipConfigOption: true })
    .option('--hardhat', 'generate Hardhat scaffolding instead of Foundry (default)')
    .action(async (args) => {
      const ctx = await getContext(args)

      const $$ = $({ cwd: ctx.folder, quiet: args.quiet })

      info('Checking Node.js version...')
      const nodeVersion = (await $({ quiet: true })`node --version`).stdout.trim()
      if (semver.lt(nodeVersion, 'v20.0.0')) {
        error(`Node.js version is too old. Please upgrade to at least v20 to run the scaffolding command.`)
      }

      info('Checking for Python...')
      try {
        await $({ quiet: true })`python --version`
      } catch (err) {
        try {
          await $({ quiet: true })`python3 --version`
        } catch (err2) {
          error(`Python is not installed. Please goto https://www.python.org/downloads/ for instructions.\n${err2}`)
        }
      }

      info('Ensuring folder is empty...')
      await ensureFolderExistsAndIsEmpty(ctx.folder)

      if (args.hardhat) {
        info(`Generating Hardhat scaffolding...`)
        info(`Clone ${HARDHAT_GIT_REPO}...`)
        await $$`git clone --depth 1 ${HARDHAT_GIT_REPO} ${ctx.folder}`
        await $$`git submodule update --init --recursive`
        await $$`npm install`
      } else {
        info('Checking that foundry is installed...')
        try {
          await $({ quiet: true })`foundryup --help`
        } catch (err: any) {
          error(`Foundry is not installed. Please goto https://book.getfoundry.sh/getting-started/installation for instructions.`)
        }

        info(`Generating Foundry scaffolding...`)
        info(`Clone ${FOUNDRY_GIT_REPO}...`)
        await $$`git clone --depth 1 ${FOUNDRY_GIT_REPO} ${ctx.folder}`
        await $$`foundryup`
        await $$`git submodule update --init --recursive`
        await $$`npm install`
      }

      logSuccess()
    })
