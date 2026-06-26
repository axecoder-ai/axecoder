import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// 有没有发布参数
let publish = false
if (process.env.PUBLISH === '1') publish = true
if (process.argv.includes('--publish')) publish = true

let iconPath = ''
if (publish) {
  iconPath = path.join(root, 'build/icon.png')
  console.log('[build] 发布模式，图标: build/icon.png')
} else {
  const src = path.join(root, 'claudelogo.png')
  const out = path.join(root, 'build/.claude-icon.png')
  if (!fs.existsSync(src)) {
    console.error('[build] 找不到 claudelogo.png')
    process.exit(1)
  }
  const tmpBase = path.join(root, 'build/.claude-icon-base.png')
  const size = 768
  execSync(`magick "${src}" -filter Lanczos -resize ${size}x${size} "${tmpBase}"`)
  execSync(
    `magick -size 1024x1024 xc:none "${tmpBase}" -gravity center -composite "${out}"`,
  )
  fs.unlinkSync(tmpBase)
  iconPath = out
  console.log('[build] 非发布打包，图标: claudelogo.png')
}

const iconArg = path.relative(root, iconPath)
execSync(`npx electron-builder --config.icon=${iconArg} --config.win.icon=${iconArg}`, {
  stdio: 'inherit',
  cwd: root,
})
