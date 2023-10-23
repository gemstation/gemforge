import { Command } from 'commander'
import { Signer } from 'ethers'
import { ContractArtifact, Target, getContractAt, getContractValue, loadContractArtifact, readDeploymentInfo } from '../shared/chain.js'
import { Context } from '../shared/context.js'
import { FacetDefinition, loadJson } from '../shared/fs.js'
import { error, info } from '../shared/log.js'

export interface CreateCommandOptions {
  skipConfigOption?: boolean
}

export const createCommand = (name: string, desc: string, opts?: CreateCommandOptions) => {
  let c = new Command(name)
    .description(desc)
    .option('-v, --verbose', 'verbose logging output')
    .option('-q, --quiet', 'disable logging output')
    .option('-f, --folder <folder>', 'folder to run gemforge in', '.')

  if (!opts?.skipConfigOption) {
    c = c.option('-c, --config <config>', 'gemforge config file to use', 'gemforge.config.cjs')
  }

  return c
}


export const logSuccess = () => {
  info('All done.')
}



export const loadExistingDeploymentAndLog = async ({ ctx, signer, targetArg, target }: { 
  ctx: Context
  signer: Signer
  targetArg: string
  target: Target
}) => {
  const existingTargetRecord = readDeploymentInfo(ctx.deploymentInfoJsonPath, targetArg, target)
  const existingProxy = (existingTargetRecord && existingTargetRecord.chainId == target.network.chainId) ? existingTargetRecord.contracts.find(r => r.name === 'DiamondProxy') : undefined
  if (existingProxy) {
    info(`   Existing deployment found at: ${existingProxy.onChain.address}`)
    info(`Checking if existing deployment is still valid...`)
    const proxyInterface = await getContractAt(ctx, 'IDiamondProxy', signer, existingProxy.onChain.address)

    try {
      const isDiamond = await getContractValue(proxyInterface, 'supportsInterface', ['0x01ffc9a7'], true)
      if (!isDiamond) {
        throw new Error(`supportsInterface() error`)
      }

      const facets = await getContractValue(proxyInterface, 'facets', [], true)
      if (!facets) {
        throw new Error(`facets() error`)
      }

      return proxyInterface
    } catch (err: any) {
      error(`Existing deployment is not a diamond: ${err.message}\n\nYou may want to run with --new to force a fresh deployment.`)
    }
  }
} 

export const loadFacetArtifactsAndLog = (ctx: Context) => {
  info('Loading user facet artifacts...')
  const userFacets = loadJson(`${ctx.generatedSupportPath}/facets.json`) as Record<string, FacetDefinition>
  const userFacetContractNames = Object.keys(userFacets)
  info(`   ${userFacetContractNames.length} facets found.`)
  const userFacetArtifacts = userFacetContractNames.reduce((m, name) => {
    m[name] = loadContractArtifact(ctx, name)
    return m
  }, {} as Record<string, ContractArtifact>)

  info('Loading core facet artifacts...')
  const coreFacets = ctx.config.diamond.coreFacets.reduce((m, name) => {
    m[name] = loadContractArtifact(ctx, name)
    return m
  }, {} as Record<string, ContractArtifact>)

  return { userFacetArtifacts, coreFacets }
}