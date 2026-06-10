import type { AppConfig } from '../models-types'
import type { AgentToolName } from './agent-types'
import {
  decidePermission,
  legacyToolsToRules,
  mergePolicies,
  normalizePermissionModeString,
  type PermissionDecision,
  type PermissionsPolicy,
} from './agent-permission-rules'
import { getProjectPermissions } from '../project-permissions-store'

export type AgentPermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions'

const READ_ONLY_TOOLS = new Set<AgentToolName>([
  'Read',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'DiscoverSkills',
  'TaskGet',
  'TaskList',
  'ListMcpResources',
  'ReadMcpResource',
  'TaskOutput',
  'ShellStdin',
  'ToolSearch',
  'LSP',
  'ReadLints',
])

export const normalizePermissionMode = (cfg: AppConfig): AgentPermissionMode => {
  const m = cfg.agentPermissionMode
  if (m === 'acceptEdits' || m === 'bypassPermissions') return m
  return 'default'
}

const modeFromConfig = (cfg: AppConfig): PermissionDecision => {
  const m = normalizePermissionMode(cfg)
  if (m === 'acceptEdits' || m === 'bypassPermissions') return 'allow'
  return 'ask'
}

export const buildGlobalPermissionsPolicy = (cfg: AppConfig): PermissionsPolicy => {
  const allow =
    cfg.agentPermissionAllowRules?.length
      ? [...cfg.agentPermissionAllowRules]
      : legacyToolsToRules(cfg.agentAllowedTools)
  const deny =
    cfg.agentPermissionDenyRules?.length
      ? [...cfg.agentPermissionDenyRules]
      : legacyToolsToRules(cfg.agentDisallowedTools)
  const ask = cfg.agentPermissionAskRules ? [...cfg.agentPermissionAskRules] : []
  return {
    mode: modeFromConfig(cfg),
    allow,
    ask,
    deny,
  }
}

export const buildMergedPermissionsPolicy = async (
  cfg: AppConfig,
  projectRoot?: string,
): Promise<PermissionsPolicy> => {
  const global = buildGlobalPermissionsPolicy(cfg)
  if (!projectRoot?.trim()) return global
  const project = await getProjectPermissions(projectRoot)
  const hasProject =
    project.allow.length > 0 ||
    project.ask.length > 0 ||
    project.deny.length > 0 ||
    project.mode !== 'ask'
  return mergePolicies(global, hasProject ? project : null)
}

export type ResolveToolPermissionOpts = {
  subject?: string
  projectRoot?: string
  mergedPolicy?: PermissionsPolicy
}

/** allow = 直接执行；ask = 走 pending；deny = Reject */
export const resolveToolPermission = (
  cfg: AppConfig,
  toolName: AgentToolName,
  opts?: ResolveToolPermissionOpts,
): PermissionDecision => {
  const policy = opts?.mergedPolicy ?? buildGlobalPermissionsPolicy(cfg)
  const subject = opts?.subject ?? ''
  const readOnly = READ_ONLY_TOOLS.has(toolName)
  return decidePermission(policy, toolName, readOnly, subject)
}

export const resolveToolPermissionAsync = async (
  cfg: AppConfig,
  toolName: AgentToolName,
  opts?: ResolveToolPermissionOpts,
): Promise<PermissionDecision> => {
  const merged =
    opts?.mergedPolicy ??
    (await buildMergedPermissionsPolicy(cfg, opts?.projectRoot))
  return resolveToolPermission(cfg, toolName, {
    ...opts,
    mergedPolicy: merged,
  })
}

export const isToolDenied = (cfg: AppConfig, toolName: AgentToolName) =>
  resolveToolPermission(cfg, toolName) === 'deny'

export const isToolAllowedByList = (cfg: AppConfig, toolName: AgentToolName) => {
  const p = buildGlobalPermissionsPolicy(cfg)
  if (p.allow.length === 0) return true
  return p.allow.includes(toolName) || p.allow.includes('*')
}
