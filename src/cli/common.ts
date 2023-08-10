import { $ } from 'execa'
import chalk from 'chalk'
import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

import { GemforgeConfig, sanitizeConfig } from '../shared/config.js'

export const $$ = $({ stdio: 'inherit' })

export const getContext = async (args: Record<string, any>) => {
  const context = {
    config: args.config,
    folder: args.folder,
  }

  if (context.folder != '.') {
    log(`Using folder ${context.folder}`)
    context.folder = path.resolve(process.cwd(), context.folder)
  } else {
    context.folder = process.cwd()
  }

  if (context.config) {
    context.config = path.resolve(process.cwd(), context.config)
    try {
      const config = (await import(context.config)).default as GemforgeConfig
      sanitizeConfig(config)
      context.config = config
    } catch (err: any) {
      error(`Failed to load config file ${context.config}: ${err.message}`)
    }
  }

  return context
} 

export const writeTemplate = (file: string, dst: string, replacements: Record<string, string> = {}) => {
  let str = readFileSync(new URL(`../../templates/${file}`, import.meta.url), 'utf-8')
  Object.keys(replacements).forEach(key => {
    str = str.replaceAll(key, replacements[key])
  })
  writeFileSync(dst, str, 'utf-8')
}

export const log = (message: string) => console.log(chalk.gray(message))
export const info = (message: string) => console.log(chalk.whiteBright(message))
export const success = (message: string) => console.log(chalk.greenBright(message))
export const error = (message: string) => {
  console.log(chalk.redBright(message))
  process.exit(-1)
}
export const warn = (message: string) => console.log(chalk.yellowBright(message))
