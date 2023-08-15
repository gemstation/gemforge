import get from 'lodash.get'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }

export interface GemforgeConfig {
  solc: {
    license: string
    version: string
  },
  facets: {
    include: string[],
    publicMethods: boolean,
  }
}

export const sanitizeConfig = (config: GemforgeConfig) => {
  if (!get(config, 'solc.version')) {
    throwMissingError('solc.version')
  }

  const license = get(config, 'solc.license')
  if (!license) {
    throwMissingError('solc.license')
  } else {
    if (spdxLicenseIds.indexOf(license) === -1) {
      throw new Error(`Invalid SPDX license: ${license}`)
    }
  }

  const publicMethods = get(config, 'facets.publicMethods')
  if (publicMethods === undefined || typeof publicMethods !== 'boolean') {
    throw new Error(`Invalid value for facets.publicMethods: ${publicMethods}`)
  } 

  const include = get(config, 'facets.include')
  if (!Array.isArray(include) || include.length === 0) {
    throw new Error(`Invalid value for facets.include: ${include}`)
  }
}

const throwMissingError = (key: string) => {
  throw new Error(`Missing required config key: ${key}`)
}
