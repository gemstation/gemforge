import { Contract } from "ethers"
import { FacetDefinition } from "./fs.js"
import { ContractArtifact, OnChainContract } from "./chain.js"
import { error } from "./log.js"

export enum FacetCutAction { 
  Add = 0, 
  Replace = 1,
  Remove = 2,
}

export interface NamedFacetCut {
  facetName: string,
  action: FacetCutAction,
  functionSelectors: string[]
}

export interface FacetCut {
  facetAddress: string,
  action: FacetCutAction,
  functionSelectors: string[]
}

const getSelectors = (def: FacetDefinition, contract: OnChainContract) => {
  const selectors: string[] = []

  const { interface: iface } = contract.contract

  def.functions.forEach(({ name: fName }) => {
    const frag = iface.getFunction(fName)
    if (!frag) {
      error(`Function ${fName} not found in contract ${contract.name}`)
    }
    selectors.push(frag!.selector)
  })

  return selectors
}

const getFacetCuts = async (defs: Record<string, FacetDefinition>, facetContracts: Record<string, OnChainContract>, diamondProxy: OnChainContract) => {
  const cut = []

  const names = Object.keys(defs)

  for (let name of names) {
    cut.push({
      facetAddress: await facetContracts[name].address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(defs[name], facetContracts[name])
    })
  }

  return cut
}

export interface Upgrade {
  namedCuts: NamedFacetCut[],
  facetsToDeploy: string[],
}

export const resolveUpgrade = async (defs: Record<string, FacetDefinition>, facetArtifacts: Record<string, ContractArtifact>, diamondProxy: OnChainContract): Promise<Upgrade> => {  
  return {
    namedCuts: [],
    facetsToDeploy: [],
  }
}


export const getFinalizedFacetCuts = (namedCuts: NamedFacetCut[], facetContracts: Record<string, OnChainContract>): FacetCut[] => {
  return namedCuts.map(({ facetName, action, functionSelectors }) => {
    return {
      facetAddress: facetContracts[facetName].address,
      action,
      functionSelectors,
    }
  })
}