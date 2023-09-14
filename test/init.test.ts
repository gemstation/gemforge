import path from "node:path"
import 'mocha'
import { expect } from "chai"

import { getCli } from './utils.js'

describe("Command: init()", () => {
  const cli = getCli()

  describe("creates a config file in the current folder", () => {
    it('for Foundry', async () => {
      const ret = cli('init')

      expect(ret.msg).to.contain("Wrote config file")

      const cfgFilePath = path.join(ret.cwd, 'gemforge.config.cjs')
      const cfg = (await import(cfgFilePath)).default
      expect(cfg).to.have.property('version')
      expect(cfg.version).to.equal(2)
    })
  })
})
