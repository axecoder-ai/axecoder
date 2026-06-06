import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(here, 'src')
const distRoot = path.join(here, 'dist')
const rootNm = path.join(here, '../../../node_modules')
const distNm = path.join(distRoot, 'node_modules')

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

// 打包到 Resources/codegraph 后须标记 commonjs，否则根 package.json 的 type:module 会让 require 失败
fs.copyFileSync(path.join(here, 'package.json'), path.join(distRoot, 'package.json'))

// CodeGraph 运行时依赖（含 better-sqlite3 传递依赖），打进 dist/node_modules 随 extraResources 一起发布
const runtimePkgs = [
  'web-tree-sitter',
  'picomatch',
  'ignore',
  'tree-sitter-wasms',
  'better-sqlite3',
  'bindings',
  'file-uri-to-path',
]

if (fs.existsSync(distNm)) fs.rmSync(distNm, { recursive: true, force: true })
fs.mkdirSync(distNm, { recursive: true })

for (const pkg of runtimePkgs) {
  const from = path.join(rootNm, pkg)
  const to = path.join(distNm, pkg)
  if (!fs.existsSync(from)) {
    console.error(`codegraph runtime dep missing: ${pkg}`)
    process.exit(1)
  }
  fs.cpSync(from, to, { recursive: true })
}

console.log('codegraph assets copied to dist/')
