import { loadContractArtifact, setupTarget, setupWallet, verifyContract } from '../shared/chain.js'
import { getContext } from '../shared/context.js'
import { error, info } from '../shared/log.js'
import { createCommand, loadExistingDeploymentAndLog, logSuccess } from './common.js'

export const command = () =>
  createCommand('verify', 'Verify the source code of deployed contracts in the block explorer.')
    .argument('target', 'deployment target to verify')
    .action(async (targetArg, args) => {
      const ctx = await getContext(args)

      info(`Selected target: ${targetArg}`)
      const t = ctx.config.targets[targetArg]
      if (!t) {
        error(`Target not found in config: ${targetArg}`)
      }

      info(`Setting up target network connection "${t.network}" ...`)
      const target = await setupTarget(ctx, t)
      info(`   Network chainId: ${target.network.chainId}`)

      info(`Setting up wallet "${t.wallet}" ...`)
      const walletConfig = ctx.config.wallets[t.wallet]
      const wallet = setupWallet(walletConfig)!
      const walletAddress = await wallet.getAddress()
      info(`Wallet deployer address: ${walletAddress}`)

      const signer = wallet.connect(target.network.provider)

      info(`Load existing deployment ...`)
      const ret = await loadExistingDeploymentAndLog({ ctx, signer, targetArg, target })
      if (!ret?.proxyInterface) {
        error(`No existing deployment found at target.`)
      }

      const { deployedContracts } = ret!

      for (const contract of deployedContracts) {
        info(`Verifying contract ${contract.name} deployed at ${contract.onChain.address} ...`)

        const artifact = loadContractArtifact(ctx, contract.name)
        await verifyContract(ctx, target, artifact, contract.onChain.address, contract.onChain.constructorArgs)

        info(`...verified.`)
      }

      logSuccess()
    })
