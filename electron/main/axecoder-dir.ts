import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let dirOverride: string | null = null

/** 旧版全局配置目录（按优先级尝试合并到 ~/.axecoder） */
const legacyHomeDirs = () => [
  path.join(os.homedir(), '.aex-coder'),
  path.join(os.homedir(), '.writcraft'),
]

export const setAxecoderDirForTests = (dir: string | null) => {
  dirOverride = dir
}

export const getAxecoderDir = () => dirOverride ?? path.join(os.homedir(), '.axecoder')

const dirIsEmpty = async (dir: string): Promise<boolean> => {
  try {
    const entries = await fs.readdir(dir)
    return entries.length === 0
  } catch {
    return true
  }
}

/** 将 legacy 中较新或目标缺失的文件并入 target */
const mergeDirInto = async (legacy: string, target: string) => {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(legacy, { withFileTypes: true })
  } catch {
    return
  }
  await fs.mkdir(target, { recursive: true })
  for (const ent of entries) {
    const src = path.join(legacy, ent.name)
    const dst = path.join(target, ent.name)
    if (ent.isDirectory()) {
      await mergeDirInto(src, dst)
      continue
    }
    try {
      const [sStat, dStat] = await Promise.all([fs.stat(src), fs.stat(dst)])
      if (sStat.mtimeMs <= dStat.mtimeMs) continue
      await fs.copyFile(src, dst)
    } catch {
      await fs.copyFile(src, dst)
    }
  }
}

const migrateLegacyHomeDir = async () => {
  if (dirOverride) return
  const dir = getAxecoderDir()
  await fs.mkdir(dir, { recursive: true })

  if (await dirIsEmpty(dir)) {
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
    return
  }

  for (const legacy of legacyHomeDirs()) {
    if (legacy === dir) continue
    await mergeDirInto(legacy, dir)
  }
}

export const ensureAxecoderDir = async () => {
  await migrateLegacyHomeDir()
  await fs.mkdir(getAxecoderDir(), { recursive: true })
}

export const axecoderPath = (name: string) => path.join(getAxecoderDir(), name)
