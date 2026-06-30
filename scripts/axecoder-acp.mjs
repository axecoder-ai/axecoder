#!/usr/bin/env node
/**
 * npm bin 包装：优先用 electron --run-as-node，否则 node。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const entry = path.join(here, '../dist-electron/main/acp-cli.js')

if (!fs.existsSync(entry)) {
  process.stderr.write(
    `axecoder-acp: build artifact missing at ${entry}\nRun: npm run build (or dev once) first.\n`,
  )
  process.exit(1)
}

const electronBin = path.join(here, '../node_modules/electron/cli.js')
const useElectron = fs.existsSync(electronBin)
const cmd = useElectron ? process.execPath : process.argv[0]
const args = useElectron
  ? [electronBin, entry, ...process.argv.slice(2)]
  : [entry, ...process.argv.slice(2)]

const env = useElectron ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : process.env
const child = spawn(cmd, args, { stdio: 'inherit', env })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
