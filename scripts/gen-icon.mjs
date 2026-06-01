import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'build/icon-source.png')
const icon = path.join(root, 'build/icon.png')
const fav32 = path.join(root, 'public/favicon-32.png')
const favico = path.join(root, 'public/favicon.ico')
const loading = path.join(root, 'public/donkey-loading.png')
const landingMask = path.join(root, 'src/assets/donkey-silhouette-mask.png')
const tmpBase = path.join(root, 'build/.icon-base.png')
const tmpRounded = path.join(root, 'build/.icon-rounded.png')

if (!fs.existsSync(src)) {
  console.error('[gen-icon] 找不到 build/icon-source.png')
  process.exit(1)
}

// 768px 内容 + 圆角矩形（接近 macOS squircle）+ 1024 画布留白
const size = 768
const radius = Math.round(size * 0.224)

execSync(`magick "${src}" -filter Lanczos -resize ${size}x${size} "${tmpBase}"`)
execSync(`magick "${tmpBase}" \\( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}" \\) -alpha off -compose CopyOpacity -composite "${tmpRounded}"`)
execSync(`magick -size 1024x1024 xc:none "${tmpRounded}" -gravity center -composite "${icon}"`)
execSync(`magick "${icon}" -filter Lanczos -resize 32x32 "${fav32}"`)
execSync(`magick "${icon}" -define icon:auto-resize=16,32,48,64,128,256 "${favico}"`)
execSync(`magick "${icon}" -filter Lanczos -resize 96x96 "${loading}"`)
execSync(
  `magick "${src}" \\( +clone -alpha extract \\) -fill white -colorize 100 -compose CopyOpacity -composite -resize 112x112 -background none -gravity center -extent 112x112 "${landingMask}"`,
)

fs.unlinkSync(tmpBase)
fs.unlinkSync(tmpRounded)
console.log('[gen-icon] 图标已生成（圆角 + 留白）')
