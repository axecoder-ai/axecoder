import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(here, 'src')
const distRoot = path.join(here, 'dist')

fs.mkdirSync(path.join(distRoot, 'db'), { recursive: true })
fs.copyFileSync(path.join(srcRoot, 'db', 'schema.sql'), path.join(distRoot, 'db', 'schema.sql'))

const wasmSrc = path.join(srcRoot, 'extraction', 'wasm')
const wasmDst = path.join(distRoot, 'extraction', 'wasm')
fs.mkdirSync(wasmDst, { recursive: true })
for (const f of fs.readdirSync(wasmSrc)) {
  if (f.endsWith('.wasm')) {
    fs.copyFileSync(path.join(wasmSrc, f), path.join(wasmDst, f))
  }
}

console.log('codegraph assets copied to dist/')
