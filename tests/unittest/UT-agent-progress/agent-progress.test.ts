import { describe, expect, it } from 'vitest'
import {
  applyProgressPayload,
  labelForModelTurn,
  labelForToolDone,
  labelForToolStart,
  type AgentProgressStep,
} from '../../../src/utils/agent-progress'

describe('agent-progress labels', () => {
  it('model turn label', () => {
    expect(labelForModelTurn(2)).toContain('2')
    expect(labelForModelTurn(2)).toContain('模型')
  })

  it('tool start/done labels', () => {
    expect(labelForToolStart('Read', 'a.md')).toContain('Read')
    expect(labelForToolDone('Read', 'a.md', true)).toContain('完成')
    expect(labelForToolDone('Edit', 'x', false)).toContain('失败')
  })
})

describe('applyProgressPayload', () => {
  const base = (sessionId: string) => ({
    sessionId,
    turn: 1,
  })

  it('accumulates model then tool steps', () => {
    let steps: AgentProgressStep[] = []
    steps = applyProgressPayload(steps, {
      ...base('s1'),
      kind: 'model',
      status: 'start',
    })
    expect(steps).toHaveLength(1)
    expect(steps[0].status).toBe('active')
    expect(steps[0].phase).toBe('model')

    steps = applyProgressPayload(steps, {
      ...base('s1'),
      kind: 'tool',
      status: 'start',
      toolName: 'Read',
      summary: 'Read foo.md',
    })
    expect(steps).toHaveLength(2)
    expect(steps[0].status).toBe('done')
    expect(steps[1].status).toBe('active')

    steps = applyProgressPayload(steps, {
      ...base('s1'),
      kind: 'tool',
      status: 'done',
      toolName: 'Read',
      summary: 'Read foo.md',
      ok: true,
    })
    expect(steps[1].status).toBe('done')
  })

  it('marks tool step as error when ok is false', () => {
    let steps: AgentProgressStep[] = []
    steps = applyProgressPayload(steps, {
      ...base('s1'),
      kind: 'tool',
      status: 'start',
      toolName: 'Edit',
      summary: 'Edit bar.md',
    })
    steps = applyProgressPayload(steps, {
      ...base('s1'),
      kind: 'tool',
      status: 'done',
      toolName: 'Edit',
      summary: 'Edit bar.md',
      ok: false,
    })
    expect(steps[0].status).toBe('error')
  })
})
