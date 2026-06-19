import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  BUILTIN_WORKFLOW_ROLES,
  seedBuiltinWorkflowUser,
} from '../../../electron/main/builtin-workflow-roles'
import { artifactBodyForGate } from '../../../electron/main/sop/sop-artifact'
import {
  projectHasApplicationSource,
  shouldTriggerSopCodeRecovery,
  validateImplementOnDisk,
  validateSopGate,
} from '../../../electron/main/sop/sop-gates'
import { sendSopPipelineMessage, scriptedSopSpeaker } from '../../../electron/main/sop/sop-pipeline-engine'
import { newWorkshopSession } from '../../../electron/main/workshop/workshop-store'

const users = BUILTIN_WORKFLOW_ROLES.map(seedBuiltinWorkflowUser)

describe('validateSopGate', () => {
  it('拒绝空 PRD JSON', () => {
    const r = validateSopGate('prd', '{}')
    expect(r.ok).toBe(false)
  })

  it('接受合法 PRD JSON', () => {
    const r = validateSopGate(
      'prd',
      JSON.stringify({ title: 'T', userStories: ['u1'] }),
    )
    expect(r.ok).toBe(true)
  })

  it('接受 markdown 中的 json 代码块', () => {
    const body = '说明\n```json\n{"title":"积分商城","userStories":["用户可兑换商品"]}\n```'
    expect(validateSopGate('prd', body).ok).toBe(true)
  })

  it('接受中文 PRD 描述', () => {
    const body =
      '## 产品需求\n核心目标：用 Redis 实现积分商城。\n## 功能需求\n- 积分获取\n- 商品兑换\n验收标准：接口可测。'
    expect(validateSopGate('prd', body).ok).toBe(true)
  })

  it('implement 无源码路径时被拒', async () => {
    const r = await validateImplementOnDisk(['docs/readme.md'], '/tmp')
    expect(r.ok).toBe(false)
  })

  it('qa 无测试输出证据时被拒', () => {
    expect(validateSopGate('qa', '测试通过').ok).toBe(false)
    expect(validateSopGate('qa', 'All tests pass.\ngo test ok  3 passed').ok).toBe(true)
  })

  it('design markdown 不因无效 json 块被拒', () => {
    const body = [
      '说明',
      '```json',
      '{ broken',
      '```',
      '# 系统设计',
      '## 文件列表',
      '- internal/store/mongo.go',
    ].join('\n')
    const gateBody = artifactBodyForGate(body, body, body)
    expect(validateSopGate('design', gateBody).ok).toBe(true)
  })

  it('仅有 tests 时判定缺应用源码', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-src-'))
    await fs.mkdir(path.join(dir, 'tests'), { recursive: true })
    await fs.writeFile(path.join(dir, 'tests/a.go'), 'package tests', 'utf-8')
    expect(await projectHasApplicationSource(dir)).toBe(false)
    expect(await shouldTriggerSopCodeRecovery('代码写了吗', dir)).toBe(true)
  })
})

describe('sendSopPipelineMessage', () => {
  let testDir = ''
  let projectRoot = ''

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-pipe-'))
    projectRoot = path.join(testDir, 'proj')
    await fs.mkdir(projectRoot, { recursive: true })
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

  it('scripted：一行需求跑通 SOP 至 done 并落盘 artifact', async () => {
    await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true })
    await fs.writeFile(path.join(projectRoot, 'src/todo.ts'), 'export {}', 'utf-8')
    await fs.writeFile(path.join(projectRoot, 'src/todo-api.ts'), 'export {}', 'utf-8')
    const session = newWorkshopSession(projectRoot, '', 'm1')
    const mockTests = async () => ({ ok: true, output: 'ok  3 passed' })
    const res = await sendSopPipelineMessage(
      session,
      '实现 Todo 应用',
      scriptedSopSpeaker(),
      undefined,
      { projectRoot, runTests: mockTests },
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.sopPhase).toBe('done')
    expect(res.session.phase).toBe('done')
    expect(res.session.sopPoolMessages?.some((m) => m.causeBy === 'UserRequirement')).toBe(true)
    expect(res.session.sopPoolMessages?.some((m) => m.causeBy === 'WritePRD')).toBe(true)

    const slug = res.session.sopSlug!
    const prdPath = path.join(
      projectRoot,
      'docs/deliverables',
      slug,
      '_artifacts/sop-prd.json',
    )
    await expect(fs.access(prdPath)).resolves.toBeUndefined()
  })

  it('done 后用户追问走 Tech Lead member 回复', async () => {
    await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true })
    await fs.writeFile(path.join(projectRoot, 'src/todo.ts'), 'export {}', 'utf-8')
    await fs.writeFile(path.join(projectRoot, 'src/todo-api.ts'), 'export {}', 'utf-8')
    const session = newWorkshopSession(projectRoot, '', 'm1')
    const speaker = scriptedSopSpeaker({
      done: '代码在 src/todo.ts，已实现 Todo 模块。',
    })
    const mockTests = async () => ({ ok: true, output: 'ok  3 passed' })
    const first = await sendSopPipelineMessage(session, '实现 Todo 应用', speaker, undefined, {
      projectRoot,
      runTests: mockTests,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.session.sopPhase).toBe('done')

    const follow = await sendSopPipelineMessage(
      first.session,
      '交付总结能再说一下吗？',
      speaker,
      undefined,
      { projectRoot },
    )
    expect(follow.ok).toBe(true)
    if (!follow.ok) return
    const managerReplies = follow.session.messages.filter((m) => m.roleId === 'manager')
    expect(managerReplies.length).toBeGreaterThanOrEqual(2)
    const last = managerReplies[managerReplies.length - 1]!
    expect(last.text).not.toContain('(no conclusion)')
    expect(last.text).not.toContain('[Codebase notes]')
  })

  it('done 后缺源码追问触发 Researcher + Developer 补写', async () => {
    await fs.mkdir(path.join(projectRoot, 'tests'), { recursive: true })
    await fs.writeFile(path.join(projectRoot, 'tests/health_test.go'), 'package tests', 'utf-8')
    await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true })
    await fs.writeFile(path.join(projectRoot, 'src/todo.ts'), 'export {}', 'utf-8')

    const session = newWorkshopSession(projectRoot, 'Redis 积分商城', 'm1')
    session.sopPhase = 'done'
    session.phase = 'done'
    session.sopSlug = 'redis'

    const res = await sendSopPipelineMessage(
      session,
      '代码写了吗？在哪里？',
      scriptedSopSpeaker(),
      undefined,
      { projectRoot, runTests: async () => ({ ok: true, output: 'ok  1 passed' }) },
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.session.messages.some((m) => m.text.includes('缺源码'))).toBe(true)
    expect(res.session.sopPhase).toBe('done')
    expect(res.session.messages.some((m) => m.causeBy === 'WriteCode')).toBe(true)
  })
})
