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
  execSync('node scripts/gen-claude-icon.mjs', { stdio: 'inherit', cwd: root })
  iconPath = path.join(root, 'build/.claude-icon.png')
  console.log('[build] 非发布打包，图标: claudelogo.png')
}

const iconArg = path.relative(root, iconPath)
execSync(`npx electron-builder --config.icon=${iconArg} --config.win.icon=${iconArg}`, {
  stdio: 'inherit',
  cwd: root,
})
