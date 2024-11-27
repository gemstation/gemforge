import 'mocha'
import { addVerifyTestSteps } from './common-verify-steps.js'
import { createTmpFolderFromFolder, exec, getTestDataFolderPath } from './utils.js'

const setupFolder = () => {
  const cwd = createTmpFolderFromFolder(getTestDataFolderPath('hardhat-project'))
  exec('npm', ['install hardhat'], { cwd })
  return cwd
}

describe("Command: verify() - Hardhat", () => {
  addVerifyTestSteps({
    framework: 'hardhat',
    setupFolderCallback: setupFolder
  })
})
