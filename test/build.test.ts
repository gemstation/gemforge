import path from "node:path"
import 'mocha'
import { expect } from "chai"
import { assertFileMatchesTemplate, cli, createTmpFolder, createTmpFolderFromSrc, loadFile, loadJsonFile, writeFile } from './utils.js'

describe("Command: build()", () => {
  let cwd: string

  beforeEach(() => {
    cwd = createTmpFolderFromSrc('test-project')
    cli('init', { cwd })
  })

  describe('by default (Foundry)', () => {
    it('builds the project', async () => {
      cli('build', { cwd })

      const filePath = path.join(cwd, 'out/ExampleFacet.sol/ExampleFacet.json')
      const json = loadJsonFile(filePath)
      expect(json).to.have.property('abi')
    })

    it('generates JSON with facet info', async () => {
      cli('build', { cwd })

      const filePath = path.join(cwd, '.gemforge/facets.json')
      const json = loadJsonFile(filePath)
      expect(json).to.deep.equal({
        "ExampleFacet": {
          "file": "src/facets/ExampleFacet.sol",
          "contractName": "ExampleFacet",
          "functions": [
            {
              "name": "getInt1",
              "signature": "function getInt1() external view returns (uint)"
            }
          ]
        }
      })        
    })

    it("generates proxy contract", async () => {
      cli('build', { cwd })

      const filePath = path.join(cwd, 'src/generated/DiamondProxy.sol')
      assertFileMatchesTemplate(filePath, 'DiamondProxy.sol', {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
      })
    })

    it("generates proxy interface", async () => {
      cli('build', { cwd })

      const filePath = path.join(cwd, 'src/generated/IDiamondProxy.sol')
      assertFileMatchesTemplate(filePath, 'IDiamondProxy.sol', {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
        __CUSTOM_IMPORTS__: '',
        __METHODS__: `function getInt1() external view returns (uint);`,
      })
    })

    it("generates test helper", async () => {
      cli('build', { cwd })

      const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')
      assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
        __FACET_IMPORTS__: `import { ExampleFacet } from "../facets/ExampleFacet.sol";`,
        __NUM_FACETS__: '1',
        __CUTS__: `
bytes4[] memory f0 = new bytes4[](1);
f0[0] = IDiamondProxy.getInt1.selector;
cut[0] = IDiamondCut.FacetCut({
  facetAddress: address(new ExampleFacet()),
  action: IDiamondCut.FacetCutAction.Add,
  functionSelectors: f0
});
`,          
      })
    })
  })

  describe('with multiple facets and methods', () => {
    
  })
})
