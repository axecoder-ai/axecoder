import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'claudelogo.png')
const out = path.join(root, 'build/.claude-icon.png')
const tmpBase = path.join(root, 'build/.claude-icon-base.png')
const tmpRounded = path.join(root, 'build/.claude-icon-rounded.png')

if (!fs.existsSync(src)) {
  console.error('[gen-claude-icon] 找不到 claudelogo.png')
  process.exit(1)
}

const size = 800
const radius = Math.round(size * 0.224)

execSync(`magick "${src}" -filter Lanczos -resize ${size}x${size} "${tmpBase}"`)
execSync(
  `magick "${tmpBase}" \\( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}" \\) -alpha off -compose CopyOpacity -composite "${tmpRounded}"`,
)
execSync(`magick -size 1024x1024 xc:none "${tmpRounded}" -gravity center -composite "${out}"`)

fs.unlinkSync(tmpBase)
fs.unlinkSync(tmpRounded)
console.log('[gen-claude-icon] 开发应用图标已生成（claudelogo）')
