import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let dirOverride: string | null = null

export const setWritcraftDirForTests = (dir: string | null) => {
  dirOverride = dir
}

export const getWritcraftDir = () => dirOverride ?? path.join(os.homedir(), '.writcraft')

export const ensureWritcraftDir = async () => {
  await fs.mkdir(getWritcraftDir(), { recursive: true })
}

export const writcraftPath = (name: string) => path.join(getWritcraftDir(), name)
