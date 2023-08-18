import { Contract, Interface, Provider } from "ethers"
import { FacetDefinition } from "./fs.js"
import { ContractArtifact, OnChainContract, getContractAt, getContractAtUsingArtifact, getContractValue } from "./chain.js"
import { error, trace } from "./log.js"
import { FunctionFragment } from "ethers"
import { Signer } from "ethers"

interface FunctionSelector {
  name: string,
  selector: string,
}

const getSelectors = (artifact: ContractArtifact): FunctionSelector[] => {
  const selectors: FunctionSelector[] = []

  const names = artifact.abi.filter(f => f.type === 'function').map(f => (f as FunctionFragment).name)

  const iface = new Interface(artifact.abi)

  names.forEach(fName => {
    selectors.push({
      name: fName,
      selector: iface.getFunction(fName)!.selector,
    })
  })

  return selectors
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


export interface Upgrade {
  namedCuts: NamedFacetCut[],
  facetsToDeploy: string[],
}

export const resolveUpgrade = async (
  artifacts: Record<string, ContractArtifact>, 
  diamondProxy: OnChainContract,
  signer: Signer,
): Promise<Upgrade> => {
  // get what's on-chain
  trace('Resolving methods on-chain ...')
  const facets = await getContractValue(diamondProxy, 'facets', [])
  const liveFunctions: Record<string, string> = {}
  facets.forEach((v: any) => {
    v[1].forEach((f: string) => {
      liveFunctions[f] = v[0]
    })
  })

  // get what's in artifacts
  trace('Resolving methods in artifacts ...')
  const newFunctions: Record<string, string> = {}
  const functionNames: Record<string, string> = {}
  Object.keys(artifacts).forEach((k: string) => {
    const artifact = artifacts[k]
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
      const artifact = artifacts[newFunctions[f]]
      const newBytecode = artifact.deployedBytecode
      const liveContract = await getContractAtUsingArtifact(
        artifact, 
        signer, 
        liveFunctions[f]
      )
      const liveBytecode = await liveContract.contract.getDeployedCode()

      if (liveBytecode !== newBytecode) {
        trace(`[Replace] method ${functionNames[f]} [${f}] by deploying new facet ${newFunctions[f]}`)

        facetsToDeploy[newFunctions[f]] = true
        todo.replace[newFunctions[f]] = todo.replace[newFunctions[f]] || []
        todo.replace[newFunctions[f]].push(f)
      }
    }
  }

  // resolve removals
  // TODO: how do we stop it removing functions from base facets (loupe, cut, etc)???
  // for (let f in liveFunctions) {
  //   if (!newFunctions[f]) {
  //     trace(`[Remove] method ${f} currently in facet ${liveFunctions[f]}`)
  //     todo.remove[liveFunctions[f]] = todo.remove[liveFunctions[f]] || []
  //     todo.remove[liveFunctions[f]].push(f)
  //   }
  // }

  const namedCuts: NamedFacetCut[] = []
  const _createNamedCuts = (src: Record<string, string[]>, action: FacetCutAction) => {
    Object.keys(src).forEach(facetName => {
      namedCuts.push({
        facetNameOrAddress: facetName,
        action,
        functionSelectors: src[facetName],
      })
    })
  }
  _createNamedCuts(todo.add, FacetCutAction.Add)
  _createNamedCuts(todo.replace, FacetCutAction.Replace)
  _createNamedCuts(todo.remove, FacetCutAction.Remove)

  return {
    namedCuts,
    facetsToDeploy: Object.keys(facetsToDeploy),
  }
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