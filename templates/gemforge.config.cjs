module.exports = {
  solc: {
    // SPDX License - to be inserted in all generated .sol files
    license: 'MIT',
    // Solidity compiler version - to be inserted in all generated .sol files
    version: '0.8.21',
  },
  paths: {
    // contract built artifacts folder
    artifacts: 'out',
    // source files
    src: {
      // file patterns to include in facet parsing
      facets: [
        // include all .sol files in the facets directory ending "Facet"
        'src/facets/*Facet.sol'
      ],
    },
    // folders for gemforge-generated files
    generated: {
      // output folder for generated .sol files
      solidity: 'src/generated', 
      // output folder for support scripts and files
      support: '.gemforge',
    },
    // library source code
    lib: {
      // diamond library
      diamond: 'lib/diamond-2-hardhat',
    }
  },
  facets: {
    // Whether to include public methods when generating facet cut instructions. Default is to only include external methods.
    publicMethods: false,
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
      }
    },
  },
  // Networks to deploy to
  networks: {
    // Local network
    local: {
      // RPC endpiont URL
      rpcUrl: 'http://localhost:8545',
      // Wallet to use for deployment
      wallet: 'wallet1',
    }
  }
}
