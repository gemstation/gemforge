import 'mocha'
import { join } from "node:path"
import { cli, expect, GemforgeConfig, getTestDataFolderPath, loadFile, loadJsonFile, updateConfigFile, writeFile } from './utils.js'

const loadContractAddresses = (cwd: string) => {
  const deployedContracts = loadJsonFile(join(cwd, 'gemforge.deployments.json')).local.contracts
  return {
    Diamond: deployedContracts.find((c: any) => c.name === 'DiamondProxy').onChain.address,
    ExampleFacet: deployedContracts.find((c: any) => c.name === 'ExampleFacet').onChain.address,
  }
}


export const addQueryTestSteps = ({
  framework, 
  setupFolderCallback
} : {
  framework: 'foundry' | 'hardhat',
  setupFolderCallback: () => string
}) => {
  let cwd: string

  describe('resolves facet data using artifacts', () => {
    before(async () => {
      cwd = setupFolderCallback()
      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      expect(cli('deploy', 'local', { cwd, verbose: false }).success).to.be.true
    })

    describe('and outputs text', () => {
      const assertOutput = (output: string) => {
        const a = loadContractAddresses(cwd)

        expect(output).to.contain(`Diamond (${a.Diamond})`)
        expect(output).to.contain(`Unrecognized facets: 0`)
        expect(output).to.contain(`Unrecognized functions: 0`)
        expect(output).to.contain(`DiamondCutFacet (0x`)
        expect(output).to.contain(`fn: diamondCut((address,uint8,bytes4[])[],address,bytes) (0x1f931c1c)`)
        expect(output).to.contain(`DiamondLoupeFacet (0x`)
        expect(output).to.contain(`fn: facets() (0x7a0ed627)`)
        expect(output).to.contain(`fn: facetFunctionSelectors(address) (0xadfca15e)`)
        expect(output).to.contain(`fn: facetAddresses() (0x52ef6b2c)`)
        expect(output).to.contain(`fn: facetAddress(bytes4) (0xcdffacc6)`)
        expect(output).to.contain(`fn: supportsInterface(bytes4) (0x01ffc9a7)`)
        expect(output).to.contain(`OwnershipFacet (0x`)
        expect(output).to.contain(`fn: owner() (0x8da5cb5b)`)
        expect(output).to.contain(`fn: transferOwnership(address) (0xf2fde38b)`)
        expect(output).to.contain(`ExampleFacet (${a.ExampleFacet})`)
        expect(output).to.contain(`fn: getInt1() (0xe1bb9b63)`)
        expect(output).to.contain(`fn: setInt1(uint256) (0x4d2c097d)`)
      }

      it('to the console', async () => {
        const ret = cli('query', 'local', { cwd })
        expect(ret.success).to.be.true
        assertOutput(ret.output)
      })

      it('to a file', async () => {
        const outFilePath = join(cwd, 'query-output')
        const ret = cli('query', 'local', '--output', outFilePath, { cwd })
        expect(ret.success).to.be.true

        const out = loadFile(outFilePath)
        assertOutput(out)
      })
    })

    describe('and outputs JSON', () => {
      it('to the console', async () => {
        const ret = cli('query', 'local', '--json', { cwd })
        expect(ret.success).to.be.true

        const a = loadContractAddresses(cwd)

        expect(ret.output).to.contain(`"proxyAddress": "${a.Diamond}"`)
        expect(ret.output).to.contain(`"unrecognizedFacets": 0`)
        expect(ret.output).to.contain(`"unrecognizedFunctions": 0`)
        expect(ret.output).to.contain(`"DiamondCutFacet": {`)
        expect(ret.output).to.contain(`"diamondCut(`)
        expect(ret.output).to.contain(`"DiamondLoupeFacet": {`)
        expect(ret.output).to.contain(`"facets(`)
        expect(ret.output).to.contain(`"facetFunctionSelectors(`)
        expect(ret.output).to.contain(`"facetAddresses(`)
        expect(ret.output).to.contain(`"facetAddress(`)
        expect(ret.output).to.contain(`"supportsInterface(`)
        expect(ret.output).to.contain(`"OwnershipFacet": {`)
        expect(ret.output).to.contain(`"owner(`)
        expect(ret.output).to.contain(`"transferOwnership(`)
        expect(ret.output).to.contain(`"ExampleFacet": {`)
        expect(ret.output).to.contain(`"getInt1(`)
        expect(ret.output).to.contain(`"setInt1(`)
      })

      it('to a file', async () => {
        const outFilePath = join(cwd, 'query-output')
        const ret = cli('query', 'local', '--json', '--output', outFilePath, { cwd })
        expect(ret.success).to.be.true

        const a = loadContractAddresses(cwd)
        const out = loadJsonFile(outFilePath)

        expect(out).to.have.property('proxyAddress', a.Diamond)
        expect(out).to.have.property('unrecognizedFacets', 0)
        expect(out).to.have.property('unrecognizedFunctions', 0)
        expect(out).to.have.property('facets')
        expect(out.facets).to.have.property('DiamondCutFacet')
        expect(out.facets.DiamondCutFacet).to.have.property('functions')
        expect(out.facets.DiamondCutFacet.functions.find((f: any) => f.name.includes('diamondCut('))).to.have.property('selector', '0x1f931c1c')
        expect(out.facets).to.have.property('DiamondLoupeFacet')
        expect(out.facets.DiamondLoupeFacet).to.have.property('functions')
        expect(out.facets.DiamondLoupeFacet.functions.find((f: any) => f.name.includes('facets('))).to.have.property('selector', '0x7a0ed627')
        expect(out.facets.DiamondLoupeFacet.functions.find((f: any) => f.name.includes('facetFunctionSelectors('))).to.have.property('selector', '0xadfca15e')
        expect(out.facets.DiamondLoupeFacet.functions.find((f: any) => f.name.includes('facetAddresses('))).to.have.property('selector', '0x52ef6b2c')
        expect(out.facets.DiamondLoupeFacet.functions.find((f: any) => f.name.includes('facetAddress('))).to.have.property('selector', '0xcdffacc6')
        expect(out.facets.DiamondLoupeFacet.functions.find((f: any) => f.name.includes('supportsInterface('))).to.have.property('selector', '0x01ffc9a7')
        expect(out.facets).to.have.property('OwnershipFacet')
        expect(out.facets.OwnershipFacet).to.have.property('functions')
        expect(out.facets.OwnershipFacet.functions.find((f: any) => f.name.includes('owner('))).to.have.property('selector', '0x8da5cb5b')
        expect(out.facets.OwnershipFacet.functions.find((f: any) => f.name.includes('transferOwnership('))).to.have.property('selector', '0xf2fde38b')
        expect(out.facets).to.have.property('ExampleFacet')
        expect(out.facets.ExampleFacet.address).to.equal(a.ExampleFacet)
        expect(out.facets.ExampleFacet).to.have.property('functions')
        expect(out.facets.ExampleFacet.functions.find((f: any) => f.name.includes('getInt1('))).to.have.property('selector', '0xe1bb9b63')
        expect(out.facets.ExampleFacet.functions.find((f: any) => f.name.includes('setInt1('))).to.have.property('selector', '0x4d2c097d')
      })
    })
  })

  describe('and if a facet is unrecognized', () => {
    before(() => {
      cwd = setupFolderCallback()
      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      expect(cli('deploy', 'local', { cwd, verbose: false }).success).to.be.true
      const facetsJson = loadJsonFile(join(cwd, '.gemforge/facets.json'))
      delete facetsJson['ExampleFacet']
      writeFile(join(cwd, '.gemforge/facets.json'), JSON.stringify(facetsJson, null, 2))
    })

    it('outputs text', async () => {
      const outFilePath = join(cwd, 'query-output')
      const ret = cli('query', 'local', '--output', outFilePath, { cwd })
      expect(ret.success).to.be.true

      const out = loadFile(outFilePath)
      const a = loadContractAddresses(cwd)
      expect(out).to.contain(`<unknown> (${a.ExampleFacet})`)
      expect(out).to.contain(`fn: <unknown> (0xe1bb9b63)`)
      expect(out).to.contain(`fn: <unknown> (0x4d2c097d)`)
    })

    it('outputs JSON', async () => {
      const outFilePath = join(cwd, 'query-output')
      const ret = cli('query', 'local', '--json', '--output', outFilePath, { cwd })
      expect(ret.success).to.be.true

      const out = loadJsonFile(outFilePath)
      const a = loadContractAddresses(cwd)
      expect(out).to.have.property('proxyAddress', a.Diamond)
      expect(out).to.have.property('unrecognizedFacets', 1)
      expect(out).to.have.property('unrecognizedFunctions', 2)
      expect(out).to.have.property('facets')
      expect(out.facets).to.have.property(a.ExampleFacet)
      expect(out.facets[a.ExampleFacet].address).to.equal(a.ExampleFacet)
      expect(out.facets[a.ExampleFacet]).to.have.property('unrecognized', true)
      expect(out.facets[a.ExampleFacet]).to.have.property('functions')
      expect(out.facets[a.ExampleFacet].functions.find((f: any) => f.selector === '0xe1bb9b63')).to.have.property('unrecognized', true)
      expect(out.facets[a.ExampleFacet].functions.find((f: any) => f.selector === '0x4d2c097d')).to.have.property('unrecognized', true)
    })
  })

  describe('can handle if supportsInterface() method is missing in live deployment', () => {
    beforeEach(async () => {
      cwd = setupFolderCallback()

      await updateConfigFile(join(cwd, 'gemforge.config.cjs'), (cfg: GemforgeConfig) => {
        cfg.generator.proxy = {
          template: getTestDataFolderPath(`test-templates/DiamondProxy-noSupportsInterface.sol`)
        }
        return cfg
      })

      expect(cli('build', { cwd, verbose: false }).success).to.be.true
      expect(cli('deploy', 'local', { cwd, verbose: false }).success).to.be.true
    })

    it('outputs text', async () => {
      const outFilePath = join(cwd, 'query-output')
      const ret = cli('query', 'local', '--output', outFilePath, { cwd })
      expect(ret.success).to.be.true

      const out = loadFile(outFilePath)

      expect(out).to.contain(`fn: facets() (0x7a0ed627)`)
      expect(out).to.not.contain(`fn: supportsInterface(bytes4) (0x01ffc9a7)`)
    })
  })
}