module.exports = {
  solc: {
    // SPDX License - to be inserted in all generated .sol files
    license: 'MIT',
    // Solidity compiler version - to be inserted in all generated .sol files
    version: '0.8.21',
  },
  paths: {
    // file patterns to include in facet parsing
    facets: [
      // include all .sol files in the facets directory ending "Facet"
      'src/facets/*Facet.sol'
    ],
    // output folder for generated files and scripts
    generated: 'src/generated',
    // diamond library source code
    diamondLib: 'lib/diamond-2-hardhat',
  },
  facets: {
    // Whether to include public methods when generating facet cut instructions. Default is to only include external methods.
    publicMethods: false,
  }
}
