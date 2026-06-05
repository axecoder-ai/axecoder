// 在 Electron 主进程 Node 环境里探测 CodeGraph 是否可用
const path = require('node:path')
const fs = require('node:fs')

const root = path.join(__dirname, '..')
process.env.APP_ROOT = root

const distCandidates = [
  path.join(root, 'electron/main/codegraph/dist'),
  path.join(process.resourcesPath || '', 'codegraph'),
]

let distRoot = null
for (const d of distCandidates) {
  if (fs.existsSync(path.join(d, 'index.js'))) {
    distRoot = d
    break
  }
}

console.log('distRoot', distRoot)

try {
  require('node:sqlite')
  console.log('node:sqlite: yes')
} catch {
  console.log('node:sqlite: no')
}

try {
  require('better-sqlite3')
  console.log('better-sqlite3: yes')
} catch (e) {
  console.log('better-sqlite3: no', e.message)
}

if (!distRoot) {
  console.log('FAIL: codegraph dist missing')
  process.exit(1)
}

const CodeGraph = require(path.join(distRoot, 'index.js')).default
console.log('CodeGraph loaded')

const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cg-probe-'))
;(async () => {
  try {
    fs.writeFileSync(path.join(tmp, 'a.ts'), 'export function foo() { return 1 }\n')
    const cg = await CodeGraph.init(tmp, { index: true })
    const r = cg.searchNodes('foo')
    console.log('index+search ok', r.length, 'hits')
    cg.close()
    fs.rmSync(tmp, { recursive: true, force: true })
    console.log('PROBE OK')
  } catch (e) {
    console.error('PROBE FAIL', e.message)
    process.exit(1)
  }
})()
