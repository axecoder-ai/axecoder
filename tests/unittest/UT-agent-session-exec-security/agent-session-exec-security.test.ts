import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  listAgentCheckpoints,
  pushAgentCheckpoint,
  rewindAgentCheckpoint,
  trackCheckpointFileCtx,
} from '../../../electron/main/agent/agent-checkpoint'
import type { StoredAgentSession } from '../../../electron/main/agent/agent-session-store'
import { createLoopGuardState } from '../../../electron/main/agent/agent-loop-guard'
import { listBackgroundRuns, putBackgroundRun } from '../../../electron/main/agent/agent-subagent-tasks'
import { registerBuiltinSlashCommands } from '../../../src/slash-commands/builtin'

vi.mock('../../../electron/main/agent/agent-fs', () => ({
  writeProjectFile: vi.fn(async () => undefined),
}))

vi.mock('../../../electron/main/agent/agent-progress-emit', () => ({
  emitAgentProgress: vi.fn(),
}))

const baseSession = (): StoredAgentSession => ({
  projectRoot: '/tmp/proj',
  modelId: 'm1',
  messages: [{ role: 'user', content: 'hi' }],
  ctx: {
    projectRoot: '/tmp/proj',
    readCache: new Set(),
    modelId: 'm1',
    sessionId: 'agent-1',
  },
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
  loopGuard: createLoopGuardState(),
})

describe('agent-checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('push and list checkpoints', () => {
    const s = baseSession()
    trackCheckpointFileCtx(s.ctx, 'a.txt', 'old')
    const cp = pushAgentCheckpoint('agent-1', s)
    expect(cp.fileCount).toBe(1)
    const list = listAgentCheckpoints('agent-1')
    expect(list.some((c) => c.id === cp.id)).toBe(true)
  })

  it('rewind restores messages', async () => {
    const s = baseSession()
    pushAgentCheckpoint('agent-2', s)
    s.turn = 1
    s.messages.push({ role: 'assistant', content: 'done' })
    const res = await rewindAgentCheckpoint('agent-2', s)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(s.messages).toEqual([{ role: 'user', content: 'hi' }])
      expect(s.turn).toBe(0)
    }
  })
})

describe('background subagent tasks', () => {
  it('lists runs by sessionId', () => {
    putBackgroundRun({
      id: 't1',
      description: 'test',
      status: 'running',
      report: '',
      startedAt: Date.now(),
      sessionId: 'sess-a',
    })
    putBackgroundRun({
      id: 't2',
      description: 'other',
      status: 'completed',
      report: 'ok',
      startedAt: Date.now(),
      sessionId: 'sess-b',
    })
    expect(listBackgroundRuns('sess-a').map((r) => r.id)).toEqual(['t1'])
  })
})

describe('slash commands', () => {
  it('registers session/exec commands', () => {
    const names = registerBuiltinSlashCommands().map((c) => c.name)
    expect(names).toContain('resume')
    expect(names).toContain('export')
    expect(names).toContain('init')
    expect(names).toContain('memory')
    expect(names).toContain('rewind')
  })
})
