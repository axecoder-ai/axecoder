import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredAgentSession } from '../../../electron/main/agent/agent-session-store'
import {
  createSessionId,
  putSession,
} from '../../../electron/main/agent/agent-session-store'
import {
  confirmAgentAllWrites,
  rejectAgentAllWrites,
} from '../../../electron/main/agent/agent-loop'
import type { PendingBashInternal, PendingWriteInternal } from '../../../electron/main/agent/tool-executor'

vi.mock('../../../electron/main/ai/chat-with-tools', () => ({
  chatWithToolsForModel: vi.fn(async () => ({
    ok: true,
    text: 'ok',
    toolCalls: [],
    content: 'ok',
    reasoningContent: undefined,
  })),
}))

vi.mock('../../../electron/main/models-store', () => ({
  getModelById: vi.fn(async () => ({
    id: 'm1',
    provider: 'openai',
    modelId: 'gpt-test',
    enabled: true,
  })),
}))

vi.mock('../../../electron/main/secrets-store', () => ({
  getSecret: vi.fn(async () => 'key'),
}))

vi.mock('../../../electron/main/agent/agent-progress-emit', () => ({
  emitAgentProgress: vi.fn(),
}))

const makePending = (
  id: string,
  toolCallId: string,
  applyFn: () => Promise<{ ok: true } | { ok: false; error: string }>,
): PendingWriteInternal => ({
  id,
  toolCallId,
  tool: 'Edit',
  filePath: `/proj/${id}.go`,
  summary: `Edit ${id}`,
  patchText: 'diff',
  apply: applyFn,
})

const makeSession = (
  pending: PendingWriteInternal[],
  pendingBash: PendingBashInternal[] = [],
): StoredAgentSession => {
  const pendingById = new Map(pending.map((p) => [p.id, p]))
  const pendingBashById = new Map(pendingBash.map((p) => [p.id, p]))
  const messages = [
    ...pending.map((p) => ({
      role: 'tool' as const,
      toolCallId: p.toolCallId,
      name: 'Edit' as const,
      content: 'Pending user approval for this change.',
    })),
    ...pendingBash.map((p) => ({
      role: 'tool' as const,
      toolCallId: p.toolCallId,
      name: 'Bash' as const,
      content: 'Pending user approval to run this command.',
    })),
  ]
  return {
    projectRoot: '/proj',
    modelId: 'm1',
    messages: [{ role: 'system', content: 'sys' }, ...messages],
    ctx: { projectRoot: '/proj', readCache: new Set() },
    toolLog: [],
    pendingById,
    pendingBashById,
    pendingAskById: new Map(),
    turn: 0,
  }
}

describe('agent bulk confirm/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirmAgentAllWrites 应用全部 pending 并继续循环', async () => {
    let applied = 0
    const p1 = makePending('p1', 'tc1', async () => {
      applied++
      return { ok: true }
    })
    const p2 = makePending('p2', 'tc2', async () => {
      applied++
      return { ok: true }
    })
    const sessionId = createSessionId()
    putSession(sessionId, makeSession([p1, p2]))

    const res = await confirmAgentAllWrites(sessionId)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.status).toBe('done')
    expect(applied).toBe(2)
  })

  it('rejectAgentAllWrites 清空全部 pending', async () => {
    const p1 = makePending('p1', 'tc1', async () => ({ ok: true }))
    const p2 = makePending('p2', 'tc2', async () => ({ ok: true }))
    const session = makeSession([p1, p2])
    const sessionId = createSessionId()
    putSession(sessionId, session)

    const res = await rejectAgentAllWrites(sessionId)
    expect(res.ok).toBe(true)
    expect(session.pendingById.size).toBe(0)
    expect(session.pendingBashById.size).toBe(0)
    const toolMsgs = session.messages.filter((m) => m.role === 'tool')
    expect(toolMsgs.every((m) => m.content.includes('Rejected by user'))).toBe(true)
  })

  it('confirmAgentAllWrites 同时应用 pending Bash', async () => {
    let ran = false
    const bashPending: PendingBashInternal = {
      id: 'b1',
      toolCallId: 'tc-b1',
      command: 'echo hi',
      apply: async () => {
        ran = true
        return { ok: true, content: 'Exit code: 0\n\nstdout:\nhi', logOk: true }
      },
    }
    const sessionId = createSessionId()
    putSession(sessionId, makeSession([], [bashPending]))

    const res = await confirmAgentAllWrites(sessionId)
    expect(res.ok).toBe(true)
    expect(ran).toBe(true)
  })
})
