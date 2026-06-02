import { describe, expect, it, beforeEach } from 'vitest'
import { putSession, getSession } from '../../../electron/main/agent/agent-session-store'
import { stopAgentTurn } from '../../../electron/main/agent/agent-loop'
import type { StoredAgentSession } from '../../../electron/main/agent/agent-session-store'

const makeSession = (): StoredAgentSession => ({
  projectRoot: '/tmp/p',
  modelId: 'm1',
  messages: [{ role: 'user', content: 'hi' }],
  ctx: { projectRoot: '/tmp/p', readCache: new Set() },
  toolLog: [],
  pendingById: new Map(),
  pendingBashById: new Map(),
  pendingAskById: new Map(),
  turn: 0,
  planMode: false,
  revealedToolNames: new Set(),
  activeTools: [],
  proactiveEnabled: false,
  proactiveTick: 0,
  scratchpadDir: '/tmp/scratch',
  compactedOnce: false,
})

describe('stopAgentTurn', () => {
  beforeEach(() => {
    putSession('stop-test-1', makeSession())
  })

  it('标记 abort 并返回 ok', () => {
    const res = stopAgentTurn('stop-test-1')
    expect(res.ok).toBe(true)
    expect(getSession('stop-test-1')?.abortRequested).toBe(true)
  })

  it('无会话时失败', () => {
    const res = stopAgentTurn('missing-session')
    expect(res.ok).toBe(false)
  })
})
