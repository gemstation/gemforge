import 'mocha'
import { expect } from "chai"

import { getCli } from './utils.js'

const cli = getCli()

describe("Basic CLI output", () => {
  it("--help should show help output", async () => {
    const ret = cli('--help')
    expect(ret.msg).to.contain("Usage: gemforge [options] [command]")
  })
})
