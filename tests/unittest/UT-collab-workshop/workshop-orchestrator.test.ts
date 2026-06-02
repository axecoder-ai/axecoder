import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  answerWorkshopQuestion,
  nextEmployeePhase,
  scriptedRoleSpeaker,
  startWorkshopRun,
  workshopApiRole,
} from '../../../electron/main/workshop/workshop-orchestrator'
import { newWorkshopSession } from '../../../electron/main/workshop/workshop-store'
import type { RoleSpeaker, RoleSpeakInput } from '../../../electron/main/workshop/workshop-types'

const seedWorkshopUsersFile = async (dir: string) => {
  await fs.writeFile(
    path.join(dir, 'users.json'),
    JSON.stringify({
      schemaVersion: 1,
      users: [
        {
          id: 'builtin-manager',
          displayName: '经理',
          role: '技术经理',
          expertise: '',
          avatarPath: '',
          isBuiltin: true,
          builtinRole: 'manager',
        },
        { id: 'u-backend', displayName: '后端同学', role: '后端', expertise: '', avatarPath: '' },
        { id: 'u-frontend', displayName: '前端同学', role: '前端', expertise: '', avatarPath: '' },
        { id: 'u-tester', displayName: '测试同学', role: '测试', expertise: '', avatarPath: '' },
      ],
    }),
    'utf-8',
  )
}

describe('workshop-orchestrator', () => {
  let testDir = ''

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ws-users-'))
    setAxecoderDirForTests(testDir)
    await seedWorkshopUsersFile(testDir)
  })

  afterEach(() => {
    setAxecoderDirForTests(null)
  })

  it('scripted 拆步并逐步执行至 done', async () => {
    const session = newWorkshopSession('/tmp/p', '实现用户中心页面', 'm1')
    const res = await startWorkshopRun(session, '实现用户中心页面', scriptedRoleSpeaker)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.phase).toBe('done')
    expect(res.session.stepPlan?.length).toBe(3)
    expect(res.session.messages.some((m) => m.roleId === 'manager' && !m.hidden)).toBe(true)
    expect(res.session.messages.some((m) => m.speakerUserId === 'u-backend')).toBe(true)
  })

  it('经理验收 redo 后重做当前步', async () => {
    let execCount = 0
    const speaker: RoleSpeaker = async (input: RoleSpeakInput) => {
      if (input.speakMode === 'plan') return scriptedRoleSpeaker(input)
      if (input.speakMode === 'verify') {
        if (execCount < 2) return { summary: 'VERIFY: redo\n需补充' }
        return { summary: 'VERIFY: approve\n通过' }
      }
      if (input.speakMode === 'execute') {
        execCount++
        return { summary: execCount === 1 ? 'REDO_ME 初稿' : '终稿 OK' }
      }
      return scriptedRoleSpeaker(input)
    }
    const session = newWorkshopSession('/tmp/p', '任务', 'm1')
    const res = await startWorkshopRun(session, '任务', speaker)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(execCount).toBeGreaterThanOrEqual(2)
    expect(res.session.phase).toBe('done')
  })

  it('未绑定员工时计划仍可用 assignee', async () => {
    await fs.writeFile(
      path.join(testDir, 'users.json'),
      JSON.stringify({
        schemaVersion: 1,
        users: [
          {
            id: 'builtin-manager',
            displayName: '经理',
            role: '技术经理',
            expertise: '',
            avatarPath: '',
            isBuiltin: true,
            builtinRole: 'manager',
          },
          { id: 'u-only', displayName: '全栈', role: '工程师', expertise: '', avatarPath: '' },
        ],
      }),
      'utf-8',
    )
    const session = newWorkshopSession('/tmp/p', '任务', 'm1')
    const res = await startWorkshopRun(session, '任务', scriptedRoleSpeaker)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.stepPlan?.length).toBeGreaterThan(0)
  })

  it('含问号时挂起 waiting_user 并可恢复', async () => {
    const session = newWorkshopSession('/tmp/p', '需要登录吗？优先级？', 'm1')
    const start = await startWorkshopRun(session, '需要登录吗？优先级？', scriptedRoleSpeaker)
    expect(start.ok).toBe(true)
    if (!start.ok) return
    expect(start.session.phase).toBe('waiting_user')

    const cont = await answerWorkshopQuestion(start.session, '先做 OAuth，P0', scriptedRoleSpeaker)
    expect(cont.ok).toBe(true)
    if (!cont.ok) return
    expect(cont.session.phase).toBe('done')
  })

  it('nextEmployeePhase 兼容旧序', () => {
    expect(nextEmployeePhase('idle')).toBe('manager')
    expect(nextEmployeePhase('manager')).toBe('backend')
    expect(nextEmployeePhase('tester')).toBe('done')
  })

  it('workshopApiRole 映射', () => {
    expect(workshopApiRole('user')).toBe('user')
    expect(workshopApiRole('manager')).toBe('assistant')
    expect(workshopApiRole('system')).toBeNull()
  })
})
