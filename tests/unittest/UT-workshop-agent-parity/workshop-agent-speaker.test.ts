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
    const speaker = buildAgentRoleSpeaker('/tmp/proj', 'm1', 'ws-1', () => undefined)
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

  it('member 回合默认 workshopAgentParity + reuseSession', async () => {
    const { runWorkshopRoleAgentTurn } = await import('../../../electron/main/agent/agent-loop')
    vi.mocked(runWorkshopRoleAgentTurn).mockClear()
    vi.mocked(runWorkshopRoleAgentTurn).mockResolvedValue({
      ok: true,
      report: 'done',
    })
    const { buildAgentRoleSpeaker } = await import(
      '../../../electron/main/workshop/workshop-agent-speaker'
    )
    const speaker = buildAgentRoleSpeaker('/tmp/proj', 'm1', 'ws-1', () => undefined)
    await speaker({
      roleId: 'backend',
      userBrief: 'fix bug',
      priorSummary: '',
      speakMode: 'member',
      assigneeUser: {
        id: 'u-dev',
        displayName: 'Dev',
        role: 'Developer',
        isBuiltin: true,
        builtinRole: 'developer',
      },
    })
    const opts = vi.mocked(runWorkshopRoleAgentTurn).mock.calls.at(-1)?.[5]
    expect(opts?.workshopAgentParity).toBe(true)
    expect(opts?.reuseSession).toBe(true)
    expect(opts?.sopAgentParity).toBeUndefined()
  })
})

describe('resolveWorkshopAgentParity', () => {
  it('SOP 回合不启用 workshop parity', async () => {
    const { resolveWorkshopAgentParity } = await import(
      '../../../electron/main/workshop/workshop-agent-speaker'
    )
    expect(
      resolveWorkshopAgentParity({
        roleId: 'backend',
        userBrief: 'x',
        priorSummary: '',
        speakMode: 'member',
        sopAgentParity: true,
      }),
    ).toBe(false)
  })
})
