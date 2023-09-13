import get from 'lodash.get'
import { ensure, ensureArray, ensureBool, ensureIsSet, ensureIsType, throwError } from './common.js'
// @ts-ignore
import spdxLicenseIds from 'spdx-license-ids' assert { type: "json" }

interface MnemonicWalletConfig {
  words: string | Function,
  index: number,
}

type WalletConfig = {
  type: 'mnemonic',
  config: MnemonicWalletConfig,
}

interface NetworkConfig {
  rpcUrl: string | Function,
  wallet: string,
}

export interface GemforgeConfigV1 {
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
}

export const sanitizeConfigV1 = (config: GemforgeConfigV1) => {
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

