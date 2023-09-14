import { expect } from "chai"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { dirname, resolve } from "node:path"
import tmp from 'tmp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CliOptions {
  cwd?: string
}

tmp.setGracefulCleanup()

export const cli = (...gemforgeArgs: any[]) => {
  let opts: CliOptions = {}

  if (typeof gemforgeArgs[gemforgeArgs.length - 1] === 'object') {
    opts = gemforgeArgs.pop()
  }
  
  const cwd = opts.cwd || tmp.dirSync().name

  const args = [
    '--no-warnings',
    resolve(__dirname, "../build/gemforge.js"),
  ].concat(gemforgeArgs)

  const output = spawnSync(process.argv[0], args, { stdio: "pipe", shell: true, cwd })
  
  return { 
    cwd,
    output: output.stdout.toString(), 
    success: output.status === 0 
  }
}

export const loadFile = (filePath: string) => {
  return fs.readFileSync(filePath, 'utf8')
}

export const assertFileMatchesTestTemplate = async (jsFilePath: string, testTemplateName: string) => {
  const actual = fs.readFileSync(jsFilePath, 'utf8')
  const expected = fs.readFileSync(resolve(__dirname, `../test-data/${testTemplateName}`), 'utf8')
  expect(actual).to.deep.equal(expected)
}