import type { AgentToolName } from './agent-types'

export type PermissionDecision = 'allow' | 'ask' | 'deny'

export type PermissionRule = {
  tool: string
  subject?: string
  literal?: boolean
}

export type PermissionsPolicy = {
  mode: PermissionDecision
  allow: string[]
  ask: string[]
  deny: string[]
}

const SUBJECT_KEYS = ['command', 'file_path', 'path', 'pattern'] as const

export const parsePermissionRule = (raw: string): PermissionRule | null => {
  const s = raw.trim()
  if (!s) return null
  const eq = s.indexOf('=')
  if (eq > 0) {
    const paren = s.indexOf('(')
    if (paren < 0 || eq < paren) {
      const tool = s.slice(0, eq).trim()
      if (!tool) return null
      return { tool, subject: s.slice(eq + 1), literal: true }
    }
  }
  const open = s.indexOf('(')
  if (open >= 0 && s.endsWith(')')) {
    const tool = s.slice(0, open).trim()
    if (!tool) return null
    return { tool, subject: s.slice(open + 1, -1) }
  }
  return { tool: s }
}

export const parsePermissionRules = (items: string[]): PermissionRule[] => {
  const out: PermissionRule[] = []
  for (const item of items) {
    const r = parsePermissionRule(item)
    if (r) out.push(r)
  }
  return out
}

export const extractToolSubject = (args: Record<string, unknown> | undefined): string => {
  if (!args) return ''
  for (const k of SUBJECT_KEYS) {
    const v = args[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return ''
}

const matchGlob = (pattern: string, name: string): boolean => {
  let px = 0
  let nx = 0
  let starPx = -1
  let starNx = 0
  while (nx < name.length) {
    if (px < pattern.length && (pattern[px] === '?' || pattern[px] === name[nx])) {
      px++
      nx++
    } else if (px < pattern.length && pattern[px] === '*') {
      starPx = px
      starNx = nx
      px++
    } else if (starPx >= 0) {
      px = starPx + 1
      starNx++
      nx = starNx
    } else {
      return false
    }
  }
  while (px < pattern.length && pattern[px] === '*') px++
  return px === pattern.length
}

const ruleMatches = (rule: PermissionRule, toolName: string, subject: string): boolean => {
  if (rule.tool !== toolName && rule.tool !== '*') return false
  if (!rule.subject) return true
  if (!subject) return false
  if (rule.literal) return rule.subject === subject
  return matchGlob(rule.subject, subject)
}

const matchAny = (rules: PermissionRule[], toolName: string, subject: string): boolean =>
  rules.some((r) => ruleMatches(r, toolName, subject))

export const decidePermission = (
  policy: PermissionsPolicy,
  toolName: AgentToolName | string,
  readOnly: boolean,
  subject: string,
): PermissionDecision => {
  const allowRules = parsePermissionRules(policy.allow)
  const askRules = parsePermissionRules(policy.ask)
  const denyRules = parsePermissionRules(policy.deny)
  if (matchAny(denyRules, toolName, subject)) return 'deny'
  if (matchAny(askRules, toolName, subject)) return 'ask'
  if (matchAny(allowRules, toolName, subject)) return 'allow'
  if (readOnly) return 'allow'
  return policy.mode
}

export const mergePolicies = (
  global: PermissionsPolicy,
  project: PermissionsPolicy | null,
): PermissionsPolicy => {
  if (!project) return global
  return {
    mode: project.mode || global.mode,
    allow: [...global.allow, ...project.allow],
    ask: [...global.ask, ...project.ask],
    deny: [...global.deny, ...project.deny],
  }
}

export const normalizePermissionModeString = (
  mode: string | undefined,
): PermissionDecision => {
  const m = (mode ?? 'ask').toLowerCase().trim()
  if (m === 'allow' || m === 'acceptEdits' || m === 'bypassPermissions') return 'allow'
  if (m === 'deny') return 'deny'
  return 'ask'
}

export const legacyToolsToRules = (tools: string[] | undefined): string[] => {
  if (!tools?.length) return []
  return tools.map((t) => (t === '*' ? '*' : t.trim())).filter(Boolean)
}
