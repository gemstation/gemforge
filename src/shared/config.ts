import get from 'lodash.get'

export interface GemforgeConfig {
  solc: {
    version: string
  }
}

export const sanitizeConfig = (config: GemforgeConfig) => {
  if (!get(config, 'solc.version')) {
    throwMissingError('solc.version')
  }
}

const throwMissingError = (key: string) => {
  throw new Error(`Missing required config key: ${key}`)
}
