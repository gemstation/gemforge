import { Signer, FunctionFragment, Interface, ZeroAddress } from "ethers"
import { ContractArtifact, OnChainContract, getContractAtUsingArtifact, BytecodeFetcher, getContractValue } from "./chain.js"
import { trace } from "./log.js"

interface FunctionSelector {
  name: string,
  selector: string,
}

const getSelectors = (artifact: ContractArtifact): FunctionSelector[] => {
  const selectors: FunctionSelector[] = []

  const iface = new Interface(artifact.abi)

  iface.forEachFunction((f: FunctionFragment) => {
    selectors.push({
      name: f.format("sighash"),
      selector: f.selector,
    })
  })

  return selectors
}


const getLiveFunctions = async (diamondProxy: OnChainContract): Promise<Record<string, string>> => {
  // get what's on-chain
  trace('Resolving methods on-chain ...')
  const facets = await getContractValue(diamondProxy, 'facets', [])
  const liveFunctions: Record<string, string> = {}
  facets.forEach((v: any) => {
    v[1].forEach((f: string) => {
      liveFunctions[f] = v[0]
    })
  })
  return liveFunctions
}


export enum FacetCutAction { 
  Add = 0, 
  Replace = 1,
  Remove = 2,
}

export interface NamedFacetCut {
  facetNameOrAddress: string,
  action: FacetCutAction,
  functionSelectors: string[]
}

export interface FacetCut {
  facetAddress: string,
  action: FacetCutAction,
  functionSelectors: string[]
}

export const resolveClean = async (params: {
  coreFacets: Record<string, ContractArtifact>,
  diamondProxy?: OnChainContract,
  signer: Signer,
}): Promise<FacetCut> => {
  const { coreFacets, diamondProxy, signer } = params

  const cut: FacetCut = {
    action: FacetCutAction.Remove,
    facetAddress: ZeroAddress,
    functionSelectors: [],
  }
  const liveFunctions = diamondProxy ? await getLiveFunctions(diamondProxy) : {}
  const bytecodeFetcher = new BytecodeFetcher(signer)

  for (let f in liveFunctions) {
    const liveBytecode = await bytecodeFetcher.getBytecode(liveFunctions[f])

    // check bytecode of deployed contract against core facet bytecodes
    const matchesCore = Object.values(coreFacets).find((artifact: ContractArtifact) => {
      return artifact.deployedBytecode == liveBytecode
    })

    if (!matchesCore) {
      trace(`[Remove] method [${f}] pointing to facet ${liveFunctions[f]}`)
      cut.functionSelectors.push(f)
    }
  }

  return cut
}


export interface Upgrade {
  namedCuts: NamedFacetCut[],
  facetsToDeploy: string[],
}

export const resolveUpgrade = async (params: {
  userFacets: Record<string, ContractArtifact>, 
  coreFacets: Record<string, ContractArtifact>,
  diamondProxy?: OnChainContract,
  signer: Signer,
}): Promise<Upgrade> => {
  const { userFacets, coreFacets, diamondProxy, signer } = params

  // get what's on-chain
  const liveFunctions = diamondProxy ? await getLiveFunctions(diamondProxy) : {}

  // get what's in artifacts
  trace('Resolving methods in artifacts ...')
  const newFunctions: Record<string, string> = {}
  const functionNames: Record<string, string> = {}
  Object.keys(userFacets).forEach((k: string) => {
    const artifact = userFacets[k]
    getSelectors(artifact).forEach((s: FunctionSelector) => {
      newFunctions[s.selector] = k
      functionNames[s.selector] = s.name
    })
  })

  const facetsToDeploy: Record<string, boolean> = {}
  const todo = {
    add: {} as Record<string, string[]>,
    replace: {} as Record<string, string[]>,
    remove: {} as Record<string, string[]>,
  }

  const bytecodeFetcher = new BytecodeFetcher(signer)

  // resolve additions and replacements
  for (let f in newFunctions) {
    // add new function
    if (!liveFunctions[f]) {
      trace(`[Add] method ${functionNames[f]} [${f}] by deploying new facet ${newFunctions[f]}`)

      facetsToDeploy[newFunctions[f]] = true
      todo.add[newFunctions[f]] = todo.add[newFunctions[f]] || []
      todo.add[newFunctions[f]].push(f)
    } else {
      // check bytecode of deployed contract against artifact bytecode
      const artifact = userFacets[newFunctions[f]]
      const newBytecode = artifact.deployedBytecode
      const liveBytecode = await bytecodeFetcher.getBytecode(liveFunctions[f])
      if (liveBytecode !== newBytecode) {
        trace(`[Replace] method ${functionNames[f]} [${f}] by deploying new facet ${newFunctions[f]}`)

        facetsToDeploy[newFunctions[f]] = true
        todo.replace[newFunctions[f]] = todo.replace[newFunctions[f]] || []
        todo.replace[newFunctions[f]].push(f)
      }
    }
  }

  // removals
  for (let f in liveFunctions) {
    if (!newFunctions[f]) {
      const liveBytecode = await bytecodeFetcher.getBytecode(liveFunctions[f])
      // check bytecode of deployed contract against core facet bytecodes
      const matchesCore = Object.values(coreFacets).find((artifact: ContractArtifact) => {
        return artifact.deployedBytecode == liveBytecode
      })
      if (!matchesCore) {
        trace(`[Remove] method [${f}] pointing to facet ${liveFunctions[f]}`)
        todo.remove[ZeroAddress] = todo.remove[liveFunctions[f]] || []
        todo.remove[ZeroAddress].push(f)
      }
    }
  }

  const namedCuts: NamedFacetCut[] = []
  const _createNamedCuts = (src: Record<string, string[]>, action: FacetCutAction) => {
    Object.keys(src).forEach(facetNameOrAddress => {
      namedCuts.push({
        facetNameOrAddress: facetNameOrAddress,
        action,
        functionSelectors: src[facetNameOrAddress],
      })
    })
  }
  _createNamedCuts(todo.remove, FacetCutAction.Remove)
  _createNamedCuts(todo.replace, FacetCutAction.Replace)
  _createNamedCuts(todo.add, FacetCutAction.Add)

  return {
    namedCuts,
    facetsToDeploy: Object.keys(facetsToDeploy),
  }
}

