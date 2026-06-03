import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import { workshopApiRole } from '../../../electron/main/workshop/workshop-api-messages'
import {
  parseManagerTurn,
  parsePickSpeaker,
  parseRouteTurn,
} from '../../../electron/main/workshop/workshop-router'
import {
  scriptedMemberSpeaker,
  scriptedRouterLlm,
  sendWorkshopMessage,
} from '../../../electron/main/workshop/workshop-turn-orchestrator'
import { newWorkshopSession } from '../../../electron/main/workshop/workshop-store'

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
  { id: 'u-backend', displayName: '后端同学', role: '后端', expertise: '', avatarPath: '' },
  { id: 'u-frontend', displayName: '前端同学', role: '前端', expertise: '', avatarPath: '' },
]

describe('workshop-api-messages', () => {
  it('workshopApiRole：BOSS 与经理为 user', () => {
    expect(workshopApiRole('user')).toBe('user')
    expect(workshopApiRole('manager')).toBe('user')
    expect(workshopApiRole('backend')).toBe('assistant')
  })
})

describe('workshop-router parse', () => {
  it('parsePickSpeaker 合法 JSON', () => {
    const r = parsePickSpeaker('{"assigneeUserId":"u-backend"}', users)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.assigneeUserId).toBe('u-backend')
  })

  it('parseRouteTurn boss_clarify', () => {
    const r = parseRouteTurn('{"next":"boss_clarify","question":"确认范围？"}')
    expect(r).toEqual({ kind: 'boss_clarify', question: '确认范围？' })
  })

  it('parseManagerTurn done', () => {
    const r = parseManagerTurn('{"summary":"完成","done":true}', users)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.done).toBe(true)
  })
})

describe('workshop-turn-orchestrator', () => {
  let testDir = ''

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ws-turn-'))
    setAxecoderDirForTests(testDir)
    await fs.writeFile(
      path.join(testDir, 'users.json'),
      JSON.stringify({ schemaVersion: 1, users }),
      'utf-8',
    )
  })

  afterEach(() => {
    setAxecoderDirForTests(null)
  })

  it('scripted：BOSS → 经理 → 成员 → 经理 → 成员 → 结束', async () => {
    const session = newWorkshopSession('/tmp/p', '', 'm1')
    const router = scriptedRouterLlm({
      picks: ['u-frontend'],
      turns: ['manager'],
      manager: [
        { summary: '后端先看，前端跟上', assigneeUserId: 'u-backend', done: false },
        { summary: '前端跟上', assigneeUserId: 'u-frontend', done: false },
        { summary: '全部完成', done: true },
      ],
    })
    const res = await sendWorkshopMessage(
      session,
      '实现用户中心',
      scriptedMemberSpeaker,
      router,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.phase).toBe('done')
    expect(res.session.messages.some((m) => m.speakerUserId === 'u-backend')).toBe(true)
    expect(res.session.messages.some((m) => m.speakerUserId === 'u-frontend')).toBe(true)
    expect(res.session.stepPlan).toBeUndefined()
  })

  it('scripted：成员后需 BOSS 澄清', async () => {
    const session = newWorkshopSession('/tmp/p', '', 'm1')
    const router = scriptedRouterLlm({
      turns: ['boss_clarify'],
      clarifyQuestion: '要支持移动端吗？',
      manager: [{ summary: '后端先看', assigneeUserId: 'u-backend', done: false }],
    })
    const res = await sendWorkshopMessage(session, '做登录页', scriptedMemberSpeaker, router)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.phase).toBe('waiting_user')
    expect(res.session.pendingQuestion).toBe('要支持移动端吗？')
  })

  it('澄清回答后继续选角', async () => {
    let session = newWorkshopSession('/tmp/p', '', 'm1')
    const router = scriptedRouterLlm({
      picks: ['u-backend', 'u-frontend'],
      turns: ['boss_clarify', 'done'],
      clarifyQuestion: '确认？',
    })
    let res = await sendWorkshopMessage(session, '任务', scriptedMemberSpeaker, router)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    session = res.session
    res = await sendWorkshopMessage(session, '要支持', scriptedMemberSpeaker, router)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.messages.some((m) => m.speakerUserId === 'u-frontend')).toBe(true)
  })
})
