module.exports = {
  version: 2,
  solc: {
    license: 'MIT',
    version: '0.8.21',
  },
  commands: {
    build: 'npx hardhat compile',
  },
  paths: {
    artifacts: 'artifacts',
    src: {
      facets: ['contracts/facets/*Facet.sol'],
    },
    generated: {
      solidity: 'contracts/generated',
      support: '.gemforge',
      deployments: 'gemforge.deployments.json',
    },
    lib: {
      diamond: 'lib/diamond-2-hardhat',
    },
  },
  artifacts: {
    format: 'hardhat',
  },
  generator: {
    proxyInterface: {
      imports: [],
    },
  },
  diamond: {
    publicMethods: false,
    coreFacets: ['OwnershipFacet', 'DiamondCutFacet', 'DiamondLoupeFacet'],
    protectedMethods: [
      '0x8da5cb5b', // OwnershipFacet.owner()
      '0xf2fde38b', // OwnershipFacet.transferOwnership()
      '0x1f931c1c', // DiamondCutFacet.diamondCut()
      '0x7a0ed627', // DiamondLoupeFacet.facets()
      '0xcdffacc6', // DiamondLoupeFacet.facetAddress()
      '0x52ef6b2c', // DiamondLoupeFacet.facetAddresses()
      '0xadfca15e', // DiamondLoupeFacet.facetFunctionSelectors()
      '0x01ffc9a7', // DiamondLoupeFacet.supportsInterface()
    ],
  },
  hooks: {
    preBuild: '',
    postBuild: '',
    preDeploy: '',
    postDeploy: '',
  },
  wallets: {
    wallet1: {
      type: 'mnemonic',
      config: {
        words: 'test test test test test test test test test test test junk',
        index: 0,
      },
    },
    wallet_key: {
      type: 'private-key',
      config: {
        key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      },
    },
  },
  networks: {
    local: {
      rpcUrl: 'http://localhost:58546',
    },
  },
  targets: {
    local: {
      network: 'local',
      wallet: 'wallet1',
      initArgs: [],
    },
  },
}