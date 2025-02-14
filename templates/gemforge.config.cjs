/**
 * GemForge configuration file.
 * 
 * For detailed instructions please see the documentation at https://gemforge.xyz/configuration/
 */
module.exports = {
  // Configuration file version
  version: 2,
  // Compiler configuration
  solc: {
    // SPDX License - to be inserted in all generated .sol files
    license: 'MIT',
    // Solidity compiler version - to be inserted in all generated .sol files
    version: '0.8.21',
  },
  // commands to execute
  commands: {
    // the build command
    build: '__BUILD_COMAND__',
  },
  paths: {
    // contract built artifacts folder
    artifacts: '__ARTIFACTS_DIR__',
    // source files
    src: {
      // file patterns to include in facet parsing
      facets: [
        // include all .sol files in the facets directory ending "Facet"
        '__FACETS_SRC__',
      ],
    },
    // folders for gemforge-generated files
    generated: {
      // output folder for generated .sol files
      solidity: '__GENERATED_SOL__',
      // output folder for support scripts and files
      support: '.gemforge',
      // deployments JSON file
      deployments: 'gemforge.deployments.json',
    },
    // library source code
    lib: {
      // diamond library
      diamond: 'lib/diamond-2-hardhat',
    },
  },
  // artifacts configuration
  artifacts: {
    // artifact format - "foundry" or "hardhat"
    format: '__ARTIFACTS_FORMAT__',
  },
  // generator options
  generator: {
    // proxy interface options
    proxyInterface: {
      // imports to include in the generated IDiamondProxy interface
      imports: [],
    },
  },
  // diamond configuration
  diamond: {
    // Whether to include public methods when generating the IDiamondProxy interface. Default is to only include external methods.
    publicMethods: false,
    // Names of core facet contracts - these will not be modified/removed once deployed.
    // This default list is based on the diamond-2-hardhat library.
    // NOTE: WE RECOMMEND NOT CHANGING ANY OF THESE EXISTING NAMES UNLESS YOU KNOW WHAT YOU ARE DOING.
    coreFacets: ['OwnershipFacet', 'DiamondCutFacet', 'DiamondLoupeFacet'],
    // Function selectors that should NEVER be removed from the diamond.
    // The default list is all the external methods of the default list of core facets defined above.
    // NOTE: This is an array of function selectors, not method names.
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
  // lifecycle hooks
  hooks: {
    // shell command to execute before build
    preBuild: '',
    // shell command to execute after build
    postBuild: '',
    // shell command to execute before deploy
    preDeploy: '',
    // shell command to execute after deploy
    postDeploy: '',
  },
  // Wallets to use for deployment
  wallets: {
    // Wallet named "wallet1"
    wallet1: {
      // Wallet type - mnemonic
      type: 'mnemonic',
      // Wallet config
      config: {
        // Mnemonic phrase
        words: 'test test test test test test test test test test test junk',
        // 0-based index of the account to use
        index: 0,
      },
    },
    wallet2: {
      // Wallet type - mnemonic
      type: 'mnemonic',
      // Wallet config
      config: {
        // Mnemonic phrase
        words: () => process.env.MNEMONIC,
        // 0-based index of the account to use
        index: 0,
      },
    },
  },
  // Networks/chains
  networks: {
    // Local network
    local: {
      // RPC endpoint URL
      rpcUrl: 'http://localhost:8545',
    },
    // Sepolia test network
    sepolia: {
      // RPC endpoint URL
      rpcUrl: () => process.env.SEPOLIA_RPC_URL,
    },
  },
  // Targets to deploy
  targets: {
    local: {
      // Network to deploy to
      network: 'local',
      // Wallet to use for deployment
      wallet: 'wallet1',
      // Initialization function arguments
      initArgs: [],
    },
    testnet: {
      // Network to deploy to
      network: 'sepolia',
      // Wallet to use for deployment
      wallet: 'wallet2',
      // Initialization function arguments
      initArgs: [],
    },
  },
}
