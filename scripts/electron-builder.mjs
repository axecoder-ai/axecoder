import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// 项目名，默认 AxeCoder（package.json build.productName）
let productName = pkg.build?.productName || 'AxeCoder'
// npm run build --name=xxx 会注入 npm_config_name
if (process.env.npm_config_name) productName = process.env.npm_config_name
// npm run build -- --name xxx
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--name' && argv[i + 1]) {
    productName = argv[i + 1]
    i++
  } else if (a.startsWith('--name=')) {
    productName = a.slice('--name='.length)
  }
}

// 有没有发布参数
let publish = false
if (process.env.PUBLISH === '1') publish = true
if (argv.includes('--publish')) publish = true

let iconPath = ''
if (publish) {
  iconPath = path.join(root, 'build/icon.png')
  console.log('[build] 发布模式，图标: build/icon.png')
} else {
  execSync('node scripts/gen-claude-icon.mjs', { stdio: 'inherit', cwd: root })
  iconPath = path.join(root, 'build/.claude-icon.png')
  console.log('[build] 非发布打包，图标: claudelogo.png')
}

console.log('[build] 项目名 productName:', productName)

const iconArg = path.relative(root, iconPath)
const safeName = productName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
execSync(
  `npx electron-builder --config.icon=${iconArg} --config.win.icon=${iconArg} --config.productName="${safeName}"`,
  {
    stdio: 'inherit',
    cwd: root,
  },
)
