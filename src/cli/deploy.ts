import { ethers } from 'ethers'

import { error, info, trace } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { FacetDefinition, loadJson } from '../shared/fs.js'
import path from 'node:path'
import { createCommand, logSuccess } from './common.js'
import { ContractArtifact, deployContract, loadContractArtifact, setupWallet } from '../shared/chain.js'
import { Contract } from 'ethers'
import { BaseContract } from 'ethers'

export const command = () =>
  createCommand('deploy', 'Deploy the diamond to a network.')
    .argument('[network]', 'network to deploy to', 'local')
    .action(async (networkArg, args) => {
      const ctx = await getContext(args)

      info(`Selected network: ${networkArg}`)
      const network = ctx.config.networks[networkArg]
      if (!network) {
        error(`Network not found in config: ${networkArg}`)
      }
      info('Checking network...')
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
      await provider.getNetwork()

      info(`Setting up wallet "${network.wallet}" ...`)
      const walletConfig = ctx.config.wallets[network.wallet]
      const wallet = setupWallet(walletConfig, provider)!
      const walletAddress = await wallet.getAddress()
      info(`Wallet deployer address: ${walletAddress}`)

      const signer = wallet.connect(provider)

      const generatedSupportPath = path.resolve(ctx.folder, ctx.config.paths.generated.support)

      info('Loading facets.json...')
      const facets = loadJson(`${generatedSupportPath}/facets.json`) as Record<string, FacetDefinition>

      const artifactsFolder = path.resolve(ctx.folder, ctx.config.paths.artifacts)

      info('Loading facet build outputs...')
      const facetContractNames = Object.keys(facets)
      const facetArtifacts = facetContractNames.reduce((m, name: any) => {
        m[name] = loadContractArtifact(name, artifactsFolder)
        return m
      }, {} as Record<string, ContractArtifact>)

      info(`Loaded ${facetContractNames.length} facet(s)`)
      facetContractNames.forEach(name => {
        trace(`  ${name}`)
      })

      info('Deploying facets...')
      const facetContracts: Record<string, BaseContract> = {}
      await Promise.all(facetContractNames.map(async name => {
        const contract = await deployContract(name, facetArtifacts[name], signer)
        facetContracts[name] = contract
        info(`   ${name} deployed at: ${await contract.getAddress()}`)
      }))

      info('Deploying diamond...')
      const artifact = loadContractArtifact('DiamondProxy', artifactsFolder)
      const diamond = await deployContract('DiamondProxy', artifact, signer)
      info(`   DiamondProxy deployed at: ${await diamond.getAddress()}`)

      logSuccess()
    })

  