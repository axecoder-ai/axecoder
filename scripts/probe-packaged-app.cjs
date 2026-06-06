// 在已打包的 AxeCoder.app 内探测 CodeGraph 能否加载并建索引
const path = require('node:path')
const fs = require('node:fs')
const { createRequire } = require('node:module')

const appRoot = process.argv[2]
if (!appRoot) {
  console.log('usage: ELECTRON_RUN_AS_NODE=1 AxeCoder.app/Contents/MacOS/AxeCoder probe-packaged-app.cjs <path-to-AxeCoder.app>')
  process.exit(1)
}

const resources = path.join(appRoot, 'Contents/Resources')
const codegraphDir = path.join(resources, 'codegraph')

console.log('codegraph/index.js:', fs.existsSync(path.join(codegraphDir, 'index.js')))
console.log('codegraph/package.json:', fs.existsSync(path.join(codegraphDir, 'package.json')))
const nm = path.join(codegraphDir, 'node_modules')
console.log('codegraph/node_modules:', fs.existsSync(nm) ? fs.readdirSync(nm).join(', ') : '(missing)')

if (!fs.existsSync(path.join(codegraphDir, 'package.json'))) {
  console.log('FAIL: Resources/codegraph 缺少 package.json（type:commonjs）')
  process.exit(1)
}

const distRequire = createRequire(path.join(codegraphDir, 'package.json'))

try {
  distRequire('./index.js')
  console.log('require index.js OK')
} catch (e) {
  console.log('require index.js FAIL:', e.message)
  process.exit(1)
}

;(async () => {
  try {
    const os = require('node:os')
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-app-probe-'))
    fs.writeFileSync(path.join(tmp, 'a.ts'), 'export function foo() { return 1 }\n')
    const CodeGraph = distRequire('./index.js').default
    const cg = await CodeGraph.init(tmp, { index: true })
    const hits = cg.searchNodes('foo')
    console.log('init+search OK', hits.length, 'hits')
    cg.close()
    fs.rmSync(tmp, { recursive: true, force: true })
    console.log('PACKAGED APP PROBE OK')
  } catch (e) {
    console.error('PACKAGED APP PROBE FAIL', e.message)
    process.exit(1)
  }
})()
