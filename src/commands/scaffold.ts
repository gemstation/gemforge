import semver from 'semver'
import { error, info } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { $, ensureFolderExistsAndIsEmpty, fileExists, writeTemplate } from '../shared/fs.js'
import { createCommand, logSuccess } from './common.js'

const HARDHAT_GIT_REPO = 'https://github.com/gemstation/contracts-hardhat.git'
const FOUNDRY_GIT_REPO = 'https://github.com/gemstation/contracts-foundry.git'

export const command = () =>
  createCommand('scaffold', 'Generate diamond smart contract project scaffolding.', { skipConfigOption: true })
    .option('--hardhat', 'generate Hardhat scaffolding instead of Foundry')
    .action(async (args) => {
      const ctx = await getContext(args)

      const $$ = $({ cwd: ctx.folder, quiet: args.quiet })

      info('Checking Node.js version...')
      const nodeVersion = (await $({ quiet: true })`node --version`).stdout.trim()
      if (semver.lt(nodeVersion, 'v20.0.0')) {
        error(`Node.js version is too old. Please upgrade to at least v20 to run the scaffolding project.`)
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
