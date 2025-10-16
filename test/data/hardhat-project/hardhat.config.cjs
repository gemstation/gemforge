
module.exports = {
  paths: {
    sources: ['contracts', 'lib'],
  },
  solidity: '0.8.21',
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
}