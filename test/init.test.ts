import path from "node:path"
import 'mocha'
import { assertFileMatchesTemplate, cli, createTmpFolder, expect, loadFile, writeFile } from './utils.js'

const FOUNDRY_CONFIG_REPLACEMENTS = {
  __BUILD_COMAND__: 'forge build',
  __ARTIFACTS_DIR__: 'out',
  __ARTIFACTS_FORMAT__: 'foundry',
  __FACETS_SRC__: 'src/facets/*Facet.sol',
  __GENERATED_SOL__: 'src/generated',
}

const HARDHAT_CONFIG_REPLACEMENTS = {
  __BUILD_COMAND__: 'npx hardhat compile',
  __ARTIFACTS_DIR__: 'artifacts',
  __ARTIFACTS_FORMAT__: 'hardhat',
  __FACETS_SRC__: 'contracts/facets/*Facet.sol',
  __GENERATED_SOL__: 'contracts/generated',
}

describe("Command: init()", () => {
  it("creates a Foundry config file in the current folder", async () => {
    const ret = cli('init')

    expect(ret.output).to.contain("Wrote config file")

    const cfgFilePath = path.join(ret.cwd, 'gemforge.config.cjs')
    assertFileMatchesTemplate(cfgFilePath, 'gemforge.config.cjs', FOUNDRY_CONFIG_REPLACEMENTS)
  })

  it("creates a Foundry config file in the specified folder", async () => {
    const folder = createTmpFolder()
    
    const ret = cli('init', '--folder', folder)

    expect(ret.output).to.contain("Wrote config file")

    const cfgFilePath = path.join(folder, 'gemforge.config.cjs')
    assertFileMatchesTemplate(cfgFilePath, 'gemforge.config.cjs', FOUNDRY_CONFIG_REPLACEMENTS)
  })

  it("can create a Hardhat config file instead", async () => {
    const ret = cli('init', '--hardhat')

    expect(ret.output).to.contain("Wrote config file")

    const cfgFilePath = path.join(ret.cwd, 'gemforge.config.cjs')
    assertFileMatchesTemplate(cfgFilePath, 'gemforge.config.cjs', HARDHAT_CONFIG_REPLACEMENTS)
  })

  it("does not overwrite existing file", async () => {
    const ret1 = cli('init')
    const cfgFilePath = path.join(ret1.cwd, 'gemforge.config.cjs')
    const cfg = loadFile(cfgFilePath)

    const ret2 = cli('init', {
      cwd: ret1.cwd
    })

    expect(ret2.output).to.contain("Config file already exists")

    const cfg2 = loadFile(cfgFilePath)
    expect(cfg).to.deep.equal(cfg2)
  })

  it("can overwrite existing file", async () => {
    const ret1 = cli('init')
    const cfgFilePath = path.join(ret1.cwd, 'gemforge.config.cjs')
    
    writeFile(cfgFilePath, 'foo')

    const ret2 = cli('init', '--overwrite', {
      cwd: ret1.cwd
    })

    expect(ret2.output).to.contain("Writing config file")

    const cfg2 = loadFile(cfgFilePath)
    expect(cfg2).to.not.deep.equal('foo')
  })
})
