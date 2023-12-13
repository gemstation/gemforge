import { glob } from "glob";
import path from "node:path";
import get from "lodash.get";
import { Provider } from "ethers";
import { Fragment } from "ethers";
import { Mutex } from "./mutex.js";
import { Context } from "./context.js";
import { error, trace } from "./log.js";
import { TransactionReceipt } from "ethers";
import { loadJson, saveJson } from "./fs.js";
import { Contract, ethers, Signer, TransactionResponse } from "ethers";
import { MnemonicWalletConfig, PrivateKeyWalletConfig, NetworkConfig, TargetConfig, WalletConfig } from "./config/index.js";
import { ErrorFragment, EventFragment } from "ethers";

interface Network {
  config: NetworkConfig,
  provider: Provider,
  chainId: number,
}

const setupNetwork = async (n: NetworkConfig): Promise<Network> => {
  let rpcUrlStr: string = ''

  switch (typeof n.rpcUrl) {
    case 'string':
      rpcUrlStr = n.rpcUrl
      break
    case 'function':
      rpcUrlStr = n.rpcUrl()
      break
  }

  trace(`Setting up network with RPC URL: ${rpcUrlStr}`)
    
  const provider = new ethers.JsonRpcProvider(rpcUrlStr)
  const chainId = await provider.send('eth_chainId', [])

  return {
    config: n,
    provider,
    chainId: ethers.toNumber(chainId),
  }
}

export interface Target {
  config: TargetConfig,
  network: Network,
}

export const setupTarget = async (ctx: Context, config: TargetConfig): Promise<Target> => {
  const n = ctx.config.networks[config.network]
  const network = await setupNetwork(n)
  return {
    config,
    network,
  }
}

export const setupMnemonicWallet = (config: MnemonicWalletConfig): Signer => {
  let words: string = ''

  switch (typeof config.words) {
    case 'string':
      words = config.words
      break
    case 'function':
      words = config.words()
      break
  }

  trace(`Setting up mnemonic wallet with mnemonic: ${words}`)

  return ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(words), 
    `m/44'/60'/0'/0/${config.index}`
  )
}

export const setupPrivateKeyWallet = (config: PrivateKeyWalletConfig): Signer => {
  let key: string = ''

  switch((typeof config.key)) {
    case 'string':
      key = config.key
      break
    case 'function':
      key = config.key()
      break
  }

  trace(`Setting up private key wallet with: ${key}`)

  return new ethers.Wallet(key)
}

export const setupWallet = (walletConfig: WalletConfig) => {
  trace(`Setting up wallet of type: ${walletConfig.type}`)

  switch (walletConfig.type) {
    case 'mnemonic':
      return setupMnemonicWallet(walletConfig.config)
    case 'private-key':
      return setupPrivateKeyWallet(walletConfig.config)
    default:
      error(`Unknown wallet type: ${walletConfig}`)
  }
}

/**
 * Generated unified ABI consisting of the diamond proxy interface + custom erros.
 * 
 * Note: this should only be run after the contracts have been compiled.
 * 
 * @param ctx 
 * @returns 
 */
export const generateUnifiedAbi = (ctx: Context): Fragment[] => {
  const aPaths = getAllContractArtifactPaths(ctx)

  const abi: Fragment[] = []
  const errors: Record<string, Fragment> = {}
  const events: Record<string, Fragment> = {}

  aPaths.forEach(({ jsonFilePath }) => {
    try {
      const j = loadJson(jsonFilePath) as any
      if (j.abi) {
        (j.abi as Fragment[]).forEach(f => {
          switch (f.type) {
            case 'error':
              errors[(f as ErrorFragment).name] = f
              break
            case 'event':
              events[(f as EventFragment).name] = f
              break
            default: {
              if (jsonFilePath.endsWith('/IDiamondProxy.json')) {
                abi.push(f)
              }
            }
              
          }
        })
      }
    } catch (e) {}
  })

  abi.push(...Object.values(events), ...Object.values(errors))

  return abi
}

export interface ContractArtifact {
  name: string,
  fullyQualifiedName: string,
  abi: Fragment[],
  bytecode: string,
  deployedBytecode: string,
}

