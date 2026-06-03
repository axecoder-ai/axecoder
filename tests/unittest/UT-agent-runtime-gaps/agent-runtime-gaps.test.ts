import { describe, expect, it } from 'vitest'
import {
  clearOldToolResults,
  dropOrphanToolMessages,
  estimateContextChars,
} from '../../../electron/main/agent/agent-frc'
import { compactAgentMessages, shouldAutoCompact } from '../../../electron/main/agent/agent-context-compact'
import { resolveToolPermission } from '../../../electron/main/agent/agent-permissions'
import type { AgentLoopMessage } from '../../../electron/main/agent/agent-types'
import { compactChatHistory } from '../../../electron/main/chat-compact'

describe('agent-runtime-gaps', () => {
  it('FRC 清理旧 tool 消息', () => {
    const messages: AgentLoopMessage[] = [
      { role: 'system', content: 'sys' },
      { role: 'tool', toolCallId: '1', name: 'Read', content: 'a'.repeat(100) },
      { role: 'tool', toolCallId: '2', name: 'Read', content: 'b'.repeat(100) },
      { role: 'tool', toolCallId: '3', name: 'Read', content: 'c'.repeat(100) },
    ]
    const n = clearOldToolResults(messages, 1)
    expect(n).toBe(2)
    expect(messages[1].role === 'tool' && messages[1].content).toContain('cleared')
  })

  it('自动 compact 阈值', () => {
    const messages: AgentLoopMessage[] = [{ role: 'system', content: 'x'.repeat(2000) }]
    expect(shouldAutoCompact(messages, 1000)).toBe(true)
    expect(estimateContextChars(messages)).toBeGreaterThan(1000)
  })

  it('estimateContextChars 容忍缺失 content', () => {
    const messages: AgentLoopMessage[] = [
      { role: 'system', content: 'sys' },
      { role: 'assistant', content: undefined as unknown as string },
      { role: 'user', content: undefined as unknown as string },
    ]
    expect(estimateContextChars(messages)).toBe(3)
  })

  it('compactAgentMessages 保留尾部', () => {
    const messages: AgentLoopMessage[] = []
    for (let i = 0; i < 30; i++) {
      messages.push({ role: 'user', content: `m${i}` })
    }
    const { messages: next } = compactAgentMessages(messages, 5)
    expect(next.length).toBeLessThan(messages.length)
  })

  it('compact 后 dropOrphanToolMessages 去掉悬空 tool', () => {
    const messages: AgentLoopMessage[] = [
      { role: 'system', content: 'sys' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call_old', name: 'Read', arguments: { path: 'a' } }],
      },
      { role: 'tool', toolCallId: 'call_old', name: 'Read', content: 'old result' },
      ...Array.from({ length: 28 }, (_, i) => ({
        role: 'user' as const,
        content: `filler ${i}`,
      })),
      { role: 'tool', toolCallId: 'call_old', name: 'Read', content: 'orphan in tail' },
    ]
    const { messages: compacted } = compactAgentMessages(messages, 5)
    const fixed = dropOrphanToolMessages(compacted)
    expect(fixed.some((m) => m.role === 'tool' && m.toolCallId === 'call_old')).toBe(false)
  })

  it('acceptEdits 允许 Edit', () => {
    const cfg = {
      schemaVersion: 1 as const,
      autoSave: true,
      autoSaveDelay: 400,
      fontSize: 14,
      theme: 'vscode' as const,
      agentAutoApplyWrites: false,
      agentOutputStyle: 'default' as const,
      agentPermissionMode: 'acceptEdits' as const,
    }
    expect(resolveToolPermission(cfg, 'Edit')).toBe('allow')
    expect(resolveToolPermission(cfg, 'Bash')).toBe('allow')
  })

  it('disallowedTools 拒绝', () => {
    const cfg = {
      schemaVersion: 1 as const,
      autoSave: true,
      autoSaveDelay: 400,
      fontSize: 14,
      theme: 'vscode' as const,
      agentAutoApplyWrites: false,
      agentOutputStyle: 'default' as const,
      agentDisallowedTools: ['Bash'],
    }
    expect(resolveToolPermission(cfg, 'Bash')).toBe('deny')
  })

  it('chat compact', () => {
    const msgs = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `line ${i}`,
    }))
    const { messages } = compactChatHistory(msgs, 10)
    expect(messages.length).toBeLessThan(msgs.length)
  })
})
