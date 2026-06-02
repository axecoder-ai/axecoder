import { describe, expect, it } from 'vitest'
import { formatWorkshopRoleDisplay } from '../../../electron/main/workshop/workshop-display'
import { parseManagerStepPlan } from '../../../electron/main/workshop/workshop-plan-parse'

const users = [
  {
    id: 'u1',
    displayName: '海燕',
    role: '前端工程师',
    expertise: '',
    avatarPath: '',
  },
]

describe('workshop-display', () => {
  it('plan 模式只展示中文步骤摘要', () => {
    const report = `Let me explore the codebase...\n\n\`\`\`json\n{"steps":[{"id":"s1","title":"前端页面","assigneeUserId":"u1"}]}\n\`\`\``
    const d = formatWorkshopRoleDisplay(report, 'plan', users)
    expect(d.summary).toContain('前端页面')
    expect(d.summary).not.toContain('Let me explore')
    expect(parseManagerStepPlan(d.planSource, users).ok).toBe(true)
  })

  it('execute 模式去掉英文过程', () => {
    const report = 'Let me read files.\n\n结论：接口已在 handler 中实现。'
    const d = formatWorkshopRoleDisplay(report, 'execute', users)
    expect(d.summary).toContain('结论')
    expect(d.summary).not.toContain('Let me')
  })
})
