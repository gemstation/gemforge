import { Contract, ethers, Signer, TransactionResponse } from "ethers";
import { MnemonicWalletConfig, NetworkConfig, WalletConfig } from "./config.js";
import { error, trace } from "./log.js";
import { Provider } from "ethers";
import { getArtifactsFolderPath, loadJson } from "./fs.js";
import { TransactionReceipt } from "ethers";
import { Fragment } from "ethers";
import { Context } from "./context.js";
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
  abi: Fragment[],
  bytecode: string,
  deployedBytecode: string,
}

export const loadContractArtifact = (ctx: Context, name: string) => {
  trace(`Loading contract artifact: ${name} ...`)
  
  const artifactsFolder = getArtifactsFolderPath(ctx)
  let filePath = ''

  switch (ctx.config.artifacts.format) {
    case 'foundry':
      filePath = `${artifactsFolder}/${name}.sol/${name}.json`
      break
    case 'hardhat':
      filePath = `${artifactsFolder}/${name}.json`
      break
    default:
      error(`Unknown artifacts format: ${ctx.config.artifacts.format}`)
  }

  const { 
    abi, 
    bytecode: { object: bytecode },
    deployedBytecode: { object: deployedBytecode },
  } = loadJson(filePath) as any

  return { name, abi, bytecode, deployedBytecode } as ContractArtifact
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
    return error(`Failed to load ${name} at address ${address}: ${err.message}}`)
   }
}

export const deployContract = async (ctx: Context, name: string, signer: Signer, ...args: any[]): Promise<OnChainContract> => {
  try {
    const artifact = loadContractArtifact(ctx, name)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
    trace(`Deployed ${name} ...`)
    const tx = await factory.deploy(...args)
    const contract = await tx.waitForDeployment() as Contract

    return  {
      artifact,
      address: await contract.getAddress(),
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
    const tx = (await contract.contract[method](...args)) as TransactionResponse
    const receipt = (await tx.wait())!
    trace(`   ...mined in block ${receipt.blockNumber}`)
    return receipt
  } catch (err: any) {
    return error(`Failed to execute ${label}: ${err.message}`)
  }
}


