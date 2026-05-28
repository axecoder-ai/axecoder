import { describe, expect, it } from 'vitest'
import {
  advanceInitProgress,
  INIT_PROGRESS_LABELS,
  type InitProgressStep,
} from '../../../src/utils/background-init-progress'

describe('background-init-progress', () => {
  it('start 将当前步骤标为 active', () => {
    const steps = advanceInitProgress([], { type: 'stage', stage: 'scan', status: 'start' })
    expect(steps).toHaveLength(1)
    expect(steps[0]).toEqual({
      id: 'scan',
      label: INIT_PROGRESS_LABELS.scan,
      status: 'active',
    })
  })

  it('done 将步骤标为完成并推进下一阶段', () => {
    let steps: InitProgressStep[] = advanceInitProgress([], {
      type: 'stage',
      stage: 'scan',
      status: 'start',
    })
    steps = advanceInitProgress(steps, { type: 'stage', stage: 'scan', status: 'done' })
    steps = advanceInitProgress(steps, { type: 'stage', stage: 'inspect', status: 'start' })
    expect(steps.find((s) => s.id === 'scan')?.status).toBe('done')
    expect(steps.find((s) => s.id === 'inspect')?.status).toBe('active')
  })

  it('file 更新当前查看路径', () => {
    let steps = advanceInitProgress([], { type: 'stage', stage: 'inspect', status: 'start' })
    steps = advanceInitProgress(steps, {
      type: 'file',
      relativePath: '背景资料/参数.md',
      current: 2,
      total: 10,
    })
    const inspect = steps.find((s) => s.id === 'inspect')
    expect(inspect?.status).toBe('active')
    expect(inspect?.label).toContain('背景资料/参数.md')
    expect(inspect?.label).toContain('2/10')
  })

  it('error 标记失败', () => {
    let steps = advanceInitProgress([], { type: 'stage', stage: 'scan', status: 'start' })
    steps = advanceInitProgress(steps, { type: 'stage', stage: 'scan', status: 'error' })
    expect(steps.find((s) => s.id === 'scan')?.status).toBe('error')
  })

  it('ai 进度更新 aiExtract 步骤', () => {
    let steps = advanceInitProgress([], { type: 'stage', stage: 'aiExtract', status: 'start' })
    steps = advanceInitProgress(steps, {
      type: 'ai',
      phase: 'think',
      relativePath: '技术参数.md',
      text: '文件含数据库版本要求',
      current: 1,
      total: 2,
      round: 2,
    })
    expect(steps.find((s) => s.id === 'aiExtractFull')?.status).toBe('active')
    expect(steps.find((s) => s.id === 'aiExtractFull')?.label).toContain('技术参数.md')
  })
})
