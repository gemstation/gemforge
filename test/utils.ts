import chai, { expect } from "chai"
import chaiAsPromised from 'chai-as-promised'
import { spawn, spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { dirname, resolve, join, basename, relative } from "node:path"
import tmp from 'tmp'
import type { GemforgeConfig } from '../src/shared/config/index.js'
import get from "lodash.get"
import { Contract, ContractTransactionResponse, Fragment, TransactionResponse, ethers } from "ethers"
import { glob } from "glob"

chai.use(chaiAsPromised)

export { GemforgeConfig, expect }

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

export interface LoadedContract {
  contract: Contract,
  walletAddress: string,
}

export const sendTx = async (txCall: Promise<TransactionResponse>) => {
  const tx = await txCall
  return await tx.wait()
}

export const loadDiamondContract = async (cwd: string, abiOverride?: string[]): Promise<LoadedContract> => {
  const cfgFilePath = join(cwd, 'gemforge.config.cjs')
  const config = (await import(cfgFilePath)).default as GemforgeConfig

  const filePath = join(cwd, 'gemforge.deployments.json')
  const json = loadJsonFile(filePath)
  const address = get(json, `local.contracts`, []).find((a: any) => a.name === 'DiamondProxy')!.onChain.address

  let abi: Fragment[]
  let bytecode: string

  switch (config.artifacts.format) {
    case 'foundry': {
      const json = loadJsonFile(`${cwd}/out/IDiamondProxy.sol/IDiamondProxy.json`) as any
      abi = json.abi as Fragment[]
      bytecode = json.bytecode.object
      break
    }
    case 'hardhat': {
      const files = glob.sync(`${cwd}/artifacts/**/*.json`) as string[]
      const filePath = relative(`${cwd}/artifacts`, files.find(f => basename(f) === `IDiamondProxy.json`)!)
      const json = loadJsonFile(`${cwd}/artifacts/${filePath}`) as any
      abi = json.abi as Fragment[]
      bytecode = json.bytecode
      break
    }
  }

  const provider = new ethers.JsonRpcProvider(config.networks.local.rpcUrl as string)
  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(config.wallets.wallet1.config.words as string),
    `m/44'/60'/0'/0/${config.wallets.wallet1.config.index}`
  ) 
  const signer = wallet.connect(provider)

  const factory = new ethers.ContractFactory(abiOverride || abi, bytecode, signer)

  return {
    contract: factory.attach(address) as Contract,
    walletAddress: await signer.getAddress(),
  }
}

