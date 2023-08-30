import get from 'lodash.get'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }

export interface MnemonicWalletConfig {
  words: string | Function,
  index: number,
}

export type WalletConfig = {
  type: 'mnemonic',
  config: MnemonicWalletConfig,
}

export interface NetworkConfig {
  rpcUrl: string | Function,
  wallet: string,
}

export interface GemforgeConfig {
  solc: {
    license: string
    version: string
  },
  commands: {
    build: string,
  },
  paths: {
    src: {
      facets: string[],
    },
    artifacts: string,
    generated: {
      solidity: string,
      support: string,
      deployments: string,
    }
    lib: {
      diamond: string,
    }
  },
  generator: {
    proxyInterface: {
      imports: string[],
    },
  },
  diamond: {
    publicMethods: boolean,
    init: string,
  },
  hooks: {
    preBuild: string,
    postBuild: string,
    preDeploy: string,
    postDeploy: string,
  },
  artifacts: {
    format: 'foundry' | 'hardhat',
  },
  wallets: {
    [name: string]: WalletConfig,
  },
  networks: {
    [name: string]: NetworkConfig,
  }
}

const throwError = (msg: string, key: string, val?: any) => {
  throw new Error(`${msg} for [${key}]${typeof val !== undefined ? `: ${val}` : ''}`)
}

const ensure = (config: GemforgeConfig, key: string, isValid: (v: any) => boolean, msg: string = 'Invalid value') => {
  const val = get(config, key)
  if (!isValid(val)) {
    throwError(msg, key, val)
  }
}

const ensureIsSet = (config: GemforgeConfig, key: string) => {
  const val = get(config, key)
  if (!val) {
    throwError(`Value not found`, key)
  }
}

const ensureIsType = (config: GemforgeConfig, key: string, types: string[]) => {
  const val = get(config, key)
  const type = typeof val
  if (types.indexOf(type) < 0) {
    throwError(`Invalid type: ${type}, must be one of (${types.join(', ')})`, key, val)
  }
}

const ensureArray = (config: GemforgeConfig, key: string, minLen = 0) => {
  const val = get(config, key)
  if (!Array.isArray(val)) {
    throwError(`Invalid array`, key, val)
  } else if (val.length < minLen) {
    throwError(`Invalid array length (must be ${minLen})`, key, val)
  }
}

const ensureBool = (config: GemforgeConfig, key: string) => {
  const val = get(config, key)
  if (typeof val !== 'boolean') {
    throwError(`Invalid boolean value`, key, val)
  }
}

export const sanitizeConfig = (config: GemforgeConfig) => {
  // solc
  ensureIsSet(config, 'solc.version')
  ensure(config, 'solc.license', (v: any) => spdxLicenseIds.indexOf(v) >= 0, 'Invalid SPDX license ID')

  // commands
  ensureIsSet(config, 'commands.build')

  // paths
  ensureIsSet(config, 'paths.artifacts')
  ensureArray(config, 'paths.src.facets', 1)
  ensureIsSet(config, 'paths.generated.solidity')
  ensureIsSet(config, 'paths.generated.support')
  ensure(config, 'paths.generated.deployments', (v: any) => typeof v === 'string' && v.endsWith('.json'), 'Invalid deployments JSON file')
  ensureIsSet(config, 'paths.lib.diamond')

  // generator
  ensureArray(config, 'generator.proxyInterface.imports')

  // diamond
  ensureBool(config, 'diamond.publicMethods')
  ensureIsType(config, 'diamond.init', ['undefined', 'string'])

  // artifacts
  ensure(config, 'artifacts.format', (v: any) => ['foundry', 'hardhat'].indexOf(v) >= 0, 'Invalid artifacts format')
  
  // hooks
  ensureIsType(config, 'hooks.preBuild', ['undefined', 'string'])
  ensureIsType(config, 'hooks.postBuild', ['undefined', 'string'])
  ensureIsType(config, 'hooks.preDeploy', ['undefined', 'string'])
  ensureIsType(config, 'hooks.postDeploy', ['undefined', 'string'])
  
  // wallets
  ensureIsSet(config, 'wallets')
  const walletNames = Object.keys(config.wallets)
  if (!walletNames.length) {
    throwError(`No value found`, 'wallets')
  }
  walletNames.forEach(name => {
    ensure(config, `wallets.${name}.type`, (v: any) => ['mnemonic'].indexOf(v) >= 0, 'Invalid wallet type')

    ensureIsSet(config, `wallets.${name}.config`)

    const type = get(config, `wallets.${name}.type`)
    switch (type) {
      case 'mnemonic': {
        ensureIsType(config, `wallets.${name}.config.words`, ['string', 'function'])
        break
      }
    }
  })

  // networks
  ensureIsSet(config, 'networks')
  const networkNames = Object.keys(config.networks)
  if (!networkNames.length) {
    throwError(`No value found`, 'networks')
  }
  networkNames.forEach(name => {
    ensureIsType(config, `networks.${name}.rpcUrl`, ['string', 'function'])
    ensure(config, `networks.${name}.wallet`, (v: any) => walletNames.indexOf(v) >= 0, 'Invalid wallet')
  })
}

