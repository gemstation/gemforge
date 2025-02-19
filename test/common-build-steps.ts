import 'mocha'
import path, { join } from "node:path"
import { GemforgeConfig, assertFileMatchesCustomTemplate, assertFileMatchesTemplate, cli, expect, getTestDataFolderPath, loadFile, loadJsonFile, removeFile, updateConfigFile, writeFile } from './utils.js'

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
            "signature": "function getInt1() external view returns (uint256)",
            "signaturePacked": "getInt1()",
            "userDefinedTypesInParams": []
          },
          {
            "name": "setInt1",
            "signature": "function setInt1(uint256 i) external",
            "signaturePacked": "setInt1(uint256)",
            "userDefinedTypesInParams": []
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
      __METHODS__: `function getInt1() external view returns (uint256);
function setInt1(uint256 i) external;`,
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
    
  describe('and uses canonical types', async () => {
    beforeEach(async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        contract ExampleFacet {
          function testTypes(int a, uint b) external pure returns (int, uint) {
            return (a + 1, b + 1);
          }
        }
      `)
    })

    it("generates proxy interface with canonical types", async () => {
      expect(cli('build', { cwd }).success).to.be.true

      const filePath = path.join(cwd, `${contractSrcBasePath}/generated/IDiamondProxy.sol`)
      assertFileMatchesTemplate(filePath, 'IDiamondProxy.sol', {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
        __CUSTOM_IMPORTS__: '',
        __METHODS__: `function testTypes(int256 a, uint256 b) external pure returns (int256, uint256);`,
      })
    })

    if (framework === 'foundry') {
      it("generates test helper with canonical types", async () => {
        expect(cli('build', { cwd }).success).to.be.true
  
        const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')
        assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
          __SOLC_SPDX__: 'MIT',
          __SOLC_VERSION__: '0.8.21',
          __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
          __FACET_IMPORTS__: `import { ExampleFacet } from "../facets/ExampleFacet.sol";`,
          __NUM_FACETS__: '1',
          __FACET_SELECTORS__: `
bytes4[] memory f = new bytes4[](1);
f[0] = bytes4(keccak256(bytes('testTypes(int256,uint256)')));
fs[0] = FacetSelectors({
  addr: address(new ExampleFacet()),
  sels: f
});
`,
        })
      })
    }
  })


  if (framework === 'foundry') {
    describe('test helper', async () => {
      it("gets generated", async () => {
        expect(cli('build', { cwd }).success).to.be.true

        const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')
        assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
          __SOLC_SPDX__: 'MIT',
          __SOLC_VERSION__: '0.8.21',
          __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
          __FACET_IMPORTS__: `import { ExampleFacet } from "../facets/ExampleFacet.sol";`,
          __NUM_FACETS__: '1',
          __FACET_SELECTORS__: `
bytes4[] memory f = new bytes4[](2);
f[0] = bytes4(keccak256(bytes('getInt1()')));
f[1] = bytes4(keccak256(bytes('setInt1(uint256)')));
fs[0] = FacetSelectors({
  addr: address(new ExampleFacet()),
  sels: f
});
`,
        })
      })  

      describe('with polymorphic methods', async () => {
        beforeEach(async () => {
          await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
            cfg.generator.proxyInterface.imports = [
              `${contractSrcBasePath}/shared/Structs.sol`
            ]
            return cfg
          })
        })

        it("cannot be generated if custom structs are used in two poly methods", async () => {
          writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
            pragma solidity >=0.8.21;
            import "../shared/Structs.sol";
            contract ExampleFacet {
              function poly1(uint256 i) external {}
              function poly1(Data calldata d) external {}
            }
          `)

          const ret = cli('build', { cwd })
          expect(ret.success).to.be.false
          expect(ret.output).to.contain('Custom structs found in facet method params')
          expect(ret.output).to.contain('Member "poly1" not unique')
        })  

        it("cannot be generated if custom structs are used in two poly methods", async () => {
          writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
            pragma solidity >=0.8.21;
            contract ExampleFacet {
              function poly1(uint256 i) external {}
              function poly1(address a) external {}
            }
          `)

          const ret = cli('build', { cwd })
          expect(ret.success).to.be.true
          expect(ret.output).to.not.contain('Custom structs found in facet method params')

          const filePath = path.join(cwd, 'src/generated/LibDiamondHelper.sol')
          assertFileMatchesTemplate(filePath, 'LibDiamondHelper.sol', {
            __SOLC_SPDX__: 'MIT',
            __SOLC_VERSION__: '0.8.21',
            __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
            __FACET_IMPORTS__: `import { ExampleFacet } from "../facets/ExampleFacet.sol";`,
            __NUM_FACETS__: '1',
            __FACET_SELECTORS__: `
bytes4[] memory f = new bytes4[](2);
f[0] = bytes4(keccak256(bytes('poly1(uint256)')));
f[1] = bytes4(keccak256(bytes('poly1(address)')));
fs[0] = FacetSelectors({
  addr: address(new ExampleFacet()),
  sels: f
});
`,
          })
        })  
      })
    })
  }

  describe('with multiple facets and methods with custom structs', () => {
    beforeEach(async () => {
      writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
        pragma solidity >=0.8.21;
        import "../libs/LibAppStorage.sol";
        contract ExampleFacet {
          function getInts() external view returns (uint256 a, uint256 b) {
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
              "signature": "function getInts() external view returns (uint256 a, uint256 b)",
              "signaturePacked": "getInts()",
              "userDefinedTypesInParams": []
            },
            {
              "name": "getData",
              "signature": "function getData() external view returns (Data memory)",
              "signaturePacked": "getData()",
              "userDefinedTypesInParams": []
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
              "signaturePacked": "setData(Data)",
              "userDefinedTypesInParams": ["Data"]
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
function getInts() external view returns (uint256 a, uint256 b);
function getData() external view returns (Data memory);`,
      })
    })

    describe('if public methods are configured to be included', () => {
      beforeEach(async () => {  
        removeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`))

        writeFile(join(cwd, `${contractSrcBasePath}/facets/ExampleFacet.sol`), `
          pragma solidity >=0.8.21;
          import "../libs/LibAppStorage.sol";
          contract ExampleFacet {
            function getInt() external view returns (uint256) {
              return 1;
            }
            function getIntPublic() public view returns (uint256) {
              return 2;
            }
          }
        `)

        await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
          cfg.diamond.publicMethods = true
          return cfg
        })
      })  

      it("generates proxy interface and renames public methods to external", async () => {
        const ret = cli('build', { cwd })
        expect(ret.success).to.be.true

        const filePath = path.join(cwd, `${contractSrcBasePath}/generated/IDiamondProxy.sol`)
        assertFileMatchesTemplate(filePath, 'IDiamondProxy.sol', {
          __SOLC_SPDX__: 'MIT',
          __SOLC_VERSION__: '0.8.21',
          __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
          __CUSTOM_IMPORTS__: `import "../shared/Structs.sol";\n`,
          __METHODS__: `function setData(Data calldata d) external;
function getInt() external view returns (uint256);
function getIntPublic() external view returns (uint256);`,
        })
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
          __FACET_SELECTORS__: `
bytes4[] memory f = new bytes4[](1);
f[0] = IDiamondProxy.setData.selector;
fs[0] = FacetSelectors({
  addr: address(new Example2Facet()),
  sels: f
});

f = new bytes4[](2);
f[0] = bytes4(keccak256(bytes('getInts()')));
f[1] = bytes4(keccak256(bytes('getData()')));
fs[1] = FacetSelectors({
  addr: address(new ExampleFacet()),
  sels: f
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
              function getInts${i}() external view returns (uint256 a, uint256 b) {
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
        let expectedFacetSelectors = ''
        for (let i = 0; i < LARGE_NUM_FACETS; i++) {
          const name = getFacetName(i)
          const prefix = i ? `` : 'bytes4[] memory '
          expectedFacetImports += `${i ? "\n" : ''}import { ${name} } from "../facets/${name}.sol";`
          expectedFacetSelectors += `
${prefix}f = new bytes4[](1);
f[0] = bytes4(keccak256(bytes('getInts${i}()')));
fs[${i}] = FacetSelectors({
  addr: address(new ${name}()),
  sels: f
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
          __FACET_SELECTORS__: expectedFacetSelectors,
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

  it('warns if using core facet contract name', () => {
    writeFile(join(cwd, `${contractSrcBasePath}/facets/DiamondCutFacet.sol`), `
      pragma solidity >=0.8.21;
      import "../libs/LibAppStorage.sol";
      contract DiamondCutFacet {
        function setA1(address a1) external {}
      }
    `)

    const ret = cli('build', { cwd })
    expect(ret.success).to.be.true
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

  describe('supports custom proxy templates', async () => {
    const customTemplatePath = getTestDataFolderPath(`test-templates/DiamondProxy-custom.sol`)

    beforeEach(async () => {
      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.generator.proxy = {
          template: customTemplatePath
        }
        return cfg
      })
    })
  
    it("generates proxy contract", async () => {
      expect(cli('build', { cwd }).success).to.be.true

      const filePath = path.join(cwd, `${contractSrcBasePath}/generated/DiamondProxy.sol`)
      assertFileMatchesCustomTemplate(filePath, customTemplatePath, {
        __SOLC_SPDX__: 'MIT',
        __SOLC_VERSION__: '0.8.21',
        __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
      })
    })
  })
}


