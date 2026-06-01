import { describe, expect, it } from 'vitest'
import {
  activeProgressHeadline,
  applyProgressPayload,
  labelForModelTurn,
  labelForToolDone,
  labelForToolStart,
  sliceProgressStepsForDisplay,
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

  it('stores toolName and summary on tool steps', () => {
    let steps: AgentProgressStep[] = []
    steps = applyProgressPayload(steps, {
      ...base('s1'),
      kind: 'tool',
      status: 'start',
      toolName: 'Glob',
      summary: 'Glob *',
    })
    expect(steps[0].toolName).toBe('Glob')
    expect(steps[0].summary).toBe('Glob *')
  })
})

describe('progress display helpers', () => {
  const mk = (id: string, status: AgentProgressStep['status']): AgentProgressStep => ({
    id,
    phase: 'tool',
    turn: 1,
    label: id,
    status,
    toolName: 'Read',
    summary: id,
  })

  it('activeProgressHeadline prefers active tool name', () => {
    const steps = [mk('a', 'done'), mk('b', 'active')]
    expect(activeProgressHeadline(steps)).toBe('Read')
  })

  it('sliceProgressStepsForDisplay collapses old done steps', () => {
    const steps = Array.from({ length: 8 }, (_, i) => mk(`s${i}`, 'done'))
    steps.push({ ...mk('active', 'active'), id: 'active', status: 'active' })
    const { visible, hiddenCount } = sliceProgressStepsForDisplay(steps, false, 5)
    expect(hiddenCount).toBe(3)
    expect(visible).toHaveLength(6)
    expect(visible[visible.length - 1].status).toBe('active')
  })
})
