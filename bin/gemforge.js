#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// find argument string
const index = process.argv.findIndex((arg) => arg === __filename)
const args = process.argv.slice(index + 1)

// Say our original entrance script is `app.js`
const cmd = `node --no-warnings ${resolve(__dirname, "../build/cli.js")}`
spawnSync(cmd, args, { stdio: "inherit", shell: true })