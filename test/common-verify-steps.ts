import 'mocha'
import { join } from "node:path"
import { GemforgeConfig, cli, exec, expect, loadDiamondContract, updateConfigFile, writeFile } from './utils.js'

export const addVerifyTestSteps = ({
  framework, 
  setupFolderCallback
} : {
  framework: 'foundry' | 'hardhat',
  setupFolderCallback: () => string
}) => {
  let cwd: string


  describe('contract verification', () => {
    const mockServerPort = 57786

    beforeEach(async () => {
      cwd = setupFolderCallback()
      
      const dummyKey = 'dummy-key'

      // Update gemforge config
      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        if (framework === 'foundry') {
          cfg.networks.local.contractVerification = {
            foundry: {
              apiUrl: `http://localhost:${mockServerPort}/api`,
              apiKey: dummyKey
            }
          }
        } else {
          cfg.networks.local.contractVerification = {
            hardhat: {
              networkId: 'local'
            }
          }
        }
        return cfg
      })

      // If hardhat, update hardhat config
      if (framework === 'hardhat') {
        await writeFile(join(cwd, 'hardhat.config.js'), `
module.exports = {
  solidity: '0.8.21',
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  etherscan: {
    apiKey: {
      local: '${dummyKey}'
    },
    customChains: [
      {
        network: "local",
        chainId: 31337,
        urls: {
          apiURL: 'http://localhost:${mockServerPort}/api',
          browserURL: 'http://localhost:${mockServerPort}'
        }
      }
    ]
  }
}
        `)
      }
    })

    it('tries to verify the contracts', async () => {
      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      const ret = cli('deploy', 'local', { cwd, verbose: false })
      expect(ret.success).to.be.true

      // parse string: Will be deployed at: 0xfb57DF79e705FFfA56105337e366C2Ba7046149c
      const diamondAddress = ret.output.split('Will be deployed at: ')[1].split('\n')[0]

      // load contract
      const { contract } = await loadDiamondContract(cwd, undefined, diamondAddress)
      const owner = await contract.owner()

      let checkFor = 'INVALID_STRING'

      if (framework === 'hardhat') {
        checkFor = `npx hardhat verify --network local --contract contracts/generated/DiamondProxy.sol:DiamondProxy ${diamondAddress} ${owner}`
      } else {
        const argsStr = (exec(`cast abi-encode "constructor(address)" ${owner}`).stdout).toString().trim()
        checkFor = `forge verify-contract ${diamondAddress} contracts/generated/DiamondProxy.sol:DiamondProxy --constructor-args ${argsStr} --verifier-url http://localhost:${mockServerPort}/api --verifier-api-key dummy-key --watch`
      }

      const ret2 = cli('verify', 'local', { cwd, verbose: false })
      expect(ret2.success).to.be.false // haven't been able to get a mock verification server to work yet, so for now we do this
      
      // check for call
      expect(ret2.output).to.contain(checkFor)
    })

    it('verifies with custom verifier parameter', async () => {
      if (framework !== 'foundry') {
        return
      }

      const dummyKey = 'dummy-key'

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.networks.local.contractVerification = {
          foundry: {
            apiUrl: `http://localhost:${mockServerPort}/api`,
            apiKey: dummyKey,
            verifier: 'blockscout'
          }
        }
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      const ret = cli('deploy', 'local', { cwd, verbose: false })
      expect(ret.success).to.be.true

      const diamondAddress = ret.output.split('Will be deployed at: ')[1].split('\n')[0]
      const { contract } = await loadDiamondContract(cwd, undefined, diamondAddress)
      const owner = await contract.owner()

      const argsStr = (exec(`cast abi-encode "constructor(address)" ${owner}`).stdout).toString().trim()
      const checkFor = `forge verify-contract ${diamondAddress} contracts/generated/DiamondProxy.sol:DiamondProxy --constructor-args ${argsStr} --verifier-url http://localhost:${mockServerPort}/api --verifier-api-key dummy-key --verifier blockscout --watch`

      const ret2 = cli('verify', 'local', { cwd, verbose: false })
      expect(ret2.success).to.be.false
      expect(ret2.output).to.contain(checkFor)
    })

    it('verifies with custom chainId parameter', async () => {
      if (framework !== 'foundry') {
        return
      }

      const dummyKey = 'dummy-key'

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.networks.local.contractVerification = {
          foundry: {
            apiUrl: `http://localhost:${mockServerPort}/api`,
            apiKey: dummyKey,
            chainId: 31337
          }
        }
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      const ret = cli('deploy', 'local', { cwd, verbose: false })
      expect(ret.success).to.be.true

      const diamondAddress = ret.output.split('Will be deployed at: ')[1].split('\n')[0]
      const { contract } = await loadDiamondContract(cwd, undefined, diamondAddress)
      const owner = await contract.owner()

      const argsStr = (exec(`cast abi-encode "constructor(address)" ${owner}`).stdout).toString().trim()
      const checkFor = `forge verify-contract ${diamondAddress} contracts/generated/DiamondProxy.sol:DiamondProxy --constructor-args ${argsStr} --verifier-url http://localhost:${mockServerPort}/api --verifier-api-key dummy-key --chain 31337 --watch`

      const ret2 = cli('verify', 'local', { cwd, verbose: false })
      expect(ret2.success).to.be.false
      expect(ret2.output).to.contain(checkFor)
    })

    it('verifies with both verifier and chainId parameters', async () => {
      if (framework !== 'foundry') {
        return
      }

      const dummyKey = 'dummy-key'

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.networks.local.contractVerification = {
          foundry: {
            apiUrl: `http://localhost:${mockServerPort}/api`,
            apiKey: dummyKey,
            verifier: 'blockscout',
            chainId: 31337
          }
        }
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      const ret = cli('deploy', 'local', { cwd, verbose: false })
      expect(ret.success).to.be.true

      const diamondAddress = ret.output.split('Will be deployed at: ')[1].split('\n')[0]
      const { contract } = await loadDiamondContract(cwd, undefined, diamondAddress)
      const owner = await contract.owner()

      const argsStr = (exec(`cast abi-encode "constructor(address)" ${owner}`).stdout).toString().trim()
      const checkFor = `forge verify-contract ${diamondAddress} contracts/generated/DiamondProxy.sol:DiamondProxy --constructor-args ${argsStr} --verifier-url http://localhost:${mockServerPort}/api --verifier-api-key dummy-key --verifier blockscout --chain 31337 --watch`

      const ret2 = cli('verify', 'local', { cwd, verbose: false })
      expect(ret2.success).to.be.false
      expect(ret2.output).to.contain(checkFor)
    })

    it('verifies without apiKey (optional apiKey)', async () => {
      if (framework !== 'foundry') {
        return
      }

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.networks.local.contractVerification = {
          foundry: {
            apiUrl: `http://localhost:${mockServerPort}/api`
          }
        }
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      const ret = cli('deploy', 'local', { cwd, verbose: false })
      expect(ret.success).to.be.true

      const diamondAddress = ret.output.split('Will be deployed at: ')[1].split('\n')[0]
      const { contract } = await loadDiamondContract(cwd, undefined, diamondAddress)
      const owner = await contract.owner()

      const argsStr = (exec(`cast abi-encode "constructor(address)" ${owner}`).stdout).toString().trim()
      const checkFor = `forge verify-contract ${diamondAddress} contracts/generated/DiamondProxy.sol:DiamondProxy --constructor-args ${argsStr} --verifier-url http://localhost:${mockServerPort}/api  --watch`

      const ret2 = cli('verify', 'local', { cwd, verbose: false })
      expect(ret2.success).to.be.false
      expect(ret2.output).to.contain(checkFor)
      expect(ret2.output).to.not.contain('--verifier-api-key')
    })

    it('verifies with verifier and chainId but without apiKey', async () => {
      if (framework !== 'foundry') {
        return
      }

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.networks.local.contractVerification = {
          foundry: {
            apiUrl: `http://localhost:${mockServerPort}/api`,
            verifier: 'blockscout',
            chainId: 31337
          }
        }
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      const ret = cli('deploy', 'local', { cwd, verbose: false })
      expect(ret.success).to.be.true

      const diamondAddress = ret.output.split('Will be deployed at: ')[1].split('\n')[0]
      const { contract } = await loadDiamondContract(cwd, undefined, diamondAddress)
      const owner = await contract.owner()

      const argsStr = (exec(`cast abi-encode "constructor(address)" ${owner}`).stdout).toString().trim()
      const checkFor = `forge verify-contract ${diamondAddress} contracts/generated/DiamondProxy.sol:DiamondProxy --constructor-args ${argsStr} --verifier-url http://localhost:${mockServerPort}/api  --verifier blockscout --chain 31337 --watch`

      const ret2 = cli('verify', 'local', { cwd, verbose: false })
      expect(ret2.success).to.be.false
      expect(ret2.output).to.contain(checkFor)
      expect(ret2.output).to.not.contain('--verifier-api-key')
    })
  })
}