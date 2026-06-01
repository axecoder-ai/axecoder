import { describe, expect, it } from 'vitest'
import {
  answerWorkshopQuestion,
  nextEmployeePhase,
  scriptedRoleSpeaker,
  startWorkshopRun,
} from '../../../electron/main/workshop/workshop-orchestrator'
import { newWorkshopSession } from '../../../electron/main/workshop/workshop-store'
import type { RoleSpeaker } from '../../../electron/main/workshop/workshop-types'

describe('workshop-orchestrator', () => {
  it('speaking 在 speaker 执行前触发', async () => {
    const order: string[] = []
    const speaker: RoleSpeaker = async () => {
      order.push('speaker')
      return { summary: 'ok' }
    }
    const session = newWorkshopSession('/tmp/p', '任务', 'm1')
    await startWorkshopRun(session, '任务', speaker, (roleId, status) => {
      order.push(`${roleId}:${status}`)
    })
    const speakingIdx = order.indexOf('manager:speaking')
    const speakerIdx = order.indexOf('speaker')
    expect(speakingIdx).toBeGreaterThanOrEqual(0)
    expect(speakerIdx).toBeGreaterThan(speakingIdx)
  })

  it('nextEmployeePhase 顺序正确', () => {
    expect(nextEmployeePhase('idle')).toBe('manager')
    expect(nextEmployeePhase('manager')).toBe('backend')
    expect(nextEmployeePhase('tester')).toBe('done')
  })

  it('scripted 全流程至 done', async () => {
    const session = newWorkshopSession('/tmp/p', '实现用户中心页面', 'm1')
    const res = await startWorkshopRun(session, '实现用户中心页面', scriptedRoleSpeaker)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.phase).toBe('done')
    const roles = res.session.messages.map((m) => m.roleId)
    expect(roles).toContain('manager')
    expect(roles).toContain('backend')
    expect(roles).toContain('frontend')
    expect(roles).toContain('tester')
    expect(roles.filter((r) => r === 'system').length).toBeGreaterThanOrEqual(4)
  })

  it('含问号时挂起 waiting_user 并可恢复', async () => {
    const session = newWorkshopSession('/tmp/p', '需要登录吗？优先级？', 'm1')
    const start = await startWorkshopRun(
      session,
      '需要登录吗？优先级？',
      scriptedRoleSpeaker,
    )
    expect(start.ok).toBe(true)
    if (!start.ok) return
    expect(start.session.phase).toBe('waiting_user')
    expect(start.session.pendingQuestion).toBeTruthy()

    const cont = await answerWorkshopQuestion(
      start.session,
      '先做 OAuth，P0',
      scriptedRoleSpeaker,
    )
    expect(cont.ok).toBe(true)
    if (!cont.ok) return
    expect(cont.session.phase).toBe('done')
    expect(cont.session.messages.some((m) => m.roleId === 'user' && m.text.includes('OAuth'))).toBe(
      true,
    )
  })
})
