import fs from 'node:fs/promises'
import path from 'node:path'
import type { AppConfig } from './models-types'
import { ensureAxecoderDir, getAxecoderDir } from './axecoder-dir'
import { writeConfigIfMissing } from './config-store'
import { listModels, writeModelsIfMissing } from './models-store'
import { setSecret } from './secrets-store'

export type LegacyAi = {
  aiEndpoint: string
  aiModel: string
  aiApiKey: string
}

export type MigrateOptions = {
  legacyAi?: LegacyAi
  legacyConfig?: Partial<AppConfig>
  legacyChatPath?: string
}

export const runMigrate = async (opts: MigrateOptions = {}) => {
  await ensureAxecoderDir()
  const existing = await listModels()
  const modelsPath = path.join(getAxecoderDir(), 'models.json')
  let hasModelsFile = false
  try {
    await fs.access(modelsPath)
    hasModelsFile = true
  } catch {
    hasModelsFile = false
  }

  if (!hasModelsFile && opts.legacyAi) {
    const { aiEndpoint, aiModel, aiApiKey } = opts.legacyAi
    if (aiEndpoint?.trim() && aiModel?.trim() && aiApiKey?.trim()) {
      const id = `migrated-${Date.now()}`
      const data = {
        schemaVersion: 1 as const,
        activeModelId: id,
        models: [
          {
            id,
            name: aiModel.trim(),
            provider: 'openai' as const,
            modelId: aiModel.trim(),
            baseUrl: aiEndpoint.trim().replace(/\/+$/, ''),
            enabled: true,
          },
        ],
      }
      await writeModelsIfMissing(data)
      await setSecret(id, aiApiKey.trim())
    }
  }

  if (opts.legacyConfig) {
    await writeConfigIfMissing({
      schemaVersion: 1,
      autoSave: opts.legacyConfig.autoSave ?? true,
      autoSaveDelay: opts.legacyConfig.autoSaveDelay ?? 400,
      fontSize: opts.legacyConfig.fontSize ?? 14,
      theme: 'vscode',
      agentAutoApplyWrites: false,
      agentOutputStyle: 'default',
    })
  }

  if (opts.legacyChatPath) {
    const dest = path.join(getAxecoderDir(), 'chat-sessions.json')
    try {
      await fs.access(dest)
    } catch {
      try {
        await fs.copyFile(opts.legacyChatPath, dest)
      } catch {
        /* ignore */
      }
    }
  }

  void existing
}
