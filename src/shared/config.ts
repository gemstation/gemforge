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
  facets: {
    publicMethods: boolean,
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

const ensureExists = (config: GemforgeConfig, key: string) => {
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
  ensureExists(config, 'solc.version')
  ensure(config, 'solc.license', (v: any) => spdxLicenseIds.indexOf(v) >= 0, 'Invalid SPDX license ID')

  // commands
  ensureExists(config, 'commands.build')

  // paths
  ensureExists(config, 'paths.artifacts')
  ensureArray(config, 'paths.src.facets')
  ensureExists(config, 'paths.generated.solidity')
  ensureExists(config, 'paths.generated.support')
  ensureExists(config, 'paths.lib.diamond')

  // facets
  ensureBool(config, 'facets.publicMethods')

  // wallets
  ensureExists(config, 'wallets')
  const walletNames = Object.keys(config.wallets)
  if (!walletNames.length) {
    throwError(`No value found`, 'wallets')
  }
  walletNames.forEach(name => {
    ensure(config, `wallets.${name}.type`, (v: any) => ['mnemonic'].indexOf(v) >= 0, 'Invalid wallet type')

    ensureExists(config, `wallets.${name}.config`)

    const type = get(config, `wallets.${name}.type`)
    switch (type) {
      case 'mnemonic':
        ensureExists(config, `wallets.${name}.config.words`)
        ensure(config, `wallets.${name}.config.index`, (v: any) => typeof v === 'number' && v >= 0, 'Invalid number')
    }
  })

  // networks
  ensureExists(config, 'networks')
  const networkNames = Object.keys(config.networks)
  if (!networkNames.length) {
    throwError(`No value found`, 'networks')
  }
  networkNames.forEach(name => {
    ensureExists(config, `networks.${name}.rpcUrl`)
    ensure(config, `networks.${name}.wallet`, (v: any) => walletNames.indexOf(v) >= 0, 'Invalid wallet')
  })
}

