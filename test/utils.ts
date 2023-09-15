import { execaCommandSync } from 'execa'
import { expect } from "chai"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { dirname, resolve, join } from "node:path"
import tmp from 'tmp'
import type { GemforgeConfig } from '../src/shared/config/index.js'

export { GemforgeConfig }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CliOptions {
  cwd?: string
  verbose?: boolean
}

// tmp.setGracefulCleanup()

export const cli = (...gemforgeArgs: any[]) => {
  let opts: CliOptions = {}

  if (typeof gemforgeArgs[gemforgeArgs.length - 1] === 'object') {
    opts = gemforgeArgs.pop()
  }
  
  const cwd = opts.cwd || createTmpFolder()

  const args = [
    '--no-warnings',
    resolve(__dirname, "../build/gemforge.js"),
  ].concat(gemforgeArgs)

  const output = spawnSync(process.argv[0], args, { stdio: opts.verbose ? 'inherit' : "pipe", shell: true, cwd })
  
  return { 
    cwd,
    output: output.stdout?.toString(), 
    success: output.status === 0 
  }
}

export const createTmpFolder = () => tmp.dirSync().name

export const createTmpFolderFromSrc = (testTemplateFolderName: string) => {
  const cwd = createTmpFolder()
  const srcPath = resolve(__dirname, `./data/${testTemplateFolderName}`)
  execaCommandSync(`cp -rf ${srcPath} .`, {
    stdio: 'pipe',
    cwd,
  })
  return join(cwd, testTemplateFolderName)
}

export const loadJsonFile = (filePath: string) => {
  const src = loadFile(filePath)
  return JSON.parse(src)
}

export const loadFile = (filePath: string) => {
  return fs.readFileSync(filePath, 'utf8')
}

export const writeFile = (filePath: string, contents: string) => {
  fs.writeFileSync(filePath, contents, 'utf8')
}

export const updateConfigFile = async (cfgFilePath: string, cb: (src: GemforgeConfig) => GemforgeConfig) => {
  const obj = (await import(cfgFilePath)).default as GemforgeConfig
  const final = cb(obj)
  writeFile(cfgFilePath, `module.exports = ${JSON.stringify(final, null, 2)}`)
}

export const assertFileMatchesTemplate = (jsFilePath: string, templateName: string, replacements: Record<string, string>) => {
  const actual = fs.readFileSync(jsFilePath, 'utf8')
  const tmpl = fs.readFileSync(resolve(__dirname, `../templates/${templateName}`), 'utf8')
  // @ts-ignore
  const expected = Object.entries(replacements).reduce((acc, [key, value]) => acc.replaceAll(key, value), tmpl)
  expect(actual).to.deep.equal(expected)
}