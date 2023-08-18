import { Contract, ethers, Signer, TransactionResponse } from "ethers";
import { MnemonicWalletConfig, NetworkConfig, WalletConfig } from "./config.js";
import { error, trace } from "./log.js";
import { Provider } from "ethers";
import { loadJson } from "./fs.js";
import { TransactionReceipt } from "ethers";
import { Fragment } from "ethers";


export interface Network {
  config: NetworkConfig,
  provider: Provider,
  chainId: number,
}

export const setupNetwork = async (n: NetworkConfig): Promise<Network> => {
  const provider = new ethers.JsonRpcProvider(n.rpcUrl)
  const chainId = await provider.send('eth_chainId', [])

  return {
    config: n,
    provider,
    chainId: ethers.toNumber(chainId),
  }
}


export const setupMnemonicWallet = (config: MnemonicWalletConfig): Signer => {
  return ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(config.words), 
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
  abi: Fragment[],
  bytecode: string
}

export const loadContractArtifact = (name: string, basePath: string) => {
  trace(`Loading contract artifact: ${name} ...`)
  const { abi, bytecode: { object: bytecode } } = loadJson(`${basePath}/${name}.sol/${name}.json`) as any
  return { abi, bytecode } as ContractArtifact
}

export interface OnChainContract {
  name: string
  address: string
  contract: Contract
}

export const getContractAt = async (name: string, artifactsFolder: string, signer: Signer, address: string): Promise<OnChainContract> => {
  try {
    const artifact = loadContractArtifact(name, artifactsFolder)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)

    return  {
      name,
      address,
      contract: factory.attach(address) as Contract,
    }
   } catch (err: any) {
    return error(`Failed to load ${name} at address ${address}: ${err.message}}`)
   }
}

export const deployContract = async (name: string, artifactsFolder: string, signer: Signer, ...args: any[]): Promise<OnChainContract> => {
  try {
    const artifact = loadContractArtifact(name, artifactsFolder)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
    trace(`Deployed ${name} ...`)
    const tx = await factory.deploy(...args)
    const contract = await tx.waitForDeployment() as Contract

    return  {
      name,
      address: await contract.getAddress(),
      contract,
    }
   } catch (err: any) {
    return error(`Failed to deploy ${name}: ${err.message}}`)
   }
}


export const getContractValue = async (contract: OnChainContract, method: string, args: any[]): Promise<any> => {  
  const label = `${method}() on contract ${contract.name} deployed at ${contract.address} with args (${args.join(', ')})`

  try {
    trace(`Calling ${label} ...`)
    return (await contract.contract[method](...args)) as any
  } catch (err: any) {
    return error(`Failed to call ${label}: ${err.message}`)
  }
}



export const execContractMethod = async (contract: OnChainContract, method: string, args: any[]): Promise<TransactionReceipt> => {  
  const label = `${method}() on contract ${contract.name} deployed at ${contract.address} with args (${args.join(', ')})`

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


