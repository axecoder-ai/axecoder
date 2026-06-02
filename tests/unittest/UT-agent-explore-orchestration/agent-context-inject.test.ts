import { describe, expect, it, beforeEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  buildTodoReminderInjection,
  buildScratchpadInjection,
} from '../../../electron/main/agent/agent-context-inject'
import { mergeTodos } from '../../../electron/main/agent/agent-todo-store'

describe('agent-context-inject', () => {
  const sessionId = 'test-session-inject'

  beforeEach(() => {
    mergeTodos(sessionId, [])
  })

  it('无 todo 时不注入', () => {
    expect(buildTodoReminderInjection(sessionId)).toBeNull()
  })

  it('有 todo 时注入列表', () => {
    mergeTodos(sessionId, [
      { id: 't1', content: '读路由', status: 'in_progress' },
      { id: 't2', content: '读参考页', status: 'pending' },
    ])
    const block = buildTodoReminderInjection(sessionId)
    expect(block).toContain('todo list')
    expect(block).toContain('[in_progress] 读路由')
    expect(block).toContain('[pending] 读参考页')
  })

  it('scratchpad 无摘要时不注入', async () => {
    const block = await buildScratchpadInjection('no-such-session-xyz')
    expect(block).toBeNull()
  })

  it('scratchpad 有 explore-summary 时注入', async () => {
    const { writeScratchpadNote } = await import('../../../electron/main/agent/agent-scratchpad')
    const sid = 'scratch-inject-test'
    await writeScratchpadNote(sid, 'explore-summary.md', '参考页: src/views/order/index.vue')
    const block = await buildScratchpadInjection(sid)
    expect(block).toContain('Prior explore sub-agent summary')
    expect(block).toContain('order/index.vue')
    const root = path.join(
      (await import('../../../electron/main/axecoder-dir')).axecoderPath('scratchpad'),
      sid,
    )
    await fs.rm(root, { recursive: true, force: true }).catch(() => {})
  })
})
