import semver from 'semver'
import get from 'lodash.get'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }
import { loadJson } from '../fs.js'
import { throwError, ensureIsSet, ensure, ensureArray, ensureBool, ensureIsType } from './common.js'
import { GemforgeConfigV1, sanitizeConfigV1 } from './v1.js'
import { warn } from '../log.js'

const { version } = loadJson(new URL('../../../package.json', import.meta.url)) as any

export const gemforgeVersion = version

export interface MnemonicWalletConfig {
  words: string | Function,
  index: number,
}

export interface PrivateKeyWalletConfig {
  key: string | Function
}

export type ValidWalletType = 'mnemonic' | 'private-key'

export interface WalletMnemonicType {
  type: 'mnemonic'
  config: MnemonicWalletConfig
}

export interface WalletPrivateKeyType {
  type: 'private-key'
  config: PrivateKeyWalletConfig
}

export type WalletConfig = WalletMnemonicType | WalletPrivateKeyType

export interface NetworkConfig {
  rpcUrl: string | Function,
}

export interface TargetConfig {
  network: string,
  wallet: string,
  initArgs: any[],
}

export interface GemforgeConfig {
  version: number,
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
    init?: {
      contract: string,
      function: string,
    },
    coreFacets: string[],
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
  },
  targets: {
    [name: string]: TargetConfig,
  }
}

export const sanitizeConfig = (config: GemforgeConfig) => {
  // version
  const ver = get(config, 'version')
  const expectedVer = semver.major(gemforgeVersion)
  if (expectedVer != ver) {
    if (!ver || ver == 1) {
      warn('Old config file found. We recommend upgrading your config file to the latest format to take advantage of new features.')
      const configV1 = config as any as GemforgeConfigV1
      sanitizeConfigV1(configV1)
      config = upgradeFromV1(configV1)
    } else {
      throwError(`Config file version mismatch (expected = ${expectedVer})`, 'version', ver || 'unknown')
    }
  }

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
  if (get(config, 'diamond.init')) {
    ensureIsType(config, 'diamond.init.contract', ['string'])
    ensureIsType(config, 'diamond.init.function', ['string'])
  }
  ensureArray(config, 'diamond.coreFacets')

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
    ensure(config, `wallets.${name}.type`, (v: any) => ['mnemonic', 'private-key'].indexOf(v) >= 0, 'Invalid wallet type')

    ensureIsSet(config, `wallets.${name}.config`)

    const type = get(config, `wallets.${name}.type`) as ValidWalletType
    switch (type) {
      case 'mnemonic': {
        ensureIsType(config, `wallets.${name}.config.words`, ['string', 'function'])
        ensureIsType(config, `wallets.${name}.config.index`, ['number'])
        break
      }
      case 'private-key': {
        ensureIsType(config, `wallets.${name}.config.key`, ['string', 'function'])
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
  })

  // targets
  ensureIsSet(config, 'targets')
  const targetNames = Object.keys(config.targets)
  if (!targetNames.length) {
    throwError(`No value found`, 'targets')
  }
  targetNames.forEach(name => {
    ensureIsType(config, `targets.${name}.network`, ['string'])
    ensure(config, `targets.${name}.network`, (v: any) => networkNames.indexOf(v) >= 0, 'Invalid network')
    ensure(config, `targets.${name}.wallet`, (v: any) => walletNames.indexOf(v) >= 0, 'Invalid wallet')
    ensureArray(config, `targets.${name}.initArgs`)
  })
}


const upgradeFromV1 = (oldConfig: GemforgeConfigV1) => {
  const newConfig: any = {
    ...oldConfig,
    version: 2,
    targets: {}
  }

  if (oldConfig.diamond.init) {
    newConfig.diamond.init = {
      contract: oldConfig.diamond.init,
      function: 'init',
    }
  }

  Object.keys(oldConfig.networks).forEach(name => {
    const network = oldConfig.networks[name]
    newConfig.networks[name] = {
      rpcUrl: network.rpcUrl
    }
    newConfig.targets[name] = {
      network: name,
      wallet: network.wallet,
      initArgs: [],
    }
  })

  return newConfig as GemforgeConfig
}

