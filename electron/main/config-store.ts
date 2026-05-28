import fs from 'node:fs/promises'
import type { AppConfig } from './models-types'
import { ensureWritcraftDir, writcraftPath } from './writcraft-dir'

const defaults: AppConfig = {
  schemaVersion: 1,
  autoSave: true,
  autoSaveDelay: 400,
  fontSize: 14,
  theme: 'vscode',
}

const configPath = () => writcraftPath('config.json')

const readRaw = async (): Promise<AppConfig | null> => {
  try {
    const raw = await fs.readFile(configPath(), 'utf-8')
    return JSON.parse(raw) as AppConfig
  } catch {
    return null
  }
}

export const getConfig = async (): Promise<AppConfig> => {
  const raw = await readRaw()
  if (!raw) return { ...defaults }
  return {
    schemaVersion: 1,
    autoSave: raw.autoSave ?? defaults.autoSave,
    autoSaveDelay: raw.autoSaveDelay ?? defaults.autoSaveDelay,
    fontSize: raw.fontSize ?? defaults.fontSize,
    theme: raw.theme ?? defaults.theme,
  }
}

export const setConfig = async (partial: Partial<AppConfig>): Promise<AppConfig> => {
  await ensureWritcraftDir()
  const cur = await getConfig()
  const next: AppConfig = {
    schemaVersion: 1,
    autoSave: partial.autoSave ?? cur.autoSave,
    autoSaveDelay: partial.autoSaveDelay ?? cur.autoSaveDelay,
    fontSize: partial.fontSize ?? cur.fontSize,
    theme: partial.theme ?? cur.theme,
  }
  await fs.writeFile(configPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export const writeConfigIfMissing = async (config: AppConfig) => {
  const raw = await readRaw()
  if (raw) return
  await ensureWritcraftDir()
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}
