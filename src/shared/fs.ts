import get from 'lodash.get'
import { SyncOptions, execaCommandSync } from 'execa'
import { tmpNameSync } from 'tmp'
import { glob } from 'glob'
import path from 'node:path'
import { ethers } from 'ethers'
import { error, info, trace, warn } from './log.js'
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

interface CommandOptions {
  cwd?: string,
  quiet?: boolean,
  env?: {
    [key: string]: string | undefined
  }
}

export const $ = (opts?: CommandOptions) => async (strings: TemplateStringsArray, ...values: any[]) => {
  const cmd = String.raw({ raw: strings }, ...values)
  trace(`> ${cmd}`)
  return execaCommandSync(cmd, {
    stdio: (opts?.quiet) ? 'pipe' : 'inherit',
    cwd: opts?.cwd,
    env: opts?.env,
  })
}


export const ensureGeneratedFolderExists = async (folderPath: string) => {
  await $()`mkdir -p ${folderPath}`
  writeFile(`${folderPath}/.gitignore`, `*.json\n*.sol\n*.log`)
}


export const ensureFolderExistsAndIsEmpty = async (folderPath: string) => {
  await $()`mkdir -p ${folderPath}`

  const files = glob.sync(`${folderPath}/*`)
  if (files.length) {
    error(`Folder is not empty: ${folderPath}`)
  }
}


export const captureErrorAndExit = (err: any, msg: string) => {
  const logFilePath = tmpNameSync({
    prefix: 'gemforge-error-',
    postfix: '.log',
   }) as string

   writeFileSync(logFilePath, err.stack, {
    encoding: 'utf-8',
    flag: 'w'
  })

  error(`${msg}. A full log of the error has been written to ${logFilePath}`)
}


export const saveJson = (file: string, data: object) => {
  trace(`Saving JSON file: ${file}`)
  writeFileSync(file, JSON.stringify(data, null, 2), {
    encoding: 'utf-8',
    flag: 'w'
  })
}

export const loadJson = (file: string | URL): object => {
  trace(`Loading JSON file: ${file}`)
  return JSON.parse(readFileSync(file).toString('utf-8'))
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
    signature: string,
    signaturePacked: string,
  }[],
}

interface ParserMeta {
  userDefinedTypes: string[],
}


export const getUserFacetsAndFunctions = (ctx: Context): FacetDefinition[] => {
  if (ctx.config.diamond.publicMethods) {
    trace('Including public methods in facet cuts')
  }

  const ret: FacetDefinition[] = []
  const contractNames: Record<string, boolean> = {}
  const functionSigs: Record<string, boolean> = {}
  const parserMeta: ParserMeta = { userDefinedTypes: [] }

  // load user facets
  const facetFiles = glob.sync(ctx.config.paths.src.facets, { cwd: ctx.folder })
  facetFiles.forEach(file => {
    const ast = parser.parse(readFileSync(path.join(ctx.folder, file), 'utf-8'), {
      loc: true,
      tolerant: true,
    })

    const contractDefinitions = ast.children.filter(node => node.type === 'ContractDefinition') as ContractDefinition[]

    contractDefinitions.forEach(contract => {
      if (contractNames[contract.name]) {
        error(`Duplicate contract name found in ${file}: ${contract.name}`)
      } else if (ctx.config.diamond.coreFacets.includes(contract.name)) {
        error(`Core facet contract name used in ${file}: ${contract.name}`)
      } else {
        contractNames[contract.name] = true
      }

      let functionDefinitions = contract.subNodes.filter(
        node => node.type === 'FunctionDefinition'
      ) as FunctionDefinition[]

      functionDefinitions = functionDefinitions
        .filter(node => !node.isConstructor && !node.isFallback && !node.isReceiveEther)
        .filter(
          node => node.visibility === 'external' || (ctx.config.diamond.publicMethods && node.visibility === 'public')
        )

      // export declare type TypeName = ElementaryTypeName | UserDefinedTypeName | ArrayTypeName;

      const functions = functionDefinitions.map(node => {
        let signature = `function ${node.name}(${getParamString(node.parameters, parserMeta)}) ${node.visibility}${
          node.stateMutability ? ` ${node.stateMutability}` : ''
        }`

        if (node.returnParameters?.length) {
          signature += ` returns (${getParamString(node.returnParameters, parserMeta)})`
        }

        let signaturePacked = `${node.name}(${getPackedParamString(node.parameters, parserMeta)})`

        const r = {
          name: node.name!,
          signature,
          signaturePacked,
        }

        if (functionSigs[r.signaturePacked]) {
          error(`Duplicate function found in ${file}: ${signature}`)
        } else {
          functionSigs[r.signaturePacked] = true
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

  if (parserMeta.userDefinedTypes.length) {
    info(`Custom structs found in facet method signatures: ${parserMeta.userDefinedTypes.join(', ')}`)
    info(`Please ensure your gemforge config is setup properly to handle this, see https://gemforge.xyz/advanced/custom-structs/.`)
  }

  // sort alphabetically
  ret.sort((a, b) => a.contractName.localeCompare(b.contractName))

  return ret
}



const getParamString = (params: VariableDeclaration[], meta: ParserMeta): string => {
  const p: string[] = []

  params.map(param => {
    const name = param.name ? ` ${param.name}` : ''
    const storage = param.storageLocation ? ` ${param.storageLocation}`: ''
    const typeNameString = _getTypeNameString(param.typeName!, meta)
    p.push(`${typeNameString}${storage}${name}`)
  })

  return p.join(', ')
}


const getPackedParamString = (params: VariableDeclaration[], meta: ParserMeta): string => {
  const p: string[] = []

  params.map(param => {
    const typeNameString = _getTypeNameString(param.typeName!, meta)
    p.push(`${typeNameString}`)
  })

  return p.join(',')
}


const _getTypeNameString = (typeName: TypeName, meta: ParserMeta): string => {
  switch (typeName.type) {
    case 'ElementaryTypeName': {
      const t = typeName as ElementaryTypeName
      return t.name
    }
    case 'UserDefinedTypeName': {
      const t = typeName as UserDefinedTypeName
      meta.userDefinedTypes.push(t.namePath)
      return t.namePath
    }
    case 'ArrayTypeName': {
      const t = typeName as ArrayTypeName
      const innerType = _getTypeNameString(t.baseTypeName as TypeName, meta)
      const lenStr = t.length ? `[${(t.length as NumberLiteral).number}]` : '[]'
      return `${innerType}${lenStr}`
    }
    default: {
      return ''
    }
  }
}