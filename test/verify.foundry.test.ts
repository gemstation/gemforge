import 'mocha'
import { addVerifyTestSteps } from './common-verify-steps.js'
import { createTmpFolderFromFolder, getTestDataFolderPath } from './utils.js'

const setupFolder = () => {
  return createTmpFolderFromFolder(getTestDataFolderPath('foundry-project'))
}

describe("Command: verify() - Foundry", () => {
  addVerifyTestSteps({
    framework: 'foundry',
    setupFolderCallback: setupFolder
  })
})
