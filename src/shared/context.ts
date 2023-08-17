import { ExecaReturnBase, execaCommandSync } from 'execa'
import path from 'node:path'
import { error, trace } from './log.js'
import { GemforgeConfig, sanitizeConfig } from './config.js'

export interface Context {
  config: GemforgeConfig
  folder: string
  $$: (strings: TemplateStringsArray, ...values: any[]) => Promise<ExecaReturnBase<string>>
}

export const getContext = async (args: Record<string, any>): Promise<Context> => {
  let { folder, config } = args

  const context: Partial<Context> = {}

  if (folder != '.') {
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

  context.$$ = async (strings: TemplateStringsArray, ...values: any[]) => {
    const cmd = String.raw({ raw: strings }, ...values)
    trace(`> ${cmd}`)
    return execaCommandSync(cmd, {
      stdio: 'inherit',
      cwd: context.folder,
    })
  }

  return context as Context
}
