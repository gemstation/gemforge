import get from 'lodash.get'

export const throwError = (msg: string, key: string, val?: any) => {
  throw new Error(`${msg} for [${key}]${typeof val !== undefined ? `: ${val}` : ''}`)
}

export const ensure = (config: object, key: string, isValid: (v: any) => boolean, msg: string = 'Invalid value') => {
  const val = get(config, key)
  if (!isValid(val)) {
    throwError(msg, key, val)
  }
}

export const ensureIsSet = (config: object, key: string) => {
  const val = get(config, key)
  if (!val) {
    throwError(`Value not found`, key)
  }
}

export const ensureIsType = (config: object, key: string, types: string[]) => {
  const val = get(config, key)
  const type = typeof val
  if (types.indexOf(type) < 0) {
    throwError(`Invalid type: ${type}, must be one of (${types.join(', ')})`, key, val)
  }
}

export const ensureArray = (config: object, key: string, minLen = 0) => {
  const val = get(config, key)
  if (!Array.isArray(val)) {
    throwError(`Invalid array`, key, val)
  } else if (val.length < minLen) {
    throwError(`Invalid array length (must be ${minLen})`, key, val)
  }
}

export const ensureBool = (config: object, key: string) => {
  const val = get(config, key)
  if (typeof val !== 'boolean') {
    throwError(`Invalid boolean value`, key, val)
  }
}
