import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let dirOverride: string | null = null

const legacyHomeDirs = () => [
  path.join(os.homedir(), '.axecoder'),
  path.join(os.homedir(), '.writcraft'),
]

export const setAxecoderDirForTests = (dir: string | null) => {
  dirOverride = dir
}

export const getAxecoderDir = () => dirOverride ?? path.join(os.homedir(), '.aex-coder')

const migrateLegacyHomeDir = async () => {
  if (dirOverride) return
  const dir = getAxecoderDir()
  try {
    const entries = await fs.readdir(dir)
    if (entries.length > 0) return
  } catch {
    /* 目录不存在，继续尝试从旧目录复制 */
  }
  for (const legacy of legacyHomeDirs()) {
    if (legacy === dir) continue
    try {
      await fs.access(legacy)
      await fs.cp(legacy, dir, { recursive: true })
      return
    } catch {
      /* 尝试下一个旧目录 */
    }
  }
}

export const ensureAxecoderDir = async () => {
  await migrateLegacyHomeDir()
  await fs.mkdir(getAxecoderDir(), { recursive: true })
}

export const axecoderPath = (name: string) => path.join(getAxecoderDir(), name)
