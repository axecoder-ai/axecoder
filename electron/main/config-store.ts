import fs from 'node:fs/promises'
import { normalizeAutoPlan } from './agent/agent-auto-plan'
import type { AppConfig } from './models-types'

const normalizeAutoPlanConfig = (v: unknown) => normalizeAutoPlan(v)
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
  agentOsSandboxEnabled: true,
  agentOutputStyle: 'default',
  agentFeatureWebSearch: true,
  agentFeatureWebRun: true,
  agentFeatureLsp: true,
  agentLspAutoDiagnostics: true,
  agentPermissionMode: 'default',
  agentPermissionAllowRules: [],
  agentPermissionAskRules: [],
  agentPermissionDenyRules: [],
  agentAllowedTools: [],
  agentDisallowedTools: [],
  agentContextCompactThreshold: 120_000,
  agentFrcKeepToolMessages: 8,
  agentTokenBudget: 0,
  agentProactiveEnabled: false,
  agentAutoPlan: 'on',
  agentAutoPlanClassifierModelId: '',
  agentSmartModeApproval: true,
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
  aiRequestMaxRetries: 2,
  aiRateLimitRetryDelaySec: 60,
  agentLoopGuardEnabled: true,
  agentWorkerEnabled: true,
  extensionHostLspEnabled: true,
  workshopWorkerEnabled: true,
  indexerWorkerEnabled: true,
  agentLoopGuardStormThreshold: 3,
  agentLoopGuardRepeatSuccessThreshold: 2,
  agentMaxToolRounds: 0,
  terminalShell: '',
  terminalShellArgs: [] as string[],
  editorMinimap: false,
  editorSemanticHighlighting: true,
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
    agentOsSandboxEnabled: raw.agentOsSandboxEnabled ?? defaults.agentOsSandboxEnabled,
    agentOutputStyle: raw.agentOutputStyle ?? defaults.agentOutputStyle,
    agentFeatureWebSearch: raw.agentFeatureWebSearch ?? defaults.agentFeatureWebSearch,
    agentWebSearchApiKey: raw.agentWebSearchApiKey ?? '',
    agentFeatureWebRun:
      raw.agentFeatureWebRun ?? raw.agentFeatureWebSearch ?? defaults.agentFeatureWebRun,
    agentFeatureLsp: raw.agentFeatureLsp ?? defaults.agentFeatureLsp,
    agentLspAutoDiagnostics: raw.agentLspAutoDiagnostics ?? defaults.agentLspAutoDiagnostics,
    agentFeatureCodeGraph: raw.agentFeatureCodeGraph ?? true,
    agentFeatureWorktree: raw.agentFeatureWorktree ?? false,
    agentFeatureSleep: raw.agentFeatureSleep ?? false,
    agentFeatureBrief: raw.agentFeatureBrief ?? false,
    agentFeatureWorkflow: raw.agentFeatureWorkflow ?? false,
    agentPermissionMode: raw.agentPermissionMode ?? defaults.agentPermissionMode,
    agentPermissionAllowRules:
      raw.agentPermissionAllowRules ?? defaults.agentPermissionAllowRules,
    agentPermissionAskRules: raw.agentPermissionAskRules ?? defaults.agentPermissionAskRules,
    agentPermissionDenyRules: raw.agentPermissionDenyRules ?? defaults.agentPermissionDenyRules,
    agentAllowedTools: raw.agentAllowedTools ?? defaults.agentAllowedTools,
    agentDisallowedTools: raw.agentDisallowedTools ?? defaults.agentDisallowedTools,
    agentContextCompactThreshold:
      raw.agentContextCompactThreshold ?? defaults.agentContextCompactThreshold,
    agentFrcKeepToolMessages: raw.agentFrcKeepToolMessages ?? defaults.agentFrcKeepToolMessages,
    agentTokenBudget: raw.agentTokenBudget ?? defaults.agentTokenBudget,
    agentProactiveEnabled: raw.agentProactiveEnabled ?? defaults.agentProactiveEnabled,
    agentAutoPlan: normalizeAutoPlanConfig(raw.agentAutoPlan ?? defaults.agentAutoPlan),
    agentAutoPlanClassifierModelId:
      raw.agentAutoPlanClassifierModelId ?? defaults.agentAutoPlanClassifierModelId,
    agentSmartModeApproval: raw.agentSmartModeApproval ?? defaults.agentSmartModeApproval,
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
    aiRequestMaxRetries: raw.aiRequestMaxRetries ?? defaults.aiRequestMaxRetries,
    aiRateLimitRetryDelaySec:
      raw.aiRateLimitRetryDelaySec ?? defaults.aiRateLimitRetryDelaySec,
    agentLoopGuardEnabled: raw.agentLoopGuardEnabled ?? defaults.agentLoopGuardEnabled,
    agentWorkerEnabled: raw.agentWorkerEnabled ?? defaults.agentWorkerEnabled,
    extensionHostLspEnabled: raw.extensionHostLspEnabled ?? defaults.extensionHostLspEnabled,
    workshopWorkerEnabled: raw.workshopWorkerEnabled ?? defaults.workshopWorkerEnabled,
    indexerWorkerEnabled: raw.indexerWorkerEnabled ?? defaults.indexerWorkerEnabled,
    agentLoopGuardStormThreshold:
      raw.agentLoopGuardStormThreshold ?? defaults.agentLoopGuardStormThreshold,
    agentLoopGuardRepeatSuccessThreshold:
      raw.agentLoopGuardRepeatSuccessThreshold ?? defaults.agentLoopGuardRepeatSuccessThreshold,
    agentMaxToolRounds: raw.agentMaxToolRounds ?? defaults.agentMaxToolRounds,
    terminalShell: raw.terminalShell ?? defaults.terminalShell,
    terminalShellArgs: raw.terminalShellArgs ?? defaults.terminalShellArgs,
    editorMinimap: raw.editorMinimap ?? defaults.editorMinimap,
    editorSemanticHighlighting:
      raw.editorSemanticHighlighting ?? defaults.editorSemanticHighlighting,
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
    agentOsSandboxEnabled:
      partial.agentOsSandboxEnabled !== undefined
        ? partial.agentOsSandboxEnabled
        : cur.agentOsSandboxEnabled,
    agentOutputStyle: partial.agentOutputStyle ?? cur.agentOutputStyle,
    agentFeatureWebSearch: partial.agentFeatureWebSearch ?? cur.agentFeatureWebSearch,
    agentWebSearchApiKey: partial.agentWebSearchApiKey ?? cur.agentWebSearchApiKey,
    agentFeatureWebRun: partial.agentFeatureWebRun ?? cur.agentFeatureWebRun,
    agentFeatureLsp: partial.agentFeatureLsp ?? cur.agentFeatureLsp,
    agentLspAutoDiagnostics:
      partial.agentLspAutoDiagnostics !== undefined
        ? partial.agentLspAutoDiagnostics
        : cur.agentLspAutoDiagnostics,
    agentFeatureCodeGraph: partial.agentFeatureCodeGraph ?? cur.agentFeatureCodeGraph,
    agentFeatureWorktree: partial.agentFeatureWorktree ?? cur.agentFeatureWorktree,
    agentFeatureSleep: partial.agentFeatureSleep ?? cur.agentFeatureSleep,
    agentFeatureBrief: partial.agentFeatureBrief ?? cur.agentFeatureBrief,
    agentFeatureWorkflow: partial.agentFeatureWorkflow ?? cur.agentFeatureWorkflow,
    agentPermissionMode: partial.agentPermissionMode ?? cur.agentPermissionMode,
    agentPermissionAllowRules:
      partial.agentPermissionAllowRules ?? cur.agentPermissionAllowRules,
    agentPermissionAskRules: partial.agentPermissionAskRules ?? cur.agentPermissionAskRules,
    agentPermissionDenyRules: partial.agentPermissionDenyRules ?? cur.agentPermissionDenyRules,
    agentAllowedTools: partial.agentAllowedTools ?? cur.agentAllowedTools,
    agentDisallowedTools: partial.agentDisallowedTools ?? cur.agentDisallowedTools,
    agentContextCompactThreshold:
      partial.agentContextCompactThreshold ?? cur.agentContextCompactThreshold,
    agentFrcKeepToolMessages: partial.agentFrcKeepToolMessages ?? cur.agentFrcKeepToolMessages,
    agentTokenBudget: partial.agentTokenBudget ?? cur.agentTokenBudget,
    agentProactiveEnabled: partial.agentProactiveEnabled ?? cur.agentProactiveEnabled,
    agentAutoPlan:
      partial.agentAutoPlan !== undefined
        ? normalizeAutoPlanConfig(partial.agentAutoPlan)
        : cur.agentAutoPlan,
    agentAutoPlanClassifierModelId:
      partial.agentAutoPlanClassifierModelId !== undefined
        ? partial.agentAutoPlanClassifierModelId
        : cur.agentAutoPlanClassifierModelId,
    agentSmartModeApproval:
      partial.agentSmartModeApproval !== undefined
        ? partial.agentSmartModeApproval
        : cur.agentSmartModeApproval,
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
    aiRequestMaxRetries:
      partial.aiRequestMaxRetries !== undefined
        ? partial.aiRequestMaxRetries
        : cur.aiRequestMaxRetries,
    aiRateLimitRetryDelaySec:
      partial.aiRateLimitRetryDelaySec !== undefined
        ? partial.aiRateLimitRetryDelaySec
        : cur.aiRateLimitRetryDelaySec,
    agentLoopGuardEnabled:
      partial.agentLoopGuardEnabled !== undefined
        ? partial.agentLoopGuardEnabled
        : cur.agentLoopGuardEnabled,
    agentWorkerEnabled:
      partial.agentWorkerEnabled !== undefined
        ? partial.agentWorkerEnabled
        : cur.agentWorkerEnabled,
    extensionHostLspEnabled:
      partial.extensionHostLspEnabled !== undefined
        ? partial.extensionHostLspEnabled
        : cur.extensionHostLspEnabled,
    workshopWorkerEnabled:
      partial.workshopWorkerEnabled !== undefined
        ? partial.workshopWorkerEnabled
        : cur.workshopWorkerEnabled,
    indexerWorkerEnabled:
      partial.indexerWorkerEnabled !== undefined
        ? partial.indexerWorkerEnabled
        : cur.indexerWorkerEnabled,
    agentLoopGuardStormThreshold:
      partial.agentLoopGuardStormThreshold !== undefined
        ? partial.agentLoopGuardStormThreshold
        : cur.agentLoopGuardStormThreshold,
    agentLoopGuardRepeatSuccessThreshold:
      partial.agentLoopGuardRepeatSuccessThreshold !== undefined
        ? partial.agentLoopGuardRepeatSuccessThreshold
        : cur.agentLoopGuardRepeatSuccessThreshold,
    agentMaxToolRounds:
      partial.agentMaxToolRounds !== undefined
        ? partial.agentMaxToolRounds
        : cur.agentMaxToolRounds,
    terminalShell:
      partial.terminalShell !== undefined ? partial.terminalShell : cur.terminalShell,
    terminalShellArgs:
      partial.terminalShellArgs !== undefined
        ? partial.terminalShellArgs
        : cur.terminalShellArgs,
    editorMinimap:
      partial.editorMinimap !== undefined ? partial.editorMinimap : cur.editorMinimap,
    editorSemanticHighlighting:
      partial.editorSemanticHighlighting !== undefined
        ? partial.editorSemanticHighlighting
        : cur.editorSemanticHighlighting,
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
