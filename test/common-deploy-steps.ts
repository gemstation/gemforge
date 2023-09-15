import get from "lodash.get"
import 'mocha'
import { join } from "node:path"
import { cli, expect, loadDiamondContract, loadJsonFile, sendTx, writeFile } from './utils.js'


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
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('0')
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
          // existing method to be replaced
          function getInt1() external view returns (uint) {
            AppStorage storage s = LibAppStorage.diamondStorage();
            return s.data.i1 + 1;
          }

          // new method to be added
          function setInt1(uint i1) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i1;
          }
        }
      `)

      // build and re-deploy
      expect(cli('build', { cwd }).success).to.be.true
      expect(cli('deploy', 'local', { cwd }).success).to.be.true

      const { contract } = await loadDiamondContract(cwd)
      await sendTx(contract.setInt1(2))
      
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('3') // 2 + 1

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

          // new method to be added
          function setInt1(uint i1) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i1;
          }
        }
      `)

      // build and re-deploy
      expect(cli('build', { cwd }).success).to.be.true
      expect(cli('deploy', 'local', { cwd }).success).to.be.true

      const { contract, walletAddress } = await loadDiamondContract(cwd, [
        'function owner() external returns (address)', // this one should exist
        'function getInt1() external view returns (uint)' // this one shouldn't!
      ])
      
      expect(contract.owner()).to.eventually.eq(walletAddress)
      expect(contract.getInt1()).to.be.rejectedWith('execution reverted')
    })

    it.skip('and can handle movement of functions from one facet to another', async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          function setInt1(uint i1) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = i1;
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
      expect(cli('deploy', 'local', { cwd, verbose: true }).success).to.be.true
      // console.log(cwd)

      const { contract } = await loadDiamondContract(cwd)
      
      await sendTx(contract.setInt1(2))
      
      const n = await contract.getInt1()
      expect(n.toString()).to.equal('2')
    })
  })
}