import path from 'node:path'
import { disableLogging, enableVerboseLogging, error, info, trace } from './log.js'
import { GemforgeConfig, sanitizeConfig } from './config/index.js'

export interface Context {
  config: GemforgeConfig
  folder: string
  generatedSolidityPath: string
  generatedSupportPath: string
  deploymentInfoJsonPath: string
  artifactsPath: string
  libDiamondPath: string
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
  info(`Working folder: ${context.folder}`)

  if (config) {
    config = path.resolve(process.cwd(), config)
    
    try {
      context.config = (await import(config)).default as GemforgeConfig
      sanitizeConfig(context.config)

      context.generatedSolidityPath = path.resolve(context.folder, context.config.paths.generated.solidity)
      context.generatedSupportPath = path.resolve(context.folder, context.config.paths.generated.support)
      context.deploymentInfoJsonPath = path.resolve(context.folder, context.config.paths.generated.deployments)
      context.libDiamondPath = path.resolve(context.folder, context.config.paths.lib.diamond)
      context.artifactsPath = path.resolve(context.folder, context.config.paths.artifacts)
    } catch (err: any) {
      error(`Failed to load config file ${config}\n\n${err.message}`)
    }
  }

  return context as Context
}
