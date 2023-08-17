import { glob } from 'glob'
import path from 'node:path'
import { ethers } from 'ethers'
import { error, trace } from './log.js'
import { Context } from './context.js'
import parser from '@solidity-parser/parser'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type {
  ContractDefinition,
  FunctionDefinition,
  VariableDeclaration,
  TypeName,
  ElementaryTypeName,
  ArrayTypeName,
  UserDefinedTypeName,
  NumberLiteral,
} from '@solidity-parser/parser/dist/src/ast-types.d.ts'

export const loadJson = (file: string | URL): object => {
  try {
    trace(`Loading JSON file: ${file}`)
    return JSON.parse(readFileSync(file).toString('utf-8'))
  } catch (err: any) {
    return error(`Failed to load JSON file ${file}: ${err.message}`)
  }
}

export const fileExists = (file: string) => {
  trace(`Checking if file exists: ${file}`)
  return existsSync(file)
}

export const writeTemplate = (file: string, dst: string, replacements: Record<string, string> = {}) => {
  let str = readFileSync(new URL(`../../templates/${file}`, import.meta.url), 'utf-8')
  Object.keys(replacements).forEach(key => {
    str = str.replaceAll(key, replacements[key])
  })
  trace(`Writing template to ${dst}`)
  writeFileSync(dst, str, {
    encoding: 'utf-8',
    flag: 'w'
  })
}

export const writeFile = (dst: string, content: string) => {
  trace(`Writing ${dst}`)
  writeFileSync(dst, content, {
    encoding: 'utf-8',
    flag: 'w'
  })
}

export interface FacetDefinition {
  file: string,
  contractName: string,
  functions: {
    name: string,
    hash: string,
    signature: string,
  }[],
}

export const getFacetsAndFunctions = (ctx: Context): FacetDefinition[] => {
  if (ctx.config.facets.publicMethods) {
    trace('Including public methods in facet cuts')
  }

  // load facets
  const facetFiles = glob.sync(ctx.config.paths.facets, { cwd: ctx.folder })

  const ret: FacetDefinition[] = []
  const contractNames: Record<string, boolean> = {}
  const functionSigs: Record<string, boolean> = {}

  // get definitions
  facetFiles.forEach(file => {
    const ast = parser.parse(readFileSync(path.join(ctx.folder, file), 'utf-8'), {
      loc: true,
      tolerant: true,
    })

    const contractDefinitions = ast.children.filter(node => node.type === 'ContractDefinition') as ContractDefinition[]

    contractDefinitions.forEach(contract => {
      if (contractNames[contract.name]) {
        error(`Duplicate contract name found in ${file}: ${contract.name}`)
      } else {
        contractNames[contract.name] = true
      }

      let functionDefinitions = contract.subNodes.filter(
        node => node.type === 'FunctionDefinition'
      ) as FunctionDefinition[]

      functionDefinitions = functionDefinitions
        .filter(node => !node.isConstructor && !node.isFallback && !node.isReceiveEther)
        .filter(
          node => node.visibility === 'external' || (ctx.config.facets.publicMethods && node.visibility === 'public')
        )

      // export declare type TypeName = ElementaryTypeName | UserDefinedTypeName | ArrayTypeName;

      const functions = functionDefinitions.map(node => {
        let signature = `function ${node.name}(${getParamString(node.parameters)}) ${node.visibility}${
          node.stateMutability ? ` ${node.stateMutability}` : ''
        }`

        if (node.returnParameters?.length) {
          signature += ` returns (${getParamString(node.returnParameters)})`
        }

        const r = {
          name: node.name!,
          signature,
          hash: getFunctionHash(node.name!, node.parameters),
        }

        if (functionSigs[r.hash]) {
          error(`Duplicate function found in ${file}: ${signature}`)
        } else {
          functionSigs[r.hash] = true
        }

        return r
      })

      ret.push({
        file,
        contractName: contract.name,
        functions,
      })
    })
  })

  return ret
}


const getFunctionHash = (name: string, params: VariableDeclaration[]): string => {
  const p: string[] = []

  params.map(param => {
    p.push(_getTypeNameString(param.typeName!))
  })
4
  return ethers.id(`${name}(${p.join(',')})`).substring(0, 10)
}


const getParamString = (params: VariableDeclaration[]): string => {
  const p: string[] = []

  params.map(param => {
    const name = param.name ? ` ${param.name}` : ''
    const storage = param.storageLocation ? ` ${param.storageLocation}`: ''
    const typeNameString = _getTypeNameString(param.typeName!)
    p.push(`${typeNameString}${storage}${name}`)
  })

  return p.join(', ')
}


const _getTypeNameString = (typeName: TypeName): string => {
  switch (typeName.type) {
    case 'ElementaryTypeName': {
      const t = typeName as ElementaryTypeName
      return t.name
    }
    case 'UserDefinedTypeName': {
      const t = typeName as UserDefinedTypeName
      return t.namePath
    }
    case 'ArrayTypeName': {
      const t = typeName as ArrayTypeName
      const innerType = _getTypeNameString(t.baseTypeName as TypeName)
      const lenStr = t.length ? `[${(t.length as NumberLiteral).number}]` : '[]'
      return `${innerType}${lenStr}`
    }
    default: {
      return ''
    }
  }
}