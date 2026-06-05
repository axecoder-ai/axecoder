import fs from 'node:fs/promises'
import type { AppConfig } from './models-types'
import { ensureAxecoderDir, axecoderPath } from './axecoder-dir'
import { invalidateMainLocaleCache } from './i18n'
import { normalizeLocale } from '../../shared/i18n'

const defaults: AppConfig = {
  schemaVersion: 1,
  locale: 'en',
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
  agentModelTierRoutingEnabled: true,
  agentCompletionSoundEnabled: false,
  agentCompletionSoundPath: '',
  agentCompletionSoundDisplayName: '',
  rulesIncludeThirdPartyPlugins: false,
  profileDisplayName: '',
  profileAvatarPath: '',
  gitForgeProvider: 'auto',
  gitForgeApiBase: '',
  gitForgeWebBase: '',
  gitForgeAccessToken: '',
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
    locale: normalizeLocale(raw.locale ?? defaults.locale),
    autoSave: raw.autoSave ?? defaults.autoSave,
    autoSaveDelay: raw.autoSaveDelay ?? defaults.autoSaveDelay,
    fontSize: raw.fontSize ?? defaults.fontSize,
    theme: raw.theme ?? defaults.theme,
    agentAutoApplyWrites: raw.agentAutoApplyWrites ?? defaults.agentAutoApplyWrites,
    agentOutputStyle: raw.agentOutputStyle ?? defaults.agentOutputStyle,
    agentFeatureWebSearch: raw.agentFeatureWebSearch ?? false,
    agentWebSearchApiKey: raw.agentWebSearchApiKey ?? '',
    agentFeatureLsp: raw.agentFeatureLsp ?? false,
    agentFeatureCodeGraph: raw.agentFeatureCodeGraph ?? true,
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
    agentModelTierRoutingEnabled:
      raw.agentModelTierRoutingEnabled ?? defaults.agentModelTierRoutingEnabled,
    agentCompletionSoundEnabled:
      raw.agentCompletionSoundEnabled ?? defaults.agentCompletionSoundEnabled,
    agentCompletionSoundPath:
      raw.agentCompletionSoundPath ?? defaults.agentCompletionSoundPath,
    agentCompletionSoundDisplayName:
      raw.agentCompletionSoundDisplayName ?? defaults.agentCompletionSoundDisplayName,
    rulesIncludeThirdPartyPlugins:
      raw.rulesIncludeThirdPartyPlugins ?? defaults.rulesIncludeThirdPartyPlugins,
    profileDisplayName: raw.profileDisplayName ?? defaults.profileDisplayName,
    profileAvatarPath: raw.profileAvatarPath ?? defaults.profileAvatarPath,
    gitForgeProvider: raw.gitForgeProvider ?? defaults.gitForgeProvider,
    gitForgeApiBase: raw.gitForgeApiBase ?? defaults.gitForgeApiBase,
    gitForgeWebBase: raw.gitForgeWebBase ?? defaults.gitForgeWebBase,
    gitForgeAccessToken: raw.gitForgeAccessToken ?? defaults.gitForgeAccessToken,
  }
}

export const setConfig = async (partial: Partial<AppConfig>): Promise<AppConfig> => {
  await ensureAxecoderDir()
  const cur = await getConfig()
  const next: AppConfig = {
    schemaVersion: 1,
    locale: partial.locale !== undefined ? normalizeLocale(partial.locale) : cur.locale,
    autoSave: partial.autoSave ?? cur.autoSave,
    autoSaveDelay: partial.autoSaveDelay ?? cur.autoSaveDelay,
    fontSize: partial.fontSize ?? cur.fontSize,
    theme: partial.theme ?? cur.theme,
    agentAutoApplyWrites: partial.agentAutoApplyWrites ?? cur.agentAutoApplyWrites,
    agentOutputStyle: partial.agentOutputStyle ?? cur.agentOutputStyle,
    agentFeatureWebSearch: partial.agentFeatureWebSearch ?? cur.agentFeatureWebSearch,
    agentWebSearchApiKey: partial.agentWebSearchApiKey ?? cur.agentWebSearchApiKey,
    agentFeatureLsp: partial.agentFeatureLsp ?? cur.agentFeatureLsp,
    agentFeatureCodeGraph: partial.agentFeatureCodeGraph ?? cur.agentFeatureCodeGraph,
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
    agentModelTierRoutingEnabled:
      partial.agentModelTierRoutingEnabled ?? cur.agentModelTierRoutingEnabled,
    agentCompletionSoundEnabled:
      partial.agentCompletionSoundEnabled !== undefined
        ? partial.agentCompletionSoundEnabled
        : cur.agentCompletionSoundEnabled,
    agentCompletionSoundPath:
      partial.agentCompletionSoundPath !== undefined
        ? partial.agentCompletionSoundPath
        : cur.agentCompletionSoundPath,
    agentCompletionSoundDisplayName:
      partial.agentCompletionSoundDisplayName !== undefined
        ? partial.agentCompletionSoundDisplayName
        : cur.agentCompletionSoundDisplayName,
    rulesIncludeThirdPartyPlugins:
      partial.rulesIncludeThirdPartyPlugins !== undefined
        ? partial.rulesIncludeThirdPartyPlugins
        : cur.rulesIncludeThirdPartyPlugins,
    profileDisplayName:
      partial.profileDisplayName !== undefined
        ? partial.profileDisplayName
        : cur.profileDisplayName,
    profileAvatarPath:
      partial.profileAvatarPath !== undefined
        ? partial.profileAvatarPath
        : cur.profileAvatarPath,
    gitForgeProvider:
      partial.gitForgeProvider !== undefined ? partial.gitForgeProvider : cur.gitForgeProvider,
    gitForgeApiBase:
      partial.gitForgeApiBase !== undefined ? partial.gitForgeApiBase : cur.gitForgeApiBase,
    gitForgeWebBase:
      partial.gitForgeWebBase !== undefined ? partial.gitForgeWebBase : cur.gitForgeWebBase,
    gitForgeAccessToken:
      partial.gitForgeAccessToken !== undefined
        ? partial.gitForgeAccessToken
        : cur.gitForgeAccessToken,
  }
  await fs.writeFile(configPath(), JSON.stringify(next, null, 2), 'utf-8')
  invalidateMainLocaleCache()
  return next
}

export const writeConfigIfMissing = async (config: AppConfig) => {
  const raw = await readRaw()
  if (raw) return
  await ensureAxecoderDir()
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}
