import path from "node:path"
import 'mocha'
import { expect } from "chai"
import { assertFileMatchesTestTemplate, cli, loadFile } from './utils.js'

describe("Command: init()", () => {
  it("creates a Foundry config file in the current folder", async () => {
    const ret = cli('init')

    expect(ret.output).to.contain("Wrote config file")

    const cfgFilePath = path.join(ret.cwd, 'gemforge.config.cjs')
    assertFileMatchesTestTemplate(cfgFilePath, 'foundry.gemforge.config.cjs')
  })

  it("can create a Hardhat config file instead", async () => {
    const ret = cli('init', '--hardhat')

    expect(ret.output).to.contain("Wrote config file")

    const cfgFilePath = path.join(ret.cwd, 'gemforge.config.cjs')
    assertFileMatchesTestTemplate(cfgFilePath, 'hardhat.gemforge.config.cjs')
  })

  it("checks to see if file aready exists", async () => {
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
})
