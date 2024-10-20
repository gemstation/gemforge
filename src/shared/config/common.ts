import get from 'lodash.get'

type ErrorMsgOptions = { suffix: string }

export const throwError = (msg: string, key: string, val?: any, errorMsgOptions: ErrorMsgOptions = { suffix: '' }) => {
  throw new Error(`${msg}${errorMsgOptions.suffix ? `: ${errorMsgOptions.suffix}` : ''} for [${key}]: ${val}`)
}

export const ensure = (config: object, key: string, isValid: (v: any) => boolean, msg: string = 'Invalid value', errorMsgOptions?: ErrorMsgOptions) => {
  const val = get(config, key)
  if (!isValid(val)) {
    throwError(msg, key, val, errorMsgOptions)
  }
}

export const ensureIsSet = (config: object, key: string, errorMsgOptions?: ErrorMsgOptions) => {
  const val = get(config, key)
  if (!val) {
    throwError(`Value not found`, key, undefined, errorMsgOptions)
  }
}

export const ensureIsType = (config: object, key: string, types: string[], errorMsgOptions?: ErrorMsgOptions) => {
  const val = get(config, key)
  const type = typeof val
  if (types.indexOf(type) < 0) {
    throwError(`Invalid type: ${type}, must be one of (${types.join(', ')})`, key, val, errorMsgOptions)
  }
}

export const ensureArray = (config: object, key: string, minLen = 0, errorMsgOptions?: ErrorMsgOptions) => {
  const val = get(config, key)
  if (!Array.isArray(val)) {
    throwError(`Invalid array`, key, val, errorMsgOptions)
  } else if (val.length < minLen) {
    throwError(`Invalid array length (must be ${minLen})`, key, val, errorMsgOptions)
  }
}

export const ensureBool = (config: object, key: string, errorMsgOptions?: ErrorMsgOptions) => {
  const val = get(config, key)
  if (typeof val !== 'boolean') {
    throwError(`Invalid boolean value`, key, val, errorMsgOptions)
  }
}
