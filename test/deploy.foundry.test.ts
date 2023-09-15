import 'mocha'
import { setTimeout } from 'node:timers/promises'
import { ExecDaemonResult, execDaemon } from './utils.js'
import { expect } from 'chai'

describe("Command: deploy() - Foundry", () => {
  let testNetwork: ExecDaemonResult

  // before(async () => {
  //   testNetwork = execDaemon('anvil', ['--port', 55845])
  //   await setTimeout(2000)
  //   expect(testNetwork.stdout).to.contain('Listening on')
  // })

  // after(() => {
  //   testNetwork.shutdown()
  // })

  it.only('deploys the project', async () => {
    console.log('TODO')
  })
})