export const loadContractArtifact = (ctx: Context, name: string) => {
  trace(`Loading contract artifact: ${name} ...`)

  const match = getAllContractArtifactPaths(ctx).find(f => f.jsonFilePath.endsWith(`/${name}.json`))

  if (!match) {
    error(`Failed to find contract artifact: ${name}`)
  }

  const { jsonFilePath, fullyQualifiedName } = match!

  const json = loadJson(jsonFilePath) as any

  let abi: Fragment[] = json.abi
  let bytecode: string
  let deployedBytecode: string

  switch (ctx.config.artifacts.format) {
    case 'foundry':
      bytecode = json.bytecode.object
      deployedBytecode = json.deployedBytecode.object
      break
    case 'hardhat':
      bytecode = json.bytecode
      deployedBytecode = json.deployedBytecode
  }

  return { name, fullyQualifiedName, abi, bytecode, deployedBytecode } as ContractArtifact
}

export interface OnChainContract {
  artifact: ContractArtifact
  address: string
  contract: Contract
}

export const getContractAt = async (ctx: Context, name: string, signer: Signer, address: string): Promise<OnChainContract> => {
  try {
    const artifact = loadContractArtifact(ctx, name)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)

    return  {
      artifact,
      address,
      contract: factory.attach(address) as Contract,
    }
   } catch (err: any) {
    return error(`Failed to load ${name} at address ${address}: ${err.message}}`)
   }
}

export const getContractAtUsingArtifact = async (artifact: ContractArtifact, signer: Signer, address: string): Promise<OnChainContract> => {
  try {
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)

    return  {
      artifact,
      address,
      contract: factory.attach(address) as Contract,
    }
   } catch (err: any) {
    return error(`Failed to load ${artifact.name} at address ${address}: ${err.message}}`)
   }
}


export class BytecodeFetcher {
  private _signer: Signer
  private _cache: Record<string, string> = {}

  constructor(signer: Signer) {
    this._signer = signer
  }

  async getBytecode(address: string): Promise<string> {
    if (!this._cache[address]) {
      try {
        trace(`Getting bytecode for contract at address ${address} ...`)
        this._cache[address] = await this._signer.provider!.getCode(address)
      } catch (err: any) {
        return error(`Failed to get bytecode at address ${address}: ${err.message}}`)
      }
    }
    return this._cache[address]
  }
}


export interface ContractDeploymentRecord {
  name: string,
  fullyQualifiedName: string,
  sender: string,
  txHash: string,
  onChain: {
    address: string,
    constructorArgs: any[],
  }
}

export interface TargetDeploymentRecord {
  chainId: number,
  contracts: ContractDeploymentRecord[]
}

export interface TargetDeploymentRecords {
  [targetName: string]: TargetDeploymentRecord
}

export const readDeploymentInfo = (jsonFilePath: string, targetName: string, target: Target): TargetDeploymentRecord | undefined =>  {
  trace(`Reading deployment records for target ${targetName} from ${jsonFilePath} ...`)

  const chainId = String(target.network.chainId)
  let obj: TargetDeploymentRecords = {}

  try {
    obj = loadJson(jsonFilePath) as TargetDeploymentRecords
    const records = get(obj, `${targetName}`) as any as TargetDeploymentRecord
    if (records) {
      return records
    } else {
      trace(`No deployment info found for chain chain id ${chainId} in ${jsonFilePath}`)
      return
    }
  } catch (err: any) {
    trace(`Failed to load ${jsonFilePath}: ${err.message}`)
    return
  }
}

export const saveDeploymentInfo = (jsonFilePath: string, targetName: string, target: Target, records: ContractDeploymentRecord[], isNewDeployment: boolean) => {
  trace(`Saving deployment info to: ${jsonFilePath} ...`)
  trace(`${records.length} records to save`)

  try {
    let infoData: TargetDeploymentRecords = {}
    const finalized: ContractDeploymentRecord[] = []

    try {
      infoData = loadJson(jsonFilePath) as TargetDeploymentRecords
      
      let existing = get(infoData, `${targetName}`) as any as TargetDeploymentRecord
      const isValid = !!(existing && existing.chainId === target.network.chainId)

      if (isValid) {
        trace(`   ${existing.contracts.length} existing contract records found`)
        if (isNewDeployment) {
          trace(`New deployment, so overwriting existing records`)
          finalized.push(...records)
        } else {
          trace(`Not a new deployment, so merging existing records with new records`)
          finalized.push(...records)
          existing.contracts.forEach(r => {
            if (!finalized.find(f => f.name === r.name)) {
              finalized.push(r)
            }
          })
        }
      } else {
        throw new Error('No existing records found')
      }
    } catch (err: any) {
      trace(`No existing records found`)
      finalized.push(...records)
    }

    infoData[targetName] = infoData[targetName] || {}
    infoData[targetName].chainId = target.network.chainId
    infoData[targetName].contracts = finalized

    trace(`Saving ${finalized.length} records to ${jsonFilePath}`)
    saveJson(jsonFilePath, infoData)
  } catch (err: any) {
    error(`Failed to save records: ${err.message}`)
  }
}



