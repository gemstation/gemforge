import { spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from "node:path"
import tmp from 'tmp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CliOptions {
  cwd?: string
}

tmp.setGracefulCleanup()

export const getCli = (opts: CliOptions = {}) => (...gemforgeArgs: any[]) => {
  const cwd = opts.cwd || tmp.dirSync().name

  const args = [
    '--no-warnings',
    resolve(__dirname, "../build/gemforge.js"),
  ].concat(gemforgeArgs)

  const output = spawnSync(process.argv[0], args, { stdio: "pipe", shell: true, cwd })
  
  return { 
    cwd,
    msg: output.stdout.toString(), 
    success: output.status === 0 
  }
}
