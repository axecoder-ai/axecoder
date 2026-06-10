import { describe, expect, it, vi } from 'vitest'
import { parseCoordinatorTasks, runCoordinatorTasks } from '../../../electron/main/coordinator/coordinator-agent'

vi.mock('../../../electron/main/agent/agent-subagent', () => ({
  runSubAgentTask: vi.fn(async (_root: string, _model: string, prompt: string) => ({
    ok: true,
    agentId: `agent-${prompt.slice(0, 8)}`,
    report: `done: ${prompt}`,
  })),
}))

describe('coordinator-agent parseCoordinatorTasks', () => {
  it('rejects empty tasks', () => {
    expect(parseCoordinatorTasks([])).toEqual({ error: 'tasks must be a non-empty array' })
  })

  it('parses valid tasks', () => {
    const r = parseCoordinatorTasks([
      { description: 'scan', prompt: 'find auth module', subagent_type: 'explore' },
    ])
    expect(Array.isArray(r)).toBe(true)
    if (Array.isArray(r)) {
      expect(r[0].description).toBe('scan')
      expect(r[0].subagent_type).toBe('explore')
    }
  })
})

describe('coordinator-agent runCoordinatorTasks', () => {
  it('runs tasks in parallel by default', async () => {
    const r = await runCoordinatorTasks({
      projectRoot: '/tmp/p',
      modelId: 'm1',
      tasks: [
        { description: 'a', prompt: 'task-a' },
        { description: 'b', prompt: 'task-b' },
      ],
    })
    expect(r.ok).toBe(true)
    expect(r.results).toHaveLength(2)
    expect(r.summary).toContain('2 subtask(s)')
  })

  it('runs serial when parallel is false', async () => {
    const r = await runCoordinatorTasks({
      projectRoot: '/tmp/p',
      modelId: 'm1',
      parallel: false,
      tasks: [
        { description: 'first', prompt: 'one' },
        { description: 'second', prompt: 'two' },
      ],
    })
    expect(r.results).toHaveLength(2)
    expect(r.results.every((x) => x.ok)).toBe(true)
  })
})
