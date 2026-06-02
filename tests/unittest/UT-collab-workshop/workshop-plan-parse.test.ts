import { describe, expect, it } from 'vitest'
import {
  parseManagerStepPlan,
  parseManagerVerifyDecision,
} from '../../../electron/main/workshop/workshop-plan-parse'

const users = [
  {
    id: 'builtin-manager',
    displayName: '经理',
    role: '技术经理',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'manager' as const,
  },
  { id: 'u1', displayName: '后端', role: '后端工程师', expertise: '', avatarPath: '' },
]

describe('workshop-plan-parse', () => {
  it('解析 JSON 步骤计划', () => {
    const text = '计划如下\n```json\n{"steps":[{"id":"s1","title":"API","assigneeUserId":"u1"}]}\n```'
    const res = parseManagerStepPlan(text, users)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.plan.steps).toHaveLength(1)
    expect(res.plan.steps[0].assigneeUserId).toBe('u1')
    expect(res.plan.steps[0].status).toBe('pending')
  })

  it('拒绝未知 userId', () => {
    const text = '{"steps":[{"id":"s1","title":"x","assigneeUserId":"nope"}]}'
    const res = parseManagerStepPlan(text, users)
    expect(res.ok).toBe(false)
  })

  it('拒绝指派经理', () => {
    const text = '{"steps":[{"id":"s1","title":"x","assigneeUserId":"builtin-manager"}]}'
    const res = parseManagerStepPlan(text, users)
    expect(res.ok).toBe(false)
  })

  it('解析验收指令', () => {
    expect(parseManagerVerifyDecision('VERIFY: redo\n请修改').action).toBe('redo')
    expect(parseManagerVerifyDecision('VERIFY: approve').action).toBe('approve')
    expect(parseManagerVerifyDecision('VERIFY: abort').action).toBe('abort')
  })
})
