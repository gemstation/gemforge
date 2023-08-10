import { URL } from 'node:url'
import { readFileSync } from 'node:fs'

export const loadJson = (file: string | URL): object => {
  try {
    return JSON.parse(readFileSync(file).toString('utf-8'))
  } catch (err: any) {
    throw new Error(`Failed to load JSON file ${file}: ${err.message}`)
  }
}
