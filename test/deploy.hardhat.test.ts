import 'mocha'
import { addDeployTestSteps } from './common-deploy-steps.js'
import { createTmpFolderFromFolder, exec, getTestDataFolderPath } from './utils.js'

const setupFolder = () => {
  const cwd = createTmpFolderFromFolder(getTestDataFolderPath('hardhat-project'))
  exec('npm', ['install hardhat'], { cwd })
  return cwd
}

describe("Command: deploy() - Hardhat", () => {
  addDeployTestSteps({
    framework: 'hardhat',
    setupFolderCallback: setupFolder
  })
})
