import { expect } from "chai"
import { spawn, spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { dirname, resolve, join, basename } from "node:path"
import tmp from 'tmp'
import type { GemforgeConfig } from '../src/shared/config/index.js'

export { GemforgeConfig }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

tmp.setGracefulCleanup()

interface ExecOptions {
  cwd?: string
  verbose?: boolean
}

export const exec = (cmd: string, args: any[], opts: ExecOptions = {}) => {
  return spawnSync(cmd, args, { stdio: opts.verbose ? 'inherit' : "pipe", shell: true, cwd: opts.cwd || process.cwd() })
}

export interface ExecDaemonResult {
  pid: number
  stdout: string
  stderr: string
  shutdown: () => void
}

export const execDaemon = (cmd: string, args: any[], opts: ExecOptions = {}) => {
  const cp = spawn(cmd, args, { stdio: opts.verbose ? 'inherit' : "pipe", shell: true, cwd: opts.cwd || process.cwd() })

  const ret = {
    pid: cp.pid,
    stdout: '',
    stderr: '',
    shutdown: () => {
      cp.kill()
    }
  }  as ExecDaemonResult

  cp.stderr!.on('data', (data) => {
    ret.stderr += data
  })

  cp.stdout!.on('data', (data) => {
    ret.stdout += data
  })

  cp.on('close', (code) => {
    if (code !== 0) {
      console.error(`${cmd} process exited with code ${code}`);
      process.exit(-1)
    }
  })

  return ret
}

export const cli = (...gemforgeArgs: any[]) => {
  let opts: ExecOptions = {}

  if (typeof gemforgeArgs[gemforgeArgs.length - 1] === 'object') {
    opts = gemforgeArgs.pop()
  }
  

  opts = {
    verbose: !!opts.verbose,
    cwd: opts.cwd || createTmpFolder(),
  }

  const args = [
    '--no-warnings',
    resolve(__dirname, "../build/gemforge.js"),
  ].concat(gemforgeArgs)

  const output = exec(process.argv[0], args, opts)
  
  return { 
    cwd: opts.cwd!,
    output: output.stdout?.toString() + output.stderr?.toString(), 
    success: output.status === 0 
  }
}

export const createTmpFolder = () => tmp.dirSync().name

export const createTmpFolderFromFolder = (srcFolderPath: string) => {
  const cwd = createTmpFolder()
  exec('cp', ['-rf', srcFolderPath, '.'], { cwd })
  return join(cwd, basename(srcFolderPath))
}

export const getTestDataFolderPath = (testTemplateFolderName: string) => {
  return resolve(__dirname, `./data/${testTemplateFolderName}`)
}

export const loadJsonFile = (filePath: string) => {
  const src = loadFile(filePath)
  return JSON.parse(src)
}

export const loadFile = (filePath: string) => {
  return fs.readFileSync(filePath, 'utf8')
}

interface WriteFileOpts {
  executable?: boolean
}

export const writeFile = (filePath: string, contents: string, opts: WriteFileOpts = {}) => {
  fs.writeFileSync(filePath, contents, 'utf8')
  if (opts.executable) {
    fs.chmodSync(filePath, '755')
  }
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
