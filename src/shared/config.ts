import get from 'lodash.get'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }

export interface MnemonicWalletConfig {
  words: string,
  index: number,
}

export type WalletConfig = {
  type: 'mnemonic',
  config: MnemonicWalletConfig,
}

export interface NetworkConfig {
  rpcUrl: string,
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
    }
    lib: {
      diamond: string,
    }
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
  // solc
  ensureIsSet(config, 'solc.version')
  ensure(config, 'solc.license', (v: any) => spdxLicenseIds.indexOf(v) >= 0, 'Invalid SPDX license ID')

  // commands
  ensureIsSet(config, 'commands.build')

  // paths
  ensureIsSet(config, 'paths.artifacts')
  ensureArray(config, 'paths.src.facets')
  ensureIsSet(config, 'paths.generated.solidity')
  ensureIsSet(config, 'paths.generated.support')
  ensureIsSet(config, 'paths.lib.diamond')

  // diamond
  ensureBool(config, 'diamond.publicMethods')
  ensure(config, 'diamond.init', (v: any) => typeof v === 'undefined' || typeof v === 'string', 'Invalid init contract value')

  // artifacts
  ensure(config, 'artifacts.format', (v: any) => ['foundry', 'hardhat'].indexOf(v) >= 0, 'Invalid artifacts format')
  
  // hooks
  ensure(config, 'hooks.preBuild', (v: any) => typeof v === 'undefined' || typeof v === 'string', 'Invalid preBuild hook')
  ensure(config, 'hooks.postBuild', (v: any) => typeof v === 'undefined' || typeof v === 'string', 'Invalid postBuild hook')
  ensure(config, 'hooks.preDeploy', (v: any) => typeof v === 'undefined' || typeof v === 'string', 'Invalid preDeploy hook')
  ensure(config, 'hooks.postDeploy', (v: any) => typeof v === 'undefined' || typeof v === 'string', 'Invalid postDeploy hook')
  
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
      case 'mnemonic':
        ensureIsSet(config, `wallets.${name}.config.words`)
        ensure(config, `wallets.${name}.config.index`, (v: any) => typeof v === 'number' && v >= 0, 'Invalid number')
    }
  })

  // networks
  ensureIsSet(config, 'networks')
  const networkNames = Object.keys(config.networks)
  if (!networkNames.length) {
    throwError(`No value found`, 'networks')
  }
  networkNames.forEach(name => {
    ensureIsSet(config, `networks.${name}.rpcUrl`)
    ensure(config, `networks.${name}.wallet`, (v: any) => walletNames.indexOf(v) >= 0, 'Invalid wallet')
  })
}

