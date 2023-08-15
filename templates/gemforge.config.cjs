module.exports = {
  solc: {
    // SPDX License - to be inserted in all generated .sol files
    license: 'MIT',
    // Solidity compiler version - to be inserted in all generated .sol files
    version: '0.8.21',
  },
  facets: {
    // file patterns to include in facet parsing
    include: [
      // include all .sol files in the facets directory ending "Facet"
      'facets/*Facet.sol'
    ],
    // Whether to include public methods when generating facet cut instructions. Default is to only include external methods.
    publicMethods: false,
  }
}