let deploymentRecorder: ContractDeploymentRecord[] = []

export const clearDeploymentRecorder = () => {
  deploymentRecorder = []
}

export const getDeploymentRecorderData = () => {
  return deploymentRecorder.concat([])
}

export const deployContract = async (ctx: Context, name: string, signer: Signer, ...args: any[]): Promise<OnChainContract> => {
  try {
    const artifact = loadContractArtifact(ctx, name)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
    trace(`Deploying ${name} ...`)
    const tx = await factory.deploy(...args, {
      nonce: await getLatestNonce(signer)
    })
    const contract = await tx.waitForDeployment() as Contract
    const address = await contract.getAddress()

    deploymentRecorder.push({
      name,
      fullyQualifiedName: artifact.fullyQualifiedName,
      sender: await signer.getAddress(),
      txHash: contract.deploymentTransaction()!.hash,
      onChain: {
        address,
        constructorArgs: args,
      }
    })

    return  {
      artifact,
      address,
      contract,
    }
   } catch (err: any) {
    return error(`Failed to deploy ${name}: ${err.message}}`)
   }
}


export const getContractValue = async (contract: OnChainContract, method: string, args: any[], dontExitOnError = false): Promise<any> => {  
  const label = `${method}() on contract ${contract.artifact.name} deployed at ${contract.address} with args (${args.join(', ')})`

  try {
    trace(`Calling ${label} ...`)
    return (await contract.contract[method](...args)) as any
  } catch (err: any) {
    const errorMessage = `Failed to call ${label}: ${err.message}`
    if (dontExitOnError) {
      throw new Error(errorMessage)
    } else {
      return error(errorMessage)
    }
  }
}



export const execContractMethod = async (contract: OnChainContract, method: string, args: any[], dontExitOnError = false): Promise<TransactionReceipt> => {  
  const label = `${method}() on contract ${contract.artifact.name} deployed at ${contract.address} with args (${args.join(', ')})`

  try {
    trace(`Executing ${label} ...`)
    const tx = (await contract.contract[method](...args, {
      nonce: await getLatestNonce(contract.contract.runner as Signer)
    })) as TransactionResponse
    const receipt = (await tx.wait())!
    trace(`   ...mined in block ${receipt.blockNumber}`)
    return receipt
  } catch (err: any) {
    const errorMessage = `Failed to execute ${label}: ${err.message}`
    if (dontExitOnError) {
      throw new Error(errorMessage)
    } else {
      return error(errorMessage)
    }
  }
}


const latestNonce: Record<string, number> = {}

const nonceMutex = new Mutex()

const getLatestNonce = async (signer: Signer): Promise<number> => {
  try {
    await nonceMutex.lock()

    const address = await signer.getAddress()

    trace(`Get nonce for ${address}...`)
    
    if (!latestNonce[address]) {
      latestNonce[address] = await signer.getNonce()
      trace(`   Live nonce: ${latestNonce[address]}`)
    } else {
      latestNonce[address]++
      trace(`   Incremented nonce: ${latestNonce[address]}`)
    }

    await nonceMutex.unlock()

    return latestNonce[address]
  } catch (err: any) {
    await nonceMutex.unlock()
    return error(`Failed to get nonce: ${err.message}`)
  }
}


interface ContractArtifactPath {
  jsonFilePath: string
  fullyQualifiedName: string
}

const getAllContractArtifactPaths = (ctx: Context): ContractArtifactPath[] => {
  const files = glob.sync(`${ctx.artifactsPath}/**/*.json`) as string[]

  return files.map(f => {
    const name = path.basename(f, '.json')

    let jsonFilePath = f
    let fullyQualifiedName = ''

    switch (ctx.config.artifacts.format) {
      case 'foundry':
        fullyQualifiedName = `${name}.sol:${name}`
        break
      case 'hardhat':
        const filePath = path.relative(ctx.artifactsPath, f)
        fullyQualifiedName = `${path.dirname(filePath)}:${name}`
        break
      default:
        error(`Unknown artifacts format: ${ctx.config.artifacts.format}`)
    }

    return {
      jsonFilePath,
      fullyQualifiedName,
    }
  })
}