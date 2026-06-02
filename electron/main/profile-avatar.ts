import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureAxecoderDir, axecoderPath } from './axecoder-dir'

const PROFILE_DIR = 'profile-avatars'
const PROFILE_BASE = 'profile'

/** 将用户选择的图片复制到 ~/.axecoder/profile-avatars/，返回相对路径 */
export const copyProfileAvatarFrom = async (srcPath: string): Promise<string> => {
  await ensureAxecoderDir()
  await fs.mkdir(axecoderPath(PROFILE_DIR), { recursive: true })
  const ext = path.extname(srcPath).toLowerCase() || '.png'
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  const safeExt = allowed.includes(ext) ? ext : '.png'
  const rel = path.join(PROFILE_DIR, `${PROFILE_BASE}${safeExt}`)
  await fs.copyFile(srcPath, axecoderPath(rel))
  return rel
}
