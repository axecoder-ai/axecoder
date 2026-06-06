import fs from 'node:fs'
import path from 'node:path'
import { axecoderPath } from '../axecoder-dir'
import { prefixAllowMatches } from './agent-command-arity'
import { patternMatches } from './agent-execpolicy-matcher'

export type ExecPolicyDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'ask'; reason: string }

export type ExecPolicyRuleSet = {
  allow: string[]
  deny: string[]
}

export type ExecPolicyConfig = {
  rules: Record<string, ExecPolicyRuleSet>
}

const emptyRuleSet = (): ExecPolicyRuleSet => ({ allow: [], deny: [] })

/** 解析 execpolicy.toml（仅支持 [rules.NAME] + allow/deny 数组） */
export const parseExecPolicyToml = (contents: string): ExecPolicyConfig => {
  const rules: Record<string, ExecPolicyRuleSet> = {}
  let current: string | null = null
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const section = line.match(/^\[rules\.([^\]]+)\]$/)
    if (section) {
      current = section[1]!
      rules[current] = emptyRuleSet()
      continue
    }
    if (!current) continue
    const allow = line.match(/^allow\s*=\s*\[(.*)\]$/)
    if (allow) {
      rules[current]!.allow = parseStringArray(allow[1]!)
      continue
    }
    const deny = line.match(/^deny\s*=\s*\[(.*)\]$/)
    if (deny) {
      rules[current]!.deny = parseStringArray(deny[1]!)
    }
  }
  return { rules }
}

const parseStringArray = (inner: string): string[] => {
  const out: string[] = []
  const re = /"((?:\\.|[^"\\])*)"/g
  let m = re.exec(inner)
  while (m) {
    out.push(m[1]!.replace(/\\"/g, '"'))
    m = re.exec(inner)
  }
  return out
}

export const defaultExecPolicyPath = () => axecoderPath('execpolicy.toml')

export const loadExecPolicy = (): ExecPolicyConfig | null => {
  const p = defaultExecPolicyPath()
  if (!fs.existsSync(p)) return null
  const contents = fs.readFileSync(p, 'utf-8')
  return parseExecPolicyToml(contents)
}

export const evaluateExecPolicy = (command: string, config?: ExecPolicyConfig | null): ExecPolicyDecision => {
  const cfg = config === undefined ? loadExecPolicy() : config
  if (!cfg) return { kind: 'allow' }

  for (const [group, rules] of Object.entries(cfg.rules)) {
    for (const pattern of rules.deny) {
      if (patternMatches(pattern, command)) {
        return { kind: 'deny', reason: `execpolicy denied by ${group}: ${pattern}` }
      }
    }
  }

  for (const [, rules] of Object.entries(cfg.rules)) {
    for (const pattern of rules.allow) {
      if (prefixAllowMatches(pattern, command) || patternMatches(pattern, command)) {
        return { kind: 'allow' }
      }
    }
  }

  return { kind: 'ask', reason: 'execpolicy: no matching allow rule' }
}

export const formatExecPolicyBlock = (decision: ExecPolicyDecision): string => {
  if (decision.kind === 'deny') return `BLOCKED: ${decision.reason}`
  if (decision.kind === 'ask') return `BLOCKED: ${decision.reason}`
  return ''
}
