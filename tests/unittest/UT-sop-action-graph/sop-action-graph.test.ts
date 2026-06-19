import { describe, expect, it } from 'vitest'
import { MessagePool } from '../../../electron/main/sop/message-pool'
import {
  actionDepsMetForIntent,
  completedActions,
  nextRunnablePhase,
  resolveStartPhase,
} from '../../../electron/main/sop/sop-action-graph'
import { classifySopIntent, startPhaseForIntent } from '../../../electron/main/sop/sop-intent'

describe('sop-intent', () => {
  it('有源码且短句 fix → incremental', () => {
    expect(classifySopIntent('修复登录 bug', true)).toBe('incremental')
    expect(startPhaseForIntent('incremental')).toBe('tasks')
  })

  it('绿场需求', () => {
    expect(classifySopIntent('从零实现积分商城', false)).toBe('greenfield')
  })
})

describe('sop-action-graph', () => {
  it('增量 intent：WriteTasks 仅需 UserRequirement', () => {
    const done = new Set(['UserRequirement'] as const)
    expect(actionDepsMetForIntent('WriteTasks', done, 'incremental')).toBe(true)
    expect(actionDepsMetForIntent('WriteTasks', new Set(), 'greenfield')).toBe(false)
  })

  it('implement 完成后下一阶段为 qa', () => {
    const pool = new MessagePool()
    pool.publish({ causeBy: 'UserRequirement', phase: 'requirement', content: 'x' })
    pool.publish({ causeBy: 'WritePRD', phase: 'prd', content: 'p' })
    pool.publish({ causeBy: 'WriteDesign', phase: 'design', content: 'd' })
    pool.publish({ causeBy: 'WriteTasks', phase: 'tasks', content: 't' })
    pool.publish({ causeBy: 'WriteCode', phase: 'implement', content: 'c' })
    expect(completedActions(pool).has('WriteCode')).toBe(true)
    expect(nextRunnablePhase('implement', pool, 'greenfield')).toBe('qa')
  })

  it('resolveStartPhase incremental', () => {
    const pool = new MessagePool()
    pool.publish({ causeBy: 'UserRequirement', phase: 'requirement', content: 'fix bug' })
    expect(resolveStartPhase('incremental', completedActions(pool))).toBe('tasks')
  })
})