export interface ResolvedChainData {
  proxyAddress: string,
  unrecognizedFacets: number,
  unrecognizedFunctions: number,
  facets: Record<string, {
    unrecognized?: boolean,
    address: string,
    functions: {
      name?: string,
      unrecognized?: boolean,
      selector: string,
    }[]
  }>
}

export const resolveChainData = async (params: {
  userFacets: Record<string, ContractArtifact>, 
  coreFacets: Record<string, ContractArtifact>,
  diamondProxy?: OnChainContract,
  signer: Signer,
}): Promise<ResolvedChainData> => {
  const { userFacets, coreFacets, diamondProxy, signer } = params

  // get what's on-chain
  const liveFunctions = diamondProxy ? await getLiveFunctions(diamondProxy) : {}

  // merge facets
  const allFacets = { ...userFacets, ...coreFacets }

  // get what's in artifacts
  trace('Resolving methods in artifacts ...')
  const bytecodeFacetNames: Record<string, string> = {}
  const functionFacetNames: Record<string, string> = {}
  const functionNames: Record<string, string> = {}
  
  Object.keys(allFacets).forEach((k: string) => {
    const artifact = allFacets[k]
    bytecodeFacetNames[artifact.deployedBytecode] = k
    getSelectors(artifact).forEach((s: FunctionSelector) => {
      functionFacetNames[s.selector] = k
      functionNames[s.selector] = s.name
    })
  })

  const ret: ResolvedChainData = {
    proxyAddress: diamondProxy ? diamondProxy.address : ZeroAddress,
    unrecognizedFacets: 0,
    unrecognizedFunctions: 0,
    facets: {},
  }

  const bytecodeFetcher = new BytecodeFetcher(signer)

  for (let f in liveFunctions) {
    const liveBytecode = await bytecodeFetcher.getBytecode(liveFunctions[f])
    const matchingFacetName = bytecodeFacetNames[liveBytecode]

    if (matchingFacetName) {
      if (!ret.facets[matchingFacetName]) {
        ret.facets[matchingFacetName] = {
          address: liveFunctions[f],
          functions: [],
        }
      }
      
      if (!functionNames[f]) {
        ret.unrecognizedFunctions++
      }

      ret.facets[matchingFacetName].functions.push({
        ...(functionNames[f] ? { name: functionNames[f] } : { unrecognized: true }),
        selector: f,
      })
    } else {
      if (!ret.facets[liveFunctions[f]]) {
        ret.unrecognizedFacets++

        ret.facets[liveFunctions[f]] = {
          unrecognized: true,
          address: liveFunctions[f],
          functions: [],
        }
      }

      ret.unrecognizedFunctions++

      ret.facets[liveFunctions[f]].functions.push({
        selector: f,
        unrecognized: true,
      })
    }
  }

  return ret
}

export const getFinalizedFacetCuts = (namedCuts: NamedFacetCut[], facetContracts: Record<string, OnChainContract>): FacetCut[] => {
  return namedCuts.map(({ facetNameOrAddress, action, functionSelectors }) => {
    return {
      facetAddress: facetContracts[facetNameOrAddress] ? facetContracts[facetNameOrAddress].address : facetNameOrAddress,
      action,
      functionSelectors,
    }
  })
}