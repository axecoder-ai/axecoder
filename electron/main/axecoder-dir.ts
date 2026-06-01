import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let dirOverride: string | null = null

const legacyHomeDir = () => path.join(os.homedir(), '.writcraft')

export const setAxecoderDirForTests = (dir: string | null) => {
  dirOverride = dir
}

export const getAxecoderDir = () => dirOverride ?? path.join(os.homedir(), '.axecoder')

const migrateLegacyHomeDir = async () => {
  if (dirOverride) return
  const dir = getAxecoderDir()
  try {
    const entries = await fs.readdir(dir)
    if (entries.length > 0) return
  } catch {
    /* 目录不存在，继续尝试从旧目录复制 */
  }
  try {
    await fs.access(legacyHomeDir())
    await fs.cp(legacyHomeDir(), dir, { recursive: true })
  } catch {
    /* 无旧配置 */
  }
}

export const ensureAxecoderDir = async () => {
  await migrateLegacyHomeDir()
  await fs.mkdir(getAxecoderDir(), { recursive: true })
}

export const axecoderPath = (name: string) => path.join(getAxecoderDir(), name)
