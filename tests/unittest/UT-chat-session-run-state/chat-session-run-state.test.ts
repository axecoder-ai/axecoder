import { describe, expect, it } from 'vitest'
import {
  createEmptyRunState,
  deriveTabDotStatus,
  mergeSubagentTaskProgress,
  sessionHasPendingInteraction,
} from '../../../src/utils/chat-session-run-state'
import type { ChatMessage } from '../../../src/types/axecoder'

describe('chat-session-run-state', () => {
  it('sessionHasPendingInteraction 检测待审批消息', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'assistant',
        text: 'ok',
        pendingWrites: [{ id: 'p1', tool: 'Write', filePath: 'a.ts', summary: 'x', patchText: '' }],
      },
    ]
    expect(sessionHasPendingInteraction(msgs)).toBe(true)
    expect(sessionHasPendingInteraction([{ role: 'user', text: 'hi' }])).toBe(false)
  })

  it('deriveTabDotStatus 优先级：运行 > 待审批 > 完成未读', () => {
    const run = createEmptyRunState()
    const msgs: ChatMessage[] = [{ role: 'user', text: 'hi' }]

    run.loading = true
    expect(deriveTabDotStatus(run, msgs, false)).toBe('running')

    run.loading = false
    run.completedUnread = true
    expect(deriveTabDotStatus(run, msgs, false)).toBe('completed-unread')
    expect(deriveTabDotStatus(run, msgs, true)).toBe(null)

    const pendingMsgs: ChatMessage[] = [
      { role: 'assistant', text: 'confirm', pendingBashes: [{ id: 'b1', command: 'npm test' }] },
    ]
    run.completedUnread = true
    expect(deriveTabDotStatus(run, pendingMsgs, false)).toBe('pending')
  })

  it('mergeSubagentTaskProgress 更新子任务状态', () => {
    const first = mergeSubagentTaskProgress([], {
      taskId: 't1',
      description: 'research',
      status: 'running',
    })
    expect(first).toHaveLength(1)
    const done = mergeSubagentTaskProgress(first, {
      taskId: 't1',
      description: 'research',
      status: 'completed',
    })
    expect(done[0]?.status).toBe('completed')
  })
})
