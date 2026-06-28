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

const devIcon = path.join(root, 'build/.claude-icon.png')
const electronIcns = path.join(root, 'node_modules/electron/dist/Electron.app/Contents/Resources/electron.icns')
const tmpIcns = path.join(root, 'build/.dev-electron.icns')

if (fs.existsSync(devIcon) && fs.existsSync(electronIcns)) {
  execSync(`magick "${devIcon}" -define icon:auto-resize=16,32,64,128,256,512 "${tmpIcns}"`)
  fs.copyFileSync(tmpIcns, electronIcns)
  fs.unlinkSync(tmpIcns)
  console.log('[patch-electron] Electron.app 图标已改为 claudelogo')
} else {
  console.log('[patch-electron] 跳过图标替换（缺少 .claude-icon.png 或 electron.icns）')
}
