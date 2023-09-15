import 'mocha'
import path from "node:path"
import { addBuildTestSteps } from "./common-build-steps.js"
import { cli, createTmpFolderFromFolder, exec, expect, getTestDataFolderPath, loadJsonFile } from './utils.js'

const setupFolder = () => {
  const cwd = createTmpFolderFromFolder(getTestDataFolderPath('hardhat-project'))
  exec('npm', ['install hardhat'], { cwd })
  return cwd
}

describe("Command: build() - Hardhat", () => {
  it('builds the project', async () => {
    const cwd = setupFolder()
    const ret = cli('build', { cwd })
    expect(ret.success).to.be.true

    const filePath = path.join(cwd, 'artifacts/contracts/facets/ExampleFacet.sol/ExampleFacet.json')
    const json = loadJsonFile(filePath)
    expect(json).to.have.property('abi')
  })

  addBuildTestSteps({
    framework: 'hardhat',
    setupFolderCallback: setupFolder
  })
})
