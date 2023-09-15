import 'mocha'
import path from "node:path"
import { addBuildTestSteps } from "./common-build-steps.js"
import { cli, createTmpFolderFromFolder, expect, getTestDataFolderPath, loadJsonFile } from './utils.js'

const setupFolder = () => {
  return createTmpFolderFromFolder(getTestDataFolderPath('foundry-project'))
}

describe("Command: build() - Foundry", () => {
  it('builds the project', async () => {
    const cwd = setupFolder()
    const ret = cli('build', { cwd })
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
