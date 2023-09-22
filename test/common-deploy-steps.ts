import get from "lodash.get"
import 'mocha'
import { setTimeout } from "node:timers/promises"
import { join } from "node:path"
import { GemforgeConfig, cli, expect, fileExists, loadDiamondContract, loadFile, loadJsonFile, loadWallet, sendTx, updateConfigFile, writeFile } from './utils.js'


export const addDeployTestSteps = ({
  framework, 
  setupFolderCallback
} : {
  framework: 'foundry' | 'hardhat',
  setupFolderCallback: () => string
}) => {
  let cwd: string

  const contractSrcBasePath = (framework === 'hardhat' ? 'contracts' : 'src')

  describe('deploys the project', () => {
    beforeEach(() => {
      cwd = setupFolderCallback()
      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      expect(cli('deploy', 'local', { cwd, verbose: false }).success).to.be.true
    })

    it('and updates the deployment json', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const json = loadJsonFile(filePath)

      const obj = get(json, 'local.contracts', []).find((a: any) => a.name === 'DiamondProxy') as any
      expect(obj).to.have.property('name')
      expect(obj.name).to.equal('DiamondProxy')
      expect(obj).to.have.property('txHash')
      expect(obj).to.have.property('onChain')
      expect(obj.onChain).to.have.property('address')

      const obj2 = get(json, 'local.contracts', []).find((a: any) => a.name === 'ExampleFacet') as any
      expect(obj2).to.have.property('name')
      expect(obj2.name).to.equal('ExampleFacet')
      expect(obj2).to.have.property('txHash')
      expect(obj2).to.have.property('onChain')
      expect(obj2.onChain).to.have.property('address')
    })

    it('and the facets really are deployed', async () => {
      const { contract } = await loadDiamondContract(cwd)
      await sendTx(contract.setInt1(2))
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('2')
    })

    it('and the core facets really are deployed', async () => {
      const { contract, walletAddress } = await loadDiamondContract(cwd)
      expect(contract.owner()).to.eventually.eq(walletAddress)
    })

    it('and can handle additions and replacements in a facet', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const jsonOld = loadJsonFile(filePath)
      const oldFacetAddress = (get(jsonOld, 'local.contracts', []).find((a: any) => a.name === 'ExampleFacet') as any).onChain.address as string

      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          // keep method same
          function getInt1() external view returns (uint) {
            AppStorage storage s = LibAppStorage.diamondStorage();
            return s.data.i1;
          }

          // change method behaviour
          function setInt1(uint i) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i + 1;
          }

          // add new method
          function setInt1New(uint i) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i + 2;
          }
        }
      `)

      // build and re-deploy
      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      expect(cli('deploy', 'local', { cwd, verbose: false }).success).to.be.true

      const { contract } = await loadDiamondContract(cwd)

      await sendTx(contract.setInt1(2))
      let n = await contract.getInt1()
      expect(n.toString()).to.equal('3') // 2 + 1
      await sendTx(contract.setInt1New(2))
      n = await contract.getInt1()
      expect(n.toString()).to.equal('4') // 2 + 2

      const jsonNew = loadJsonFile(filePath)
      const newFacetAddress = (get(jsonNew, 'local.contracts', []).find((a: any) => a.name === 'ExampleFacet') as any).onChain.address as string

      expect(newFacetAddress.toLowerCase()).to.not.equal(oldFacetAddress.toLowerCase())
    })

    it('and can handle removals from the facet', async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          // existing method to be removed
          // function getInt1() external view returns (uint) {
            // AppStorage storage s = LibAppStorage.diamondStorage();
            // return s.data.i1 + 1;
          // }

          function setInt1(uint i) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i;
          }
        }
      `)

      // build and re-deploy
      expect(cli('build', { cwd }).success).to.be.true
      expect(cli('deploy', 'local', { cwd }).success).to.be.true

      const { contract, walletAddress } = await loadDiamondContract(cwd, [
        'function setInt1(uint i) external', // this one should exist
        'function getInt1() external view returns (uint)' // this one shouldn't!
      ])
      
      expect(sendTx(contract.setInt1(2))).to.be.fulfilled
      expect(contract.getInt1()).to.be.rejectedWith('execution reverted')
    })

    it('and can handle movement of functions from one facet to another', async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          function setInt1(uint i) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i;
          }
        }
      `)

      writeFile(join(cwd, `${contractSrcBasePath}/facets/Example2Facet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract Example2Facet {
          function getInt1() external view returns (uint) {
            AppStorage storage s = LibAppStorage.diamondStorage();
            return s.data.i1;
          }
        }
      `)

      // build and re-deploy
      expect(cli('build', { cwd }).success).to.be.true
      expect(cli('deploy', 'local', { cwd }).success).to.be.true
      // console.log(cwd)

      const { contract } = await loadDiamondContract(cwd)
      
      await setTimeout(3000) // to avoid nonce errors
      await sendTx(contract.setInt1(2))
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('2')
    })

    it('and allows for a new deployment', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const jsonOld = loadJsonFile(filePath)

      // redeploy new
      expect(cli('deploy', 'local', '--new', { cwd }).success).to.be.true

      const jsonNew = loadJsonFile(filePath)

      ;['DiamondProxy', 'ExampleFacet'].forEach((name) => {
        const oldAddr = (get(jsonOld, 'local.contracts', []).find((a: any) => a.name === name) as any).onChain.address as string
        const newAddr = (get(jsonNew, 'local.contracts', []).find((a: any) => a.name === name) as any).onChain.address as string
        expect(newAddr.toLowerCase()).to.not.equal(oldAddr.toLowerCase())
      })

      const { contract } = await loadDiamondContract(cwd)
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('0')
    })

    it('and allows for a deployment to be reset', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const jsonOld = loadJsonFile(filePath)

      const { contract } = await loadDiamondContract(cwd)
      await sendTx(contract.setInt1(2))

      // redeploy new
      expect(cli('deploy', 'local', '--reset', { cwd, verbose: false }).success).to.be.true

      const jsonNew = loadJsonFile(filePath)

      ;['ExampleFacet'].forEach((name) => {
        const oldAddr = (get(jsonOld, 'local.contracts', []).find((a: any) => a.name === name) as any).onChain.address as string
        const newAddr = (get(jsonNew, 'local.contracts', []).find((a: any) => a.name === name) as any).onChain.address as string
        expect(newAddr.toLowerCase()).to.not.equal(oldAddr.toLowerCase())
      })

      ;['DiamondProxy'].forEach((name) => {
        const oldAddr = (get(jsonOld, 'local.contracts', []).find((a: any) => a.name === name) as any).onChain.address as string
        const newAddr = (get(jsonNew, 'local.contracts', []).find((a: any) => a.name === name) as any).onChain.address as string
        expect(newAddr.toLowerCase()).to.equal(oldAddr.toLowerCase())
      })

      const n = await contract.getInt1()
      expect(n.toString()).to.equal('2') // still the same as before!
    })

    it('and allows for a dry update, with nothing actually getting deployed', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const jsonOld = loadFile(filePath)

      const { contract } = await loadDiamondContract(cwd)
      await sendTx(contract.setInt1(2))

      const wallet = await loadWallet(join(cwd, 'gemforge.config.cjs'), 'local', 'wallet1')
      const startingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          // existing method to be removed
          // function getInt1() external view returns (uint) {
            // AppStorage storage s = LibAppStorage.diamondStorage();
            // return s.data.i1 + 1;
          // }

          function setInt1(uint i) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i;
          }
        }
      `)
      // re-build
      expect(cli('build', { cwd }).success).to.be.true

      expect(cli('deploy', 'local', '--dry', { cwd, verbose: false }).success).to.be.true

      const endingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(startingBal).to.equal(endingBal)

      const jsonNew = loadFile(filePath)
      expect(jsonNew).to.equal(jsonOld)
    })

    it('and allows for a dry reset, with nothing actually getting deployed', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const jsonOld = loadFile(filePath)

      const { contract } = await loadDiamondContract(cwd)
      await sendTx(contract.setInt1(2))

      const wallet = await loadWallet(join(cwd, 'gemforge.config.cjs'), 'local', 'wallet1')
      const startingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(cli('deploy', 'local', '--reset', '--dry', { cwd, verbose: false }).success).to.be.true

      const endingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(startingBal).to.equal(endingBal)

      const jsonNew = loadFile(filePath)
      expect(jsonNew).to.equal(jsonOld)
    })

    it('and allows for a dry new deployment, with nothing actually getting deployed', async () => {
      const filePath = join(cwd, 'gemforge.deployments.json')
      const jsonOld = loadFile(filePath)

      const { contract } = await loadDiamondContract(cwd)
      await sendTx(contract.setInt1(2))

      const wallet = await loadWallet(join(cwd, 'gemforge.config.cjs'), 'local', 'wallet1')
      const startingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(cli('deploy', 'local', '--new', '--dry', { cwd, verbose: false }).success).to.be.true

      const endingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(startingBal).to.equal(endingBal)

      const jsonNew = loadFile(filePath)
      expect(jsonNew).to.equal(jsonOld)
    })
  })

  describe('can do a dry deploy', () => {
    beforeEach(() => {
      cwd = setupFolderCallback()
    })

    it('and nothing gets deployed', async () => {
      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      
      const wallet = await loadWallet(join(cwd, 'gemforge.config.cjs'), 'local', 'wallet1')
      const startingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(cli('deploy', 'local', '--dry', { cwd, verbose: false }).success).to.be.true

      const endingBal = (await wallet.provider!.getBalance(wallet.address)).toString()

      expect(startingBal).to.equal(endingBal)
      expect(fileExists(join(cwd, 'gemforge.deployments.json'))).to.be.false
    })
  })

  describe('supports custom initialization', () => {
    beforeEach(async () => {
      cwd = setupFolderCallback()
    })

    it('with arguments', async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/shared/Initialization.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract Initialization {
          function init(uint i) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i;
          }
        }
      `)

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.diamond.init = {
          contract: 'Initialization',
          function: 'init',
        }
        cfg.targets.local.initArgs = [123]
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      expect(cli('deploy', 'local', { cwd, verbose: false }).success).to.be.true

      const { contract } = await loadDiamondContract(cwd)
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('123')
    })
  })

  describe('calls a pre-deploy hook first', async () => {
    beforeEach(async () => {
      cwd = setupFolderCallback()

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.hooks.preDeploy = join(cwd, 'predeploy.sh')
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
    })

    it('and fails if the hook fails', async () => {
      writeFile(join(cwd, 'predeploy.sh'), `#!/usr/bin/env node
        throw new Error('test');
      `, { executable: true })

      const ret = cli('deploy', 'local', { cwd })

      expect(ret.success).to.be.false
      expect(ret.output).to.contain('Error: test')
    })

    it('and passes if the hook passes', async () => {
      writeFile(join(cwd, 'predeploy.sh'), `#!/usr/bin/env node
        const fs = require('fs')
        const path = require('path')
        fs.writeFileSync(path.join(__dirname, 'gemforge.deployments.json'), 'test')
      `, { executable: true })

      const ret = cli('deploy', 'local', { cwd })

      expect(ret.success).to.be.true
      expect(loadFile(join(cwd, 'gemforge.deployments.json'))).to.not.equal('test')
    })

    it('and sets env vars for the hook', async () => {
      writeFile(join(cwd, 'predeploy.sh'), `#!/usr/bin/env node
        const fs = require('fs')
        const path = require('path')
        fs.writeFileSync(path.join(__dirname, 'test.data'), process.env.GEMFORGE_DEPLOY_TARGET + '/' + process.env.GEMFORGE_DEPLOY_CHAIN_ID)
      `, { executable: true })

      const ret = cli('deploy', 'local', { cwd })

      expect(ret.success).to.be.true
      expect(loadFile(join(cwd, 'test.data'))).to.equal('local/31337')
    })
  })

  describe('calls a post-deploy hook last', async () => {
    beforeEach(async () => {
      cwd = setupFolderCallback()

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.hooks.postDeploy = join(cwd, 'postdeploy.sh')
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
    })

    it('and fails if the hook fails', async () => {
      writeFile(join(cwd, 'postdeploy.sh'), `#!/usr/bin/env node
        throw new Error('test');
      `, { executable: true })

      const ret = cli('deploy', 'local', { cwd })

      expect(ret.success).to.be.false
      expect(ret.output).to.contain('Error: test')
    })

    it('and passes if the hook passes', async () => {
      writeFile(join(cwd, 'postdeploy.sh'), `#!/usr/bin/env node
        const fs = require('fs')
        const path = require('path')
        fs.writeFileSync(path.join(__dirname, 'gemforge.deployments.json'), 'test')
      `, { executable: true })

      const ret = cli('deploy', 'local', { cwd })

      expect(ret.success).to.be.true
      expect(loadFile(join(cwd, 'gemforge.deployments.json'))).to.equal('test')
    })

    it('and sets env vars for the hook', async () => {
      writeFile(join(cwd, 'postdeploy.sh'), `#!/usr/bin/env node
        const fs = require('fs')
        const path = require('path')
        fs.writeFileSync(path.join(__dirname, 'test.data'), process.env.GEMFORGE_DEPLOY_TARGET + '/' + process.env.GEMFORGE_DEPLOY_CHAIN_ID)
      `, { executable: true })

      const ret = cli('deploy', 'local', { cwd })

      expect(ret.success).to.be.true
      expect(loadFile(join(cwd, 'test.data'))).to.equal('local/31337')
    })
  })
}