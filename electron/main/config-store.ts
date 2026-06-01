import fs from 'node:fs/promises'
import type { AppConfig } from './models-types'
import { ensureAxecoderDir, axecoderPath } from './axecoder-dir'

const defaults: AppConfig = {
  schemaVersion: 1,
  autoSave: true,
  autoSaveDelay: 400,
  fontSize: 14,
  theme: 'vscode',
  agentAutoApplyWrites: false,
  agentOutputStyle: 'default',
  agentPermissionMode: 'default',
  agentAllowedTools: [],
  agentDisallowedTools: [],
  agentContextCompactThreshold: 120_000,
  agentFrcKeepToolMessages: 8,
  agentTokenBudget: 0,
  agentProactiveEnabled: false,
  agentHooksEnabled: true,
}

const configPath = () => axecoderPath('config.json')

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
    agentAutoApplyWrites: raw.agentAutoApplyWrites ?? defaults.agentAutoApplyWrites,
    agentOutputStyle: raw.agentOutputStyle ?? defaults.agentOutputStyle,
    agentFeatureWebSearch: raw.agentFeatureWebSearch ?? false,
    agentWebSearchApiKey: raw.agentWebSearchApiKey ?? '',
    agentFeatureLsp: raw.agentFeatureLsp ?? false,
    agentFeatureWorktree: raw.agentFeatureWorktree ?? false,
    agentFeatureSleep: raw.agentFeatureSleep ?? false,
    agentFeatureBrief: raw.agentFeatureBrief ?? false,
    agentFeatureWorkflow: raw.agentFeatureWorkflow ?? false,
    agentPermissionMode: raw.agentPermissionMode ?? defaults.agentPermissionMode,
    agentAllowedTools: raw.agentAllowedTools ?? defaults.agentAllowedTools,
    agentDisallowedTools: raw.agentDisallowedTools ?? defaults.agentDisallowedTools,
    agentContextCompactThreshold:
      raw.agentContextCompactThreshold ?? defaults.agentContextCompactThreshold,
    agentFrcKeepToolMessages: raw.agentFrcKeepToolMessages ?? defaults.agentFrcKeepToolMessages,
    agentTokenBudget: raw.agentTokenBudget ?? defaults.agentTokenBudget,
    agentProactiveEnabled: raw.agentProactiveEnabled ?? defaults.agentProactiveEnabled,
    agentHooksEnabled: raw.agentHooksEnabled ?? defaults.agentHooksEnabled,
  }
}

export const setConfig = async (partial: Partial<AppConfig>): Promise<AppConfig> => {
  await ensureAxecoderDir()
  const cur = await getConfig()
  const next: AppConfig = {
    schemaVersion: 1,
    autoSave: partial.autoSave ?? cur.autoSave,
    autoSaveDelay: partial.autoSaveDelay ?? cur.autoSaveDelay,
    fontSize: partial.fontSize ?? cur.fontSize,
    theme: partial.theme ?? cur.theme,
    agentAutoApplyWrites: partial.agentAutoApplyWrites ?? cur.agentAutoApplyWrites,
    agentOutputStyle: partial.agentOutputStyle ?? cur.agentOutputStyle,
    agentFeatureWebSearch: partial.agentFeatureWebSearch ?? cur.agentFeatureWebSearch,
    agentWebSearchApiKey: partial.agentWebSearchApiKey ?? cur.agentWebSearchApiKey,
    agentFeatureLsp: partial.agentFeatureLsp ?? cur.agentFeatureLsp,
    agentFeatureWorktree: partial.agentFeatureWorktree ?? cur.agentFeatureWorktree,
    agentFeatureSleep: partial.agentFeatureSleep ?? cur.agentFeatureSleep,
    agentFeatureBrief: partial.agentFeatureBrief ?? cur.agentFeatureBrief,
    agentFeatureWorkflow: partial.agentFeatureWorkflow ?? cur.agentFeatureWorkflow,
    agentPermissionMode: partial.agentPermissionMode ?? cur.agentPermissionMode,
    agentAllowedTools: partial.agentAllowedTools ?? cur.agentAllowedTools,
    agentDisallowedTools: partial.agentDisallowedTools ?? cur.agentDisallowedTools,
    agentContextCompactThreshold:
      partial.agentContextCompactThreshold ?? cur.agentContextCompactThreshold,
    agentFrcKeepToolMessages: partial.agentFrcKeepToolMessages ?? cur.agentFrcKeepToolMessages,
    agentTokenBudget: partial.agentTokenBudget ?? cur.agentTokenBudget,
    agentProactiveEnabled: partial.agentProactiveEnabled ?? cur.agentProactiveEnabled,
    agentHooksEnabled: partial.agentHooksEnabled ?? cur.agentHooksEnabled,
  }
  await fs.writeFile(configPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export const writeConfigIfMissing = async (config: AppConfig) => {
  const raw = await readRaw()
  if (raw) return
  await ensureAxecoderDir()
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}
