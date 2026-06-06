// 模拟 electron-builder 打包后 Resources/codegraph（dist 含 node_modules + package.json）
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { createRequire } = require('node:module')

const root = path.join(__dirname, '..')
const distSrc = path.join(root, 'electron/main/codegraph/dist')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-pack-probe-'))
const resourcesCg = path.join(tmp, 'Resources', 'codegraph')

const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name)
    const d = path.join(dst, name)
    if (fs.statSync(s).isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

copyDir(distSrc, resourcesCg)

if (!fs.existsSync(path.join(resourcesCg, 'package.json'))) {
  console.log('FAIL: dist/package.json missing — run codegraph:build')
  process.exit(1)
}
if (!fs.existsSync(path.join(resourcesCg, 'node_modules', 'web-tree-sitter'))) {
  console.log('FAIL: dist/node_modules missing — run codegraph:build')
  process.exit(1)
}

const distRequire = createRequire(path.join(resourcesCg, 'package.json'))
try {
  distRequire('./index.js')
  console.log('PACKAGED PROBE OK')
} catch (e) {
  console.log('PACKAGED PROBE FAIL:', e.message)
  process.exit(1)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
