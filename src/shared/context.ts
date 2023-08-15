import { $ } from 'execa'
import path from 'node:path'
import { error, trace } from './log.js'
import { GemforgeConfig, sanitizeConfig } from './config.js'

export interface Context {
  config: GemforgeConfig
  folder: string
  $$: typeof $
}

export const getContext = async (args: Record<string, any>): Promise<Context> => {
  let { folder, config } = args

  const context: Partial<Context> = {}

  if (folder != '.') {
    trace(`Using folder ${folder}`)
    context.folder = path.resolve(process.cwd(), folder)
  } else {
    context.folder = process.cwd()
  }

  if (config) {
    config = path.resolve(process.cwd(), config)
    try {
      context.config = (await import(config)).default as GemforgeConfig
      sanitizeConfig(context.config)
    } catch (err: any) {
      error(`Failed to load config file ${context.config}: ${err.message}`)
    }
  }

  context.$$ = $({ stdio: 'inherit', cwd: context.folder })

  return context as Context
}
