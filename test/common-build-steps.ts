import 'mocha'
import path, { join } from "node:path"
import { GemforgeConfig, assertFileMatchesTemplate, cli, expect, loadFile, loadJsonFile, removeFile, updateConfigFile, writeFile } from './utils.js'
import { Fragment } from 'ethers'

export const addBuildTestSteps = ({
  framework, 
  setupFolderCallback
} : {
  framework: 'foundry' | 'hardhat',
  setupFolderCallback: () => string
}) => {
  let cwd: string

  const contractSrcBasePath = (framework === 'hardhat' ? 'contracts' : 'src')

  beforeEach(() => {
    cwd = setupFolderCallback()
  })

  it('generates JSON with facet info', async () => {
    expect(cli('build', { cwd }).success).to.be.true

    const filePath = path.join(cwd, '.gemforge/facets.json')
    const json = loadJsonFile(filePath)
    expect(json).to.deep.equal({
      "ExampleFacet": {
        "file": `${contractSrcBasePath}/facets/ExampleFacet.sol`,
        "contractName": "ExampleFacet",
        "functions": [
          {
            "name": "getInt1",
            "signature": "function getInt1() external view returns (uint)",
            "signaturePacked": "getInt1()"
          },
          {
            "name": "setInt1",
            "signature": "function setInt1(uint i) external",
            "signaturePacked": "setInt1(uint)"
          }
        ]
      }
    })        
  })

  it("generates proxy contract", async () => {
    expect(cli('build', { cwd }).success).to.be.true

    const filePath = path.join(cwd, `${contractSrcBasePath}/generated/DiamondProxy.sol`)
    assertFileMatchesTemplate(filePath, 'DiamondProxy.sol', {
      __SOLC_SPDX__: 'MIT',
      __SOLC_VERSION__: '0.8.21',
      __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
    })
  })

  it("generates proxy interface", async () => {
    expect(cli('build', { cwd }).success).to.be.true

    const filePath = path.join(cwd, `${contractSrcBasePath}/generated/IDiamondProxy.sol`)
    assertFileMatchesTemplate(filePath, 'IDiamondProxy.sol', {
      __SOLC_SPDX__: 'MIT',
      __SOLC_VERSION__: '0.8.21',
      __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
      __CUSTOM_IMPORTS__: '',
      __METHODS__: `function getInt1() external view returns (uint);
function setInt1(uint i) external;`,
    })
  })

  it("generates ABI json", async () => {
    expect(cli('build', { cwd }).success).to.be.true

    const filePath = path.join(cwd, `${contractSrcBasePath}/generated/abi.json`)

    const json = loadJsonFile(filePath) as any

    expect(json.find((f: any) => f.name === 'getInt1')).to.haveOwnProperty('type')
    expect(json.find((f: any) => f.name === 'setInt1')).to.haveOwnProperty('type')
    expect(json.find((f: any) => f.name === 'transferOwnership')).to.haveOwnProperty('type')
    expect(json.find((f: any) => f.name === 'InitializationFunctionReverted')).to.haveOwnProperty('type')
    expect(json.find((f: any) => f.name === 'OwnershipTransferred')).to.haveOwnProperty('type')
  })
    

  if (framework === 'foundry') {
    it("generates test helper", async () => {
      expect(cli('build', { cwd }).success).to.be.true

      const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')
      assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
        __FACET_IMPORTS__: `import { ExampleFacet } from "../facets/ExampleFacet.sol";`,
        __NUM_FACETS__: '1',
        __CUTS__: `
bytes4[] memory f = new bytes4[](2);
f[0] = IDiamondProxy.getInt1.selector;
f[1] = IDiamondProxy.setInt1.selector;
cut[0] = IDiamondCut.FacetCut({
  facetAddress: address(new ExampleFacet()),
  action: IDiamondCut.FacetCutAction.Add,
  functionSelectors: f
});
`,          
      })
    })  
  }

  describe('with multiple facets and methods with custom structs', () => {
    beforeEach(async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          function getInts() external view returns (uint a, uint b) {
            AppStorage storage s = LibAppStorage.diamondStorage();
            a = s.data.i1;
            b = s.data.i2;
          }

          function getData() external view returns (Data memory) {
            AppStorage storage s = LibAppStorage.diamondStorage();
            return s.data;
          }
        }
      `)

      writeFile(join(cwd, `${contractSrcBasePath}/facets/Example2Facet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract Example2Facet {
          function setData(Data calldata d) external {
            AppStorage storage s = LibAppStorage.diamondStorage();
            s.data.i1 = d.i1;
            s.data.i2 = d.i2;
            s.data.a1 = d.a1;
            s.data.a2 = d.a2;
          }
        }
      `)

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.generator.proxyInterface.imports = [
          `${contractSrcBasePath}/shared/Structs.sol`
        ]
        return cfg
      })
    })

    it('generates JSON with facet info', async () => {
      expect(cli('build', { cwd }).success).to.be.true

      const filePath = path.join(cwd, '.gemforge/facets.json')
      const json = loadJsonFile(filePath)
      expect(json).to.deep.equal({
        "ExampleFacet": {
          "file": `${contractSrcBasePath}/facets/ExampleFacet.sol`,
          "contractName": "ExampleFacet",
          "functions": [
            {
              "name": "getInts",
              "signature": "function getInts() external view returns (uint a, uint b)",
              "signaturePacked": "getInts()"
            },
            {
              "name": "getData",
              "signature": "function getData() external view returns (Data memory)",
              "signaturePacked": "getData()"
            }
          ]
        },
        "Example2Facet": {
          "file": `${contractSrcBasePath}/facets/Example2Facet.sol`,
          "contractName": "Example2Facet",
          "functions": [
            {
              "name": "setData",
              "signature": "function setData(Data calldata d) external",
              "signaturePacked": "setData(Data)"
            }
          ]
        }
      })        
    })

    it("generates proxy interface", async () => {
      expect(cli('build', { cwd }).success).to.be.true

      const filePath = path.join(cwd, `${contractSrcBasePath}/generated/IDiamondProxy.sol`)
      assertFileMatchesTemplate(filePath, 'IDiamondProxy.sol', {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
        __CUSTOM_IMPORTS__: `import "../shared/Structs.sol";\n`,
        __METHODS__: `function setData(Data calldata d) external;
function getInts() external view returns (uint a, uint b);
function getData() external view returns (Data memory);`,
      })
    })

    if (framework === 'foundry') {
      it("generates test helper", async () => {
        expect(cli('build', { cwd }).success).to.be.true

        const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')
        assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
          __SOLC_SPDX__: 'MIT',
          __SOLC_VERSION__: '0.8.21',
          __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
          __FACET_IMPORTS__: `import { Example2Facet } from "../facets/Example2Facet.sol";
import { ExampleFacet } from "../facets/ExampleFacet.sol";`,
          __NUM_FACETS__: '2',
          __CUTS__: `
bytes4[] memory f = new bytes4[](1);
f[0] = IDiamondProxy.setData.selector;
cut[0] = IDiamondCut.FacetCut({
  facetAddress: address(new Example2Facet()),
  action: IDiamondCut.FacetCutAction.Add,
  functionSelectors: f
});

f = new bytes4[](2);
f[0] = IDiamondProxy.getInts.selector;
f[1] = IDiamondProxy.getData.selector;
cut[1] = IDiamondCut.FacetCut({
  facetAddress: address(new ExampleFacet()),
  action: IDiamondCut.FacetCutAction.Add,
  functionSelectors: f
});
`,          
        })
      })    
    }
  })

  if (framework === 'foundry') {
    describe('with a large no. of facets and methods', () => {
      const LARGE_NUM_FACETS = 30
      const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const getFacetName = (i: number) => {
        const firstNum = ~~(Math.floor(i / 10))
        const secondNum = i % 10
        return `Example${ALPHABET[firstNum]}${ALPHABET[secondNum]}Facet`
      }

      beforeEach(async () => {
        removeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`))

        for (let i = 0; i < LARGE_NUM_FACETS; i++) {
          const name = getFacetName(i)
          writeFile(join(cwd, `${contractSrcBasePath}/facets/${name}.sol`), `
            pragma solidity >=0.8.21;
            import "../libs/LibAppStorage.sol";
            contract ${name} {
              function getInts${i}() external view returns (uint a, uint b) {
                AppStorage storage s = LibAppStorage.diamondStorage();
                a = s.data.i1;
                b = s.data.i2;
              }
            }
          `)
        }
      })

      it("generates test helper", async () => {
        expect(cli('build', { cwd }).success).to.be.true

        const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')

        let expectedFacetImports = ''
        let expectedCuts = ''
        for (let i = 0; i < LARGE_NUM_FACETS; i++) {
          const name = getFacetName(i)
          const prefix = i ? `` : 'bytes4[] memory '
          expectedFacetImports += `${i ? "\n" : ''}import { ${name} } from "../facets/${name}.sol";`
          expectedCuts += `
${prefix}f = new bytes4[](1);
f[0] = IDiamondProxy.getInts${i}.selector;
cut[${i}] = IDiamondCut.FacetCut({
  facetAddress: address(new ${name}()),
  action: IDiamondCut.FacetCutAction.Add,
  functionSelectors: f
});
`
        }

        // console.log(expectedFacetImports)

        assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
          __SOLC_SPDX__: 'MIT',
          __SOLC_VERSION__: '0.8.21',
          __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
          __FACET_IMPORTS__: expectedFacetImports,
          __NUM_FACETS__: `${LARGE_NUM_FACETS}`,
          __CUTS__: expectedCuts,
        })
      })    
    })
  }

  it('complains if duplicate function signature found', () => {
    writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
      pragma solidity >=0.8.21;
      import "../libs/LibAppStorage.sol";
      contract ExampleFacet {
        function setData(address a1) external {
        }
        function setData(address a2DifferentName) external {
        }
      }
    `)

    const ret = cli('build', { cwd })
    expect(ret.success).to.be.false
    expect(ret.output).to.contain('Duplicate function found')
  })

  it('complains if duplicate contract name found', () => {
    writeFile(join(cwd, `${contractSrcBasePath}/facets/SecondExampleFacet.sol`), `
      pragma solidity >=0.8.21;
      import "../libs/LibAppStorage.sol";
      contract ExampleFacet {
        function setA1(address a1) external {}
      }
    `)

    const ret = cli('build', { cwd })
    expect(ret.success).to.be.false
    expect(ret.output).to.contain('Duplicate contract name found')
  })

  it('complains if using core facet contract name', () => {
    writeFile(join(cwd, `${contractSrcBasePath}/facets/DiamondCutFacet.sol`), `
      pragma solidity >=0.8.21;
      import "../libs/LibAppStorage.sol";
      contract DiamondCutFacet {
        function setA1(address a1) external {}
      }
    `)

    const ret = cli('build', { cwd })
    expect(ret.success).to.be.false
    expect(ret.output).to.contain('Core facet contract name used')
  })

  describe('calls a pre-build hook first', async () => {
    beforeEach(async () => {
      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.hooks.preBuild = join(cwd, 'prebuild.sh')
        return cfg
      })
    })

    it('and fails if the hook fails', async () => {
      writeFile(join(cwd, 'prebuild.sh'), `#!/usr/bin/env node
        throw new Error('test');
      `, { executable: true })

      const ret = cli('build', { cwd })

      expect(ret.success).to.be.false
      expect(ret.output).to.contain('Error: test')
    })

    it('and passes if the hook passes', async () => {
      writeFile(join(cwd, 'prebuild.sh'), `#!/usr/bin/env node
        const fs = require('fs')
        const path = require('path')
        fs.writeFileSync(path.join(__dirname, '.gemforge/facets.json'), 'test')
      `, { executable: true })

      const ret = cli('build', { cwd })

      expect(ret.success).to.be.true
      expect(loadFile(join(cwd, '.gemforge/facets.json'))).to.not.equal('test')
    })
  })

  describe('calls a post-build hook last', async () => {
    beforeEach(async () => {
      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.hooks.postBuild = join(cwd, 'postbuild.sh')
        return cfg
      })
    })

    it('and fails if the hook fails', async () => {
      writeFile(join(cwd, 'postbuild.sh'), `#!/usr/bin/env node
        throw new Error('test');
      `, { executable: true })

      const ret = cli('build', { cwd })

      expect(ret.success).to.be.false
      expect(ret.output).to.contain('Error: test')
    })

    it('and passes if the hook passes', async () => {
      writeFile(join(cwd, 'postbuild.sh'), `#!/usr/bin/env node
        const fs = require('fs')
        const path = require('path')
        fs.writeFileSync(path.join(__dirname, '.gemforge/facets.json'), 'test')
      `, { executable: true })

      const ret = cli('build', { cwd })

      expect(ret.success).to.be.true
      expect(loadFile(join(cwd, '.gemforge/facets.json'))).to.equal('test')
    })
  })
}


