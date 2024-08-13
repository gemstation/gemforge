import 'mocha'
import { addQueryTestSteps } from './common-query-steps.js'
import { createTmpFolderFromFolder, getTestDataFolderPath } from './utils.js'

const setupFolder = () => {
  return createTmpFolderFromFolder(getTestDataFolderPath('foundry-project'))
}

describe("Command: query() - Foundry", () => {
  addQueryTestSteps({
    framework: 'foundry',
    setupFolderCallback: setupFolder
  })
})
