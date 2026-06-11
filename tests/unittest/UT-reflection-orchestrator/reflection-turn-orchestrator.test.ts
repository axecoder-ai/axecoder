import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  parseReflectionRoundJudge,
  parseReflectionComment,
  REFLECTION_MAX_ROUNDS,
  scriptedReflectionJudgeLlm,
  sendReflectionMessage,
} from '../../../electron/main/workshop/reflection-turn-orchestrator'
import { scriptedMemberSpeaker } from '../../../electron/main/workshop/workshop-turn-orchestrator'
import { newWorkshopSession } from '../../../electron/main/workshop/workshop-store'

const reflectionUsers = [
  {
    id: 'builtin-manager',
    displayName: 'Tech Lead',
    role: 'Tech Lead',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'manager' as const,
  },
  {
    id: 'builtin-developer',
    displayName: 'Developer',
    role: 'Developer',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'developer' as const,
  },
  {
    id: 'builtin-reviewer',
    displayName: 'Reviewer',
    role: 'Reviewer',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'reviewer' as const,
  },
]

describe('reflection-turn-orchestrator parse', () => {
  it('parseReflectionRoundJudge 解析 continue', () => {
    const r = parseReflectionRoundJudge('{"comment":"ok","continue":true}')
    expect(r.comment).toBe('ok')
    expect(r.continue).toBe(true)
  })

  it('parseReflectionComment 取 summary', () => {
    expect(parseReflectionComment('{"summary":"done"}')).toBe('done')
  })
})

describe('sendReflectionMessage', () => {
  let testDir = ''

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'refl-'))
    setAxecoderDirForTests(testDir)
    await fs.writeFile(
      path.join(testDir, 'users.json'),
      JSON.stringify({ schemaVersion: 1, users: reflectionUsers }),
      'utf-8',
    )
  })

  afterEach(() => {
    setAxecoderDirForTests(null)
  })

  it('单轮后 Tech Lead 判定不继续则收尾', async () => {
    const session = newWorkshopSession('/tmp/p', '', 'm1')
    const judge = scriptedReflectionJudgeLlm({
      afterDeveloper: ['Dev looks good.'],
      roundJudges: [{ comment: 'Review passed.', continue: false }],
      finalReport: 'All done.',
    })
    const res = await sendReflectionMessage(session, 'implement foo', scriptedMemberSpeaker, judge)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const roles = res.session.messages.map((m) => m.roleId)
    expect(roles.filter((r) => r === 'manager').length).toBeGreaterThanOrEqual(3)
    expect(res.session.phase).toBe('done')
    expect(res.session.messages.at(-1)?.text).toBe('All done.')
  })

  it('最多跑 REFLECTION_MAX_ROUNDS 轮', async () => {
    const session = newWorkshopSession('/tmp/p', '', 'm2')
    const judge = scriptedReflectionJudgeLlm({
      afterDeveloper: ['a', 'b', 'c'],
      roundJudges: [
        { comment: 'round1', continue: true },
        { comment: 'round2', continue: true },
        { comment: 'round3', continue: true },
      ],
      finalReport: 'forced end',
    })
    const res = await sendReflectionMessage(session, 'task', scriptedMemberSpeaker, judge)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const devMsgs = res.session.messages.filter(
      (m) => m.speakerUserId === 'builtin-developer',
    )
    expect(devMsgs.length).toBe(REFLECTION_MAX_ROUNDS)
  })
})
