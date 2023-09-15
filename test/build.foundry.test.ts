import { expect } from "chai"
import 'mocha'
import path from "node:path"
import { addBuildTestSteps } from "./common-steps.js"
import { cli, createTmpFolderFromFolder, getTestDataFolderPath, loadJsonFile } from './utils.js'

const setupFolder = () => {
  return createTmpFolderFromFolder(getTestDataFolderPath('foundry-project'))
}

describe("Command: build() - Foundry", () => {
  it.only('builds the project', async () => {
    const cwd = setupFolder()
    const ret = cli('build', { cwd, verbose: true })
    expect(ret.success).to.be.true

    const filePath = path.join(cwd, 'out/ExampleFacet.sol/ExampleFacet.json')
    const json = loadJsonFile(filePath)
    expect(json).to.have.property('abi')
  })

  addBuildTestSteps({
    framework: 'foundry',
    setupFolderCallback: setupFolder
  })
})
