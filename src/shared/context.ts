import path from 'node:path'
import { disableLogging, enableVerboseLogging, error, info, trace } from './log.js'
import { GemforgeConfig, sanitizeConfig } from './config.js'

export interface Context {
  config: GemforgeConfig
  folder: string
}

export const getContext = async (args: Record<string, any>): Promise<Context> => {
  let { folder, config } = args

  const context: Partial<Context> = {}

  if (args.verbose) {
    enableVerboseLogging()
  }

  if (args.quiet) {
    disableLogging()
  }

  if (folder && folder != '.') {
    context.folder = path.resolve(process.cwd(), folder)
  } else {
    context.folder = process.cwd()
  }
  trace(`Using folder ${context.folder}`)

  if (config) {
    config = path.resolve(process.cwd(), config)
    try {
      context.config = (await import(config)).default as GemforgeConfig
      sanitizeConfig(context.config)
    } catch (err: any) {
      error(`Failed to load config file ${config}: ${err.message}`)
    }
  }

  return context as Context
}
