import 'mocha'
import { addQueryTestSteps } from './common-query-steps.js'
import { createTmpFolderFromFolder, exec, getTestDataFolderPath } from './utils.js'

const setupFolder = () => {
  const cwd = createTmpFolderFromFolder(getTestDataFolderPath('hardhat-project'))
  exec('npm', ['install hardhat'], { cwd })
  return cwd
}

describe("Command: query() - Hardhat", () => {
  addQueryTestSteps({
    framework: 'hardhat',
    setupFolderCallback: setupFolder
  })
})
