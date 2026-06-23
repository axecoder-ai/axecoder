import { describe, expect, it, vi } from 'vitest'
import { runTasksImplementBatch } from '../../../electron/main/sop/sop-task-runner'
import type { MessagePool } from '../../../electron/main/sop/message-pool'
import type { RoleSpeaker, WorkshopSession } from '../../../electron/main/workshop/workshop-types'
import type { UserEntry } from '../../../electron/main/users-types'

describe('runTasksImplementBatch', () => {
  it('多 task 仅调用 speaker 一次', async () => {
    const speaker = vi.fn<RoleSpeaker>(async (inp) => {
      expect(inp.sopAgentParity).toBe(true)
      expect(inp.reuseImplementSession).toBe(true)
      expect(inp.priorSummary).toContain('t1')
      expect(inp.priorSummary).toContain('t2')
      return { summary: 'batch done', relatedFiles: ['src/a.ts'] }
    })
    const session = {
      userBrief: 'todo',
      sopPhase: 'implement',
      phase: 'running',
      messages: [],
    } as WorkshopSession
    const developer = {
      id: 'd1',
      isBuiltin: true,
      builtinRole: 'developer',
      displayName: 'Dev',
      role: 'dev',
    } as UserEntry
    const pool = { contextForWatch: () => '', publish: vi.fn() } as unknown as MessagePool

    const res = await runTasksImplementBatch({
      session,
      pool,
      developer,
      speaker,
      tasksDoc: {
        title: 'T',
        tasks: [
          { id: 't1', title: 'a', deps: [] },
          { id: 't2', title: 'b', deps: ['t1'] },
        ],
      },
      projectRoot: '',
      pushChat: () => {},
    })
    expect(res.ok).toBe(true)
    expect(speaker).toHaveBeenCalledTimes(1)
    if (res.ok && !('waiting' in res)) {
      expect(res.relatedFiles).toContain('src/a.ts')
    }
  })
})
