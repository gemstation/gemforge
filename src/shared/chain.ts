import { Contract, ethers, Signer, TransactionResponse } from "ethers";
import { MnemonicWalletConfig, NetworkConfig, WalletConfig } from "./config.js";
import { error, trace } from "./log.js";
import { Provider } from "ethers";
import { loadJson, saveJson } from "./fs.js";
import { TransactionReceipt } from "ethers";
import { Fragment } from "ethers";
import { Context } from "./context.js";
import get from "lodash.get";
import { glob } from "glob";
import path from "node:path";


export interface Network {
  config: NetworkConfig,
  provider: Provider,
  chainId: number,
}

export const setupNetwork = async (n: NetworkConfig): Promise<Network> => {
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

export const setupWallet = (walletConfig: WalletConfig, provider: Provider) => {
  trace(`Setting up wallet of type: ${walletConfig.type}`)

  switch (walletConfig.type) {
    case 'mnemonic':
      return setupMnemonicWallet(walletConfig.config)
    default:
      error(`Unknown wallet type: ${walletConfig.type}`)
  }
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
  
  let jsonFilePath = ''
  let fullyQualifiedName = ''

  switch (ctx.config.artifacts.format) {
    case 'foundry':
      jsonFilePath = `${ctx.artifactsPath}/${name}.sol/${name}.json`
      fullyQualifiedName = `${name}.sol:${name}`
      break
    case 'hardhat':
      const files = glob.sync(`${ctx.artifactsPath}/**/*.json`) as string[]
      const filePath = path.relative(ctx.artifactsPath, files.find(f => path.basename(f) === `${name}.json`)!)
      jsonFilePath = `${ctx.artifactsPath}/${filePath}`
      fullyQualifiedName = `${path.dirname(filePath)}:${name}`
      break
    default:
      error(`Unknown artifacts format: ${ctx.config.artifacts.format}`)
  }

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


export interface ContractDeploymentRecord {
  name: string,
  fullyQualifiedName: string,
  sender: string,
  txHash: string,
  contract: {
    address: string,
    constructorArgs: any[],
  }
}

export interface ChainDeploymentInfo {
  [chainId: string]: ContractDeploymentRecord[]
}

export const readDeploymentInfo = (jsonFilePath: string, network: Network): ContractDeploymentRecord[] =>  {
  trace(`Reading deployment records for chain id ${network.chainId} from ${jsonFilePath} ...`)

  const chainId = String(network.chainId)
  let obj: ChainDeploymentInfo = {}

  try {
    obj = loadJson(jsonFilePath) as ChainDeploymentInfo
    const records = get(obj, chainId)
    if (records) {
      return records
    } else {
      trace(`No deployment info found for chain chain id ${chainId} in ${jsonFilePath}`)
      return []
    }
  } catch (err: any) {
    trace(`Failed to load ${jsonFilePath}: ${err.message}`)
    return []
  }
}

export const saveDeploymentInfo = (jsonFilePath: string, network: Network, records: ContractDeploymentRecord[], isNewDeployment: boolean) => {
  trace(`Saving deployment info to: ${jsonFilePath} ...`)
  trace(`${records.length} records to save`)

  const chainId = String(network.chainId)

  try {
    let infoData: ChainDeploymentInfo = {}
    const finalized: ContractDeploymentRecord[] = []

    try {
      infoData = loadJson(jsonFilePath) as ChainDeploymentInfo
      
      const existing = get(infoData, chainId)

      if (existing) {
        trace(`   ${existing.length} existing records found`)
        if (isNewDeployment) {
          trace(`New deployment, so overwriting existing records`)
          finalized.push(...records)
        } else {
          trace(`Not a new deployment, so merging existing records with new records`)
          finalized.push(...records)
          existing.forEach(r => {
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

    infoData[chainId] = finalized

    trace(`Saving ${finalized.length} records to ${jsonFilePath}`)
    saveJson(jsonFilePath, infoData)
  } catch (err: any) {
    error(`Failed to save records: ${err.message}`)
  }
}



let deploymentRecords: ContractDeploymentRecord[] = []

export const clearDeploymentRecords = () => {
  deploymentRecords = []
}

export const getDeploymentRecords = () => {
  return deploymentRecords.concat([])
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

    deploymentRecords.push({
      name,
      fullyQualifiedName: artifact.fullyQualifiedName,
      sender: await signer.getAddress(),
      txHash: contract.deploymentTransaction()!.hash,
      contract: {
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


export const getContractValue = async (contract: OnChainContract, method: string, args: any[]): Promise<any> => {  
  const label = `${method}() on contract ${contract.artifact.name} deployed at ${contract.address} with args (${args.join(', ')})`

  try {
    trace(`Calling ${label} ...`)
    return (await contract.contract[method](...args)) as any
  } catch (err: any) {
    return error(`Failed to call ${label}: ${err.message}`)
  }
}



export const execContractMethod = async (contract: OnChainContract, method: string, args: any[]): Promise<TransactionReceipt> => {  
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
    return error(`Failed to execute ${label}: ${err.message}`)
  }
}


const latestNonce: Record<string, number> = {}

const getLatestNonce = async (signer: Signer): Promise<number> => {
  const address = await signer.getAddress()

  trace(`Get nonce for ${address}...`)
  
  if (!latestNonce[address]) {
    latestNonce[address] = await signer.getNonce()
    trace(`   Live nonce: ${latestNonce[address]}`)
  } else {
    latestNonce[address]++
    trace(`   Incremented nonce: ${latestNonce[address]}`)
  }

  
  return latestNonce[address]
}
