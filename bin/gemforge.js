#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// find argument string
const index = process.argv.findIndex((arg) => arg.endsWith('bin/gemforge.js'))
const args = [
  '--no-warnings',
  resolve(__dirname, "../build/gemforge.js"),
].concat(process.argv.slice(index + 1))

spawnSync(process.argv[0], args, { stdio: "inherit", shell: true })