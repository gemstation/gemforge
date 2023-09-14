import path from "node:path"
import 'mocha'
import { expect } from "chai"
import { assertFileMatchesTemplate, cli, createTmpFolder, createTmpFolderFromSrc, loadFile, writeFile } from './utils.js'

describe("Command: build()", () => {
  let cwd: string

  beforeEach(() => {
    cwd = createTmpFolderFromSrc('test-project')
    cli('init', { cwd })
  })

  it("generates DiamondProxy.sol", async () => {
    cli('build', { cwd })

    const filePath = path.join(cwd, 'src/generated/DiamondProxy.sol')
    assertFileMatchesTemplate(filePath, 'DiamondProxy.sol', {
      __SOLC_SPDX__: 'MIT',
      __SOLC_VERSION__: '0.8.21',
      __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
    })
  })

  it("generates IDiamondProxy.sol", async () => {
    cli('build', { cwd })

    const filePath = path.join(cwd, 'src/generated/IDiamondProxy.sol')
    assertFileMatchesTemplate(filePath, 'IDiamondProxy.sol', {
      __SOLC_SPDX__: 'MIT',
      __SOLC_VERSION__: '0.8.21',
      __LIB_DIAMOND_PATH__: 'lib/diamond-2-hardhat',
      __CUSTOM_IMPORTS__: '',
    })
  })
})
