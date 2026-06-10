import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildRoleTaskPrompt,
  detectNeedsUserClarification,
  extractRelatedFiles,
  parseSubagentReport,
  subagentTypeForRole,
} from '../../../electron/main/workshop/workshop-subagent-speaker'

vi.mock('../../../electron/main/agent/agent-subagent', () => ({
  runSubAgentTask: vi.fn(),
}))

describe('workshop-subagent-speaker', () => {
  it('extractRelatedFiles 从报告提取路径', () => {
    const files = extractRelatedFiles('已查看 zhongzhi/foo.py 与 src/api/handler.ts')
    expect(files.some((f) => f.includes('zhongzhi'))).toBe(true)
    expect(files.some((f) => f.includes('handler'))).toBe(true)
  })

  it('buildRoleTaskPrompt 注入回复语言', () => {
    const p = buildRoleTaskPrompt(
      {
        roleId: 'backend',
        userBrief: '查看 zhongzhi 收款助手',
        priorSummary: '',
      },
      '中文',
    )
    expect(p).toContain('Always respond in 中文')
  })

  it('buildRoleTaskPrompt 要求使用工具读代码', () => {
    const p = buildRoleTaskPrompt({
      roleId: 'backend',
      userBrief: '查看 zhongzhi 收款助手',
      priorSummary: '',
    })
    expect(p).toContain('Read')
    expect(p).toContain('zhongzhi')
  })

  it('manager_chat 与 Agent 模式同能力（非只读）', () => {
    const p = buildRoleTaskPrompt({
      roleId: 'manager',
      userBrief: '库存 schema',
      priorSummary: '',
      speakMode: 'manager_chat',
      assigneeUser: { id: 'u-m', displayName: 'Tech Lead', role: 'Tech Lead', isBuiltin: true, builtinRole: 'manager' },
    })
    expect(p).not.toMatch(/Read-only/i)
    expect(p).toContain('Chat Agent mode')
    expect(p).toContain('CodeGraph')
  })

  it('经理报告含澄清且未读代码时 needsUser', () => {
    const r = detectNeedsUserClarification(
      'manager',
      '实现功能',
      'NEED_CLARIFICATION: please clarify the business scenario. No codebase inspection yet.',
    )
    expect(r.needsUser).toBe(true)
  })

  it('经理已读代码时不挂起', () => {
    const r = detectNeedsUserClarification(
      'manager',
      '实现功能?',
      '已查看 zhongzhi 模块，Read 完成，结论如下。',
    )
    expect(r.needsUser).toBe(false)
  })

  it('subagentType 经理测试只读', () => {
    expect(subagentTypeForRole('manager')).toBe('explore')
    expect(subagentTypeForRole('backend')).toBe('generalPurpose')
  })

  it('parseSubagentReport 截断摘要', () => {
    const out = parseSubagentReport('x'.repeat(3000), 'backend', '任务')
    expect(out.summary.length).toBeLessThanOrEqual(2000)
  })
})

describe('buildSubagentRoleSpeaker integration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('调用 runSubAgentTask 并返回摘要', async () => {
    const { runSubAgentTask } = await import('../../../electron/main/agent/agent-subagent')
    vi.mocked(runSubAgentTask).mockResolvedValue({
      ok: true,
      report: '已 Grep zhongzhi，发现收款助手在 zhongzhi/pay.py',
    })
    const { buildSubagentRoleSpeaker } = await import(
      '../../../electron/main/workshop/workshop-subagent-speaker'
    )
    const deltas: string[] = []
    const speaker = buildSubagentRoleSpeaker('/tmp/proj', 'model-1', 'ws-1', (_sid, d) => {
      deltas.push(d)
    })
    const out = await speaker({
      roleId: 'backend',
      userBrief: '查看 zhongzhi',
      priorSummary: '',
    })
    expect(out.summary).toContain('zhongzhi')
    expect(runSubAgentTask).toHaveBeenCalled()
    const call = vi.mocked(runSubAgentTask).mock.calls[0]
    expect(call?.[3]?.onDelta).toBeTypeOf('function')
    expect(call?.[3]?.maxTurns).toBe(14)
    expect(call?.[3]?.partialReportOnMaxTurns).toBe(true)
  })
})
