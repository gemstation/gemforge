import { $ } from 'execa'
import chalk from 'chalk'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const $$ = $({ stdio: 'inherit' })

export const getContext = (args: Record<string, any>) => {
  const context = {
    folder: args.folder,
  }

  if (context.folder != '.') {
    log(`Using folder ${context.folder}`)
    context.folder = path.resolve(process.cwd(), context.folder)
  } else {
    context.folder = process.cwd()
  }

  return context
} 

export const template = (file: string) => {
  return path.resolve(__dirname, '../templates', file)
}

export const log = (message: string) => console.log(chalk.gray(message))
export const info = (message: string) => console.log(chalk.whiteBright(message))
export const success = (message: string) => console.log(chalk.greenBright(message))
export const error = (message: string) => console.log(chalk.redBright(message))
export const warn = (message: string) => console.log(chalk.yellowBright(message))
