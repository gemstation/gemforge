import 'mocha'
import { addDeployTestSteps } from './common-deploy-steps.js'
import { createTmpFolderFromFolder, getTestDataFolderPath } from './utils.js'

const setupFolder = () => {
  return createTmpFolderFromFolder(getTestDataFolderPath('foundry-project'))
}

describe("Command: deploy() - Foundry", () => {
  addDeployTestSteps({
    framework: 'foundry',
    setupFolderCallback: setupFolder
  })
})
