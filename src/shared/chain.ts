import { Contract, ethers, Signer } from "ethers";
import { MnemonicWalletConfig, WalletConfig } from "./config.js";
import { error, trace } from "./log.js";
import { Provider } from "ethers";
import { captureErrorAndExit, loadJson } from "./fs.js";
import { Interface } from "ethers";
import { BaseContract } from "ethers";
import { Context } from "./context.js";

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
  abi: Interface,
  bytecode: string
}

export const loadContractArtifact = (name: string, basePath: string) => {
  trace(`Loading contract artifact: ${name} ...`)
  const { abi, bytecode: { object: bytecode } } = loadJson(`${basePath}/${name}.sol/${name}.json`) as any
  return { abi, bytecode } as ContractArtifact
}


export const deployContract = async (name: string, artifact: ContractArtifact, signer: Signer, ...args: any[]): Promise<BaseContract> => {
  try {
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
    trace(`Deployed ${name} ...`)
    const tx = await factory.deploy(...args)
    return await tx.waitForDeployment()
   } catch (err: any) {
    return captureErrorAndExit(err, `Failed to deploy ${name}`) as any
   }
}