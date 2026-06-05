// 模拟 Vite 打包后主进程 require 路径
const path = require('node:path')
const { createRequire } = require('node:module')

const mainBundle = path.join(__dirname, '../dist-electron/main/index.js')
const req = createRequire(mainBundle)

try {
  req('better-sqlite3')
  console.log('from dist-electron/main: better-sqlite3 OK')
} catch (e) {
  console.log('from dist-electron/main: better-sqlite3 FAIL', e.message)
}

process.env.APP_ROOT = path.join(__dirname, '..')
const dist = path.join(process.env.APP_ROOT, 'electron/main/codegraph/dist')
try {
  req(path.join(dist, 'index.js'))
  console.log('from dist-electron/main: codegraph dist OK')
} catch (e) {
  console.log('from dist-electron/main: codegraph dist FAIL', e.message)
}
