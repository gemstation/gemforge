import 'mocha'

import { cli, expect } from './utils.js'

describe("Basic CLI output", () => {
  it("--help should show help output", async () => {
    const ret = cli('--help')
    expect(ret.output).to.contain("Usage: gemforge [options] [command]")
  })
})
