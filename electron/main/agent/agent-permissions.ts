import type { AppConfig } from '../models-types'
import type { AgentToolName } from './agent-types'

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
  'ToolSearch',
  'LSP',
])

const WRITE_TOOLS = new Set<AgentToolName>([
  'Edit',
  'Write',
  'Delete',
  'Move',
  'NotebookEdit',
])

export const normalizePermissionMode = (cfg: AppConfig): AgentPermissionMode => {
  const m = cfg.agentPermissionMode
  if (m === 'acceptEdits' || m === 'bypassPermissions') return m
  return 'default'
}

export const isToolDenied = (cfg: AppConfig, toolName: AgentToolName) => {
  const list = cfg.agentDisallowedTools ?? []
  return list.includes(toolName) || list.includes('*')
}

export const isToolAllowedByList = (cfg: AppConfig, toolName: AgentToolName) => {
  const allowed = cfg.agentAllowedTools ?? []
  if (allowed.length === 0) return true
  return allowed.includes(toolName) || allowed.includes('*')
}

/** allow = 直接执行；ask = 走 pending；deny = Reject */
export const resolveToolPermission = (
  cfg: AppConfig,
  toolName: AgentToolName,
): 'allow' | 'ask' | 'deny' => {
  if (isToolDenied(cfg, toolName)) return 'deny'
  const mode = normalizePermissionMode(cfg)
  if (mode === 'bypassPermissions' && isToolAllowedByList(cfg, toolName)) return 'allow'
  if (mode === 'acceptEdits') {
    if (READ_ONLY_TOOLS.has(toolName)) return 'allow'
    if (WRITE_TOOLS.has(toolName) || toolName === 'Bash') return 'allow'
  }
  if (WRITE_TOOLS.has(toolName) || toolName === 'Bash' || toolName === 'AskUserQuestion') {
    return 'ask'
  }
  return 'allow'
}
