import tmp from 'tmp'
import fs from 'node:fs'
import { glob } from "glob"
import get from "lodash.get"
import chai, { expect } from "chai"
import { fileURLToPath } from 'node:url'
import chaiAsPromised from 'chai-as-promised'
import { spawn, spawnSync } from "node:child_process"
import type { GemforgeConfig } from '../src/shared/config/index.js'
import { dirname, resolve, join, basename, relative } from "node:path"
import { Contract, Fragment, TransactionResponse, ethers } from "ethers"
import { MnemonicWalletConfig, PrivateKeyWalletConfig } from "../src/shared/config/v1.js"

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

export const fileExists = (filePath: string) => {
  return fs.existsSync(filePath)
}

export const loadFile = (filePath: string) => {
  return fs.readFileSync(filePath, 'utf8')
}

interface WriteFileOpts {
  executable?: boolean
}

export const removeFile = (filePath:string) => {
  if (fileExists(filePath)) {
    fs.unlinkSync(filePath)
  }
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

const loadWalletFromCfg = (cfg: GemforgeConfig, network: string, wallet: string) => {
  const provider = new ethers.JsonRpcProvider(cfg.networks[network].rpcUrl as string)

  const type = cfg.wallets[wallet].type

  switch (type) {
    case 'mnemonic': {
      const walletCfg = cfg.wallets[wallet].config as MnemonicWalletConfig
      let words = walletCfg.words
      if (typeof words === 'function') {
        words = words()
      }

      const w = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(words as string),
        `m/44'/60'/0'/0/${walletCfg.index}`
      )

      return w.connect(provider)
    }
    case 'private-key': {
      const walletCfg = cfg.wallets[wallet].config as PrivateKeyWalletConfig
      let key = walletCfg.key
      if (typeof key === 'function') {
        key = key()
      }
      const w = new ethers.Wallet(key as string)
      return w.connect(provider)
    }
  }
}

export const loadWallet = async (cfgFilePath: string, network: string, wallet: string) => {
  const obj = (await import(cfgFilePath)).default as GemforgeConfig
  return loadWalletFromCfg(obj, network, wallet)
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

  const signer = loadWalletFromCfg(config, 'local', 'wallet1')

  const factory = new ethers.ContractFactory(abiOverride || abi, bytecode, signer)

  return {
    contract: factory.attach(address) as Contract,
    walletAddress: await signer.getAddress(),
  }
}

