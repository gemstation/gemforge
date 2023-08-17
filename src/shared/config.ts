import get from 'lodash.get'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }

export interface GemforgeConfig {
  solc: {
    license: string
    version: string
  },
  paths: {
    facets: string[],
    generated: string,
    diamondLib: string,
  },
  facets: {
    publicMethods: boolean,
  }
}

const throwError = (msg: string, key: string, val: any) => {
  throw new Error(`${msg} for [${key}]: ${val}`)
}

const ensure = (config: GemforgeConfig, key: string, isValid: (v: any) => boolean) => {
  const val = get(config, key)
  if (!isValid(val)) {
    throwError(`Invalid value`, key, val)
  }
}

const ensureExists = (config: GemforgeConfig, key: string) => {
  const val = get(config, key)
  if (!val) {
    throwError(`Value not found`, key, val)
  }
}

const ensureArray = (config: GemforgeConfig, key: string) => {
  const val = get(config, key)
  if (!Array.isArray(val) || val.length === 0) {
    throwError(`Invalid array`, key, val)
  }
}

const ensureBool = (config: GemforgeConfig, key: string) => {
  const val = get(config, key)
  if (typeof val !== 'boolean') {
    throwError(`Invalid boolean value`, key, val)
  }
}

export const sanitizeConfig = (config: GemforgeConfig) => {
  ensureExists(config, 'solc.version')
  ensure(config, 'solc.license', (v: any) => spdxLicenseIds.indexOf(v) >= 0)
  ensureArray(config, 'paths.facets')
  ensureExists(config, 'paths.generated')
  ensureExists(config, 'paths.diamondLib')
  ensureBool(config, 'facets.publicMethods')
}

