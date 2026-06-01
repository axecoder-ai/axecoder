import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../electron/main/agent/agent-loop', () => ({
  runWorkshopRoleAgentTurn: vi.fn(),
}))

describe('buildAgentRoleSpeaker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('调用 runWorkshopRoleAgentTurn 并解析报告', async () => {
    const { runWorkshopRoleAgentTurn } = await import('../../../electron/main/agent/agent-loop')
    vi.mocked(runWorkshopRoleAgentTurn).mockResolvedValue({
      ok: true,
      report: '已 Grep zhongzhi，结论如下',
    })
    const { buildAgentRoleSpeaker } = await import(
      '../../../electron/main/workshop/workshop-agent-speaker'
    )
    const speaker = buildAgentRoleSpeaker('/tmp/proj', 'm1', 'ws-1')
    const out = await speaker({
      roleId: 'manager',
      userBrief: '研究 zhongzhi',
      priorSummary: '',
    })
    expect(out.summary).toContain('zhongzhi')
    expect(runWorkshopRoleAgentTurn).toHaveBeenCalled()
    const sid = vi.mocked(runWorkshopRoleAgentTurn).mock.calls[0]?.[2]
    expect(sid).toBe('workshop-ws-1-manager')
  })
})
