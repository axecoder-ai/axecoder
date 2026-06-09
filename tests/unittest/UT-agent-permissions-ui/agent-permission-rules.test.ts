import { describe, expect, it } from 'vitest'
import {
  decidePermission,
  extractToolSubject,
  mergePolicies,
  parsePermissionRule,
} from '../../../electron/main/agent/agent-permission-rules'

describe('agent-permission-rules', () => {
  it('解析 ToolName(glob) 与 literal', () => {
    expect(parsePermissionRule('Bash(rm -rf*)')).toEqual({
      tool: 'Bash',
      subject: 'rm -rf*',
    })
    expect(parsePermissionRule('Bash=git push')).toEqual({
      tool: 'Bash',
      subject: 'git push',
      literal: true,
    })
    expect(parsePermissionRule('Read')).toEqual({ tool: 'Read' })
  })

  it('deny 规则优先于 mode allow', () => {
    const d = decidePermission(
      { mode: 'allow', allow: [], ask: [], deny: ['Bash(rm -rf*)'] },
      'Bash',
      false,
      'rm -rf /tmp/x',
    )
    expect(d).toBe('deny')
  })

  it('allow 规则匹配 glob', () => {
    const d = decidePermission(
      { mode: 'ask', allow: ['Bash(go test*)'], ask: [], deny: [] },
      'Bash',
      false,
      'go test ./...',
    )
    expect(d).toBe('allow')
  })

  it('只读工具无规则时直接 allow', () => {
    const d = decidePermission(
      { mode: 'deny', allow: [], ask: [], deny: [] },
      'Read',
      true,
      '/etc/passwd',
    )
    expect(d).toBe('allow')
  })

  it('合并全局与项目 deny', () => {
    const merged = mergePolicies(
      { mode: 'ask', allow: [], ask: [], deny: ['Bash'] },
      { mode: 'ask', allow: ['Read'], ask: [], deny: ['Write'] },
    )
    expect(merged.deny).toEqual(['Bash', 'Write'])
    expect(merged.allow).toContain('Read')
  })

  it('extractToolSubject 读取 command', () => {
    expect(extractToolSubject({ command: 'npm test' })).toBe('npm test')
    expect(extractToolSubject({ path: '/a/b' })).toBe('/a/b')
  })
})
