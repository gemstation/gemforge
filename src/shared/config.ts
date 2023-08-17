import get from 'lodash.get'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }

export interface MnemonicWalletConfig {
  mnemonic: string,
  index: number,
}

export interface GemforgeConfig {
  solc: {
    license: string
    version: string
  },
  paths: {
    facets: string[],
    output: {
      solidity: string,
      support: string,
    }
    diamondLib: string,
  },
  facets: {
    publicMethods: boolean,
  },
  wallets: {
    [name: string]: {
      type: string,
      config: MnemonicWalletConfig,
    }
  },
  networks: {
    [name: string]: {
      rpcUrl: string,
      wallet: string,
    }
  }
}

const throwError = (msg: string, key: string, val?: any) => {
  throw new Error(`${msg} for [${key}]${typeof val !== undefined ? `: ${val}` : ''}`)
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
  ensure(config, 'solc.license', (v: any) => spdxLicenseIds.indexOf(v) >= 0)

  // paths
  ensureArray(config, 'paths.facets')
  ensureExists(config, 'paths.output.solidity')
  ensureExists(config, 'paths.output.support')
  ensureExists(config, 'paths.diamondLib')

  // facets
  ensureBool(config, 'facets.publicMethods')

  // wallets
  ensureExists(config, 'wallets')
  const walletNames = Object.keys(config.wallets)
  if (!walletNames.length) {
    throwError(`No value found`, 'wallets')
  }
  walletNames.forEach(name => {
    ensure(config, `wallets.${name}.type`, (v: any) => ['mnemonic'].indexOf(v) >= 0)

    ensureExists(config, `wallets.${name}.config`)

    const type = get(config, `wallets.${name}.type`)
    switch (type) {
      case 'mnemonic':
        ensureExists(config, `wallets.${name}.config.words`)
        ensure(config, `wallets.${name}.config.index`, (v: any) => typeof v === 'number' && v >= 0)
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
    ensure(config, `networks.${name}.wallet`, (v: any) => walletNames.indexOf(v) >= 0)
  })
}

