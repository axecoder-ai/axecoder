import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildPlanMarkdown,
  defaultPlanRelPath,
  isAxeCoderPlanFile,
  parseCreatePlanInput,
  slugifyPlanName,
  userWantsCreatePlan,
  writePlanFile,
} from '../../../electron/main/agent/agent-create-plan'
import { resolveAgentToolName } from '../../../electron/main/agent/agent-tool-aliases'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'
import { putSession } from '../../../electron/main/agent/agent-session-store'
import { composePlanBuildUserMessage } from '../../../electron/main/agent/agent-create-plan'
import { dismissAgentPlan } from '../../../electron/main/agent/agent-loop'
import { createLoopGuardState } from '../../../electron/main/agent/agent-loop-guard'
import { getSession } from '../../../electron/main/agent/agent-session-store'

let tmp = ''

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-plan-'))
})

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true })
})

describe('create-plan-build-ui', () => {
  it('slugifyPlanName 与默认路径', () => {
    expect(slugifyPlanName('Foo Bar!')).toBe('foo-bar')
    expect(defaultPlanRelPath('foo-bar')).toBe('docs/plans/plan-foo-bar.md')
  })

  it('isAxeCoderPlanFile 识别 plan 文件', () => {
    expect(isAxeCoderPlanFile('/proj/docs/plans/plan-x.md')).toBe(true)
    expect(isAxeCoderPlanFile('/proj/readme.md', '---\naxecoder-plan: true\n---\n')).toBe(true)
    expect(isAxeCoderPlanFile('/proj/readme.md')).toBe(false)
  })

  it('parseCreatePlanInput 校验必填', () => {
    const bad = parseCreatePlanInput({ name: '', overview: 'o', plan: 'p' })
    expect(bad.ok).toBe(false)
    const ok = parseCreatePlanInput({
      name: 'My Plan',
      overview: 'short',
      plan: '## step 1',
      todos: [{ content: 'task a' }],
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.relPath).toBe('docs/plans/plan-my-plan.md')
      expect(ok.input.todos?.[0]?.id).toBe('todo-1')
    }
  })

  it('writePlanFile 写入项目内路径', async () => {
    const md = buildPlanMarkdown({ name: 'T', overview: 'O', plan: 'body' })
    expect(md).toContain('axecoder-plan: true')
    const res = await writePlanFile(tmp, 'docs/plans/plan-t.md', md)
    expect(res.ok).toBe(true)
    const text = await fs.readFile(path.join(tmp, 'docs/plans/plan-t.md'), 'utf8')
    expect(text).toContain('# T')
  })

  it('create_plan 别名解析为 CreatePlan', () => {
    expect(resolveAgentToolName('create_plan')).toBe('CreatePlan')
  })

  it('userWantsCreatePlan 识别用户意图', () => {
    expect(userWantsCreatePlan('使用create_plan工具，生成plan')).toBe(true)
    expect(userWantsCreatePlan('hello')).toBe(false)
  })

  it('CreatePlan 非 planMode 仍可写 plan 并 pending', async () => {
    const run = await executeAgentTool(
      { projectRoot: tmp, readCache: new Set(), planMode: false },
      {
        id: 'cp1',
        name: 'CreatePlan',
        arguments: { name: 'X', overview: 'O', plan: 'P' },
      },
    )
    expect(run.kind).toBe('plan_pending')
  })

  it('CreatePlan planMode 下进入 plan_pending', async () => {
    const run = await executeAgentTool(
      { projectRoot: tmp, readCache: new Set(), planMode: true, sessionId: 's-plan' },
      {
        id: 'cp2',
        name: 'CreatePlan',
        arguments: { name: 'Feature', overview: 'Do it', plan: 'Step one' },
      },
    )
    expect(run.kind).toBe('plan_pending')
    if (run.kind === 'plan_pending') {
      expect(run.pendingPlan.filePath).toBe('docs/plans/plan-feature.md')
      expect(run.pendingPlan.name).toBe('Feature')
    }
    const onDisk = await fs.readFile(path.join(tmp, 'docs/plans/plan-feature.md'), 'utf8')
    expect(onDisk).toContain('Step one')
  })

  it('composePlanBuildUserMessage 包含 implement 与计划正文', async () => {
    await writePlanFile(
      tmp,
      'docs/plans/plan-f.md',
      buildPlanMarkdown({ name: 'F', overview: 'O', plan: 'Step A' }),
    )
    const res = await composePlanBuildUserMessage(tmp, 'docs/plans/plan-f.md')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.text).toContain('TDD')
      expect(res.text).toContain('Step A')
      expect(res.text).toContain('plan-f.md')
    }
  })

  it('dismissAgentPlan 删除 pending 并保留其余 plan_pending', async () => {
    const sessionId = 's-dismiss-plan'
    putSession(sessionId, {
      projectRoot: tmp,
      modelId: 'm',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'tool', toolCallId: 'tc2', name: 'CreatePlan', content: 'pending' },
        { role: 'tool', toolCallId: 'tc3', name: 'CreatePlan', content: 'pending' },
      ],
      ctx: { projectRoot: tmp, readCache: new Set(), sessionId, planMode: true },
      toolLog: [],
      pendingById: new Map(),
      pendingBashById: new Map(),
      pendingAskById: new Map(),
      pendingPlanById: new Map([
        [
          'pp2',
          {
            id: 'pp2',
            toolCallId: 'tc2',
            name: 'F',
            overview: 'O',
            plan: 'P',
            filePath: 'docs/plans/plan-f.md',
          },
        ],
        [
          'pp3',
          {
            id: 'pp3',
            toolCallId: 'tc3',
            name: 'G',
            overview: 'O2',
            plan: 'P2',
            filePath: 'docs/plans/plan-g.md',
          },
        ],
      ]),
      turn: 0,
      planMode: true,
      chatMode: 'planning',
      revealedToolNames: new Set(),
      activeTools: [],
      proactiveEnabled: false,
      proactiveTick: 0,
      scratchpadDir: '',
      compactedOnce: false,
      loopGuard: createLoopGuardState(),
    })

    const res = await dismissAgentPlan(sessionId, 'pp2')
    expect(res.ok).toBe(true)
    if (res.ok && res.status === 'pending') {
      expect(res.pendingPlans?.length).toBe(1)
      expect(res.pendingPlans?.[0]?.id).toBe('pp3')
    }
    const live = getSession(sessionId)
    expect(live?.pendingPlanById.has('pp2')).toBe(false)
    expect(live?.pendingPlanById.has('pp3')).toBe(true)
  })
})
