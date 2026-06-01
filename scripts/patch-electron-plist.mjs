import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const name = 'AxeCoder'

if (process.platform !== 'darwin') {
  console.log('[patch-electron] 非 macOS，跳过')
  process.exit(0)
}

const plist = path.join(root, 'node_modules/electron/dist/Electron.app/Contents/Info.plist')
if (!fs.existsSync(plist)) {
  console.log('[patch-electron] 找不到 Electron.app，跳过')
  process.exit(0)
}

execSync(`plutil -replace CFBundleName -string "${name}" "${plist}"`)
execSync(`plutil -replace CFBundleDisplayName -string "${name}" "${plist}"`)
console.log(`[patch-electron] 菜单栏名称已改为 ${name}`)
