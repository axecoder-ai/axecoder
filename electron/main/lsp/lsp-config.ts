import fs from 'node:fs/promises'
import path from 'node:path'
import { axecoderPath, ensureAxecoderDir } from '../axecoder-dir'
import { discoverExtensionServers } from './lsp-extension-discovery'
import type { LspConfigFile, ScopedLspServerConfig } from './types'

const parseJson = (raw: string): LspConfigFile | null => {
  try {
    const data = JSON.parse(raw) as { servers?: Record<string, ScopedLspServerConfig> }
    if (!data.servers || typeof data.servers !== 'object') return null
    return { servers: data.servers }
  } catch {
    return null
  }
}

const mergeServers = (
  target: Record<string, ScopedLspServerConfig>,
  source: Record<string, ScopedLspServerConfig>,
) => {
  for (const [name, cfg] of Object.entries(source)) {
    target[name] = cfg
  }
}

export const loadLspConfig = async (projectRoot: string): Promise<LspConfigFile> => {
  const merged: Record<string, ScopedLspServerConfig> = {}

  const discovered = await discoverExtensionServers()
  mergeServers(merged, discovered)

  await ensureAxecoderDir()
  const userPath = axecoderPath('lsp.json')
  try {
    const userRaw = await fs.readFile(userPath, 'utf-8')
    const userCfg = parseJson(userRaw)
    if (userCfg) mergeServers(merged, userCfg.servers)
  } catch {
    /* no user config */
  }

  const projectPath = path.join(projectRoot, '.axecoder', 'lsp.json')
  try {
    const projRaw = await fs.readFile(projectPath, 'utf-8')
    const projCfg = parseJson(projRaw)
    if (projCfg) mergeServers(merged, projCfg.servers)
  } catch {
    /* no project config */
  }

  return { servers: merged }
}
