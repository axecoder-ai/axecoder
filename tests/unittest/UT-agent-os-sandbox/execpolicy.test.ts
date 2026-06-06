import { describe, expect, it } from 'vitest'
import { classifyCommand, prefixAllowMatches } from '../../../electron/main/agent/agent-command-arity'
import { normalizeCommand, patternMatches } from '../../../electron/main/agent/agent-execpolicy-matcher'
import { evaluateExecPolicy, parseExecPolicyToml } from '../../../electron/main/agent/agent-execpolicy'

const sampleConfig = parseExecPolicyToml(`
[rules.git]
allow = ["git status", "git log *"]
deny = ["git push --force"]

[rules.danger]
allow = []
deny = ["rm -rf /"]
`)

describe('execpolicy evaluate', () => {
  it('allow git status 及带 flag 变体', () => {
    expect(evaluateExecPolicy('git status', sampleConfig).kind).toBe('allow')
    expect(evaluateExecPolicy('git status -s', sampleConfig).kind).toBe('allow')
    expect(evaluateExecPolicy('git status --porcelain', sampleConfig).kind).toBe('allow')
  })

  it('allow git log 通配', () => {
    expect(evaluateExecPolicy('git log --oneline', sampleConfig).kind).toBe('allow')
  })

  it('deny git push --force', () => {
    const d = evaluateExecPolicy('git push --force', sampleConfig)
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.reason).toContain('git push --force')
  })

  it('ask 未知命令', () => {
    expect(evaluateExecPolicy('unknown command', sampleConfig).kind).toBe('ask')
  })

  it('deny rm -rf /', () => {
    expect(evaluateExecPolicy('rm -rf /', sampleConfig).kind).toBe('deny')
  })
})

describe('arity-aware prefix', () => {
  it('git status 不匹配 git push', () => {
    expect(prefixAllowMatches('git status', 'git status --porcelain')).toBe(true)
    expect(prefixAllowMatches('git status', 'git push origin main')).toBe(false)
  })

  it('cargo check 变体', () => {
    expect(prefixAllowMatches('cargo check', 'cargo check --workspace')).toBe(true)
    expect(prefixAllowMatches('cargo check', 'cargo build --release')).toBe(false)
  })

  it('classifyCommand', () => {
    expect(classifyCommand(['git', 'status', '-s'])).toBe('git status')
    expect(classifyCommand(['npm', 'run', 'dev'])).toBe('npm run dev')
    expect(classifyCommand(['ls', '-la'])).toBe('ls')
  })
})

describe('pattern matcher', () => {
  it('normalize 与 wildcard', () => {
    expect(normalizeCommand('git   status')).toBe('git status')
    expect(patternMatches('git log *', 'git log --oneline')).toBe(true)
    expect(patternMatches('cargo *', 'cargo test --all')).toBe(true)
    expect(patternMatches('git push --force', 'git push origin main')).toBe(false)
  })
})
