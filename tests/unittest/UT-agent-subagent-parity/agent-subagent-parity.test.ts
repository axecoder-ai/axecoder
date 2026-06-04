import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  filterToolsForCcSubagent,
  getSubagentTypeConfig,
  normalizeSubagentType,
} from '../../../electron/main/agent/agent-subagent-types'
import {
  createSubagentAgentId,
  loadSubagentRecord,
  saveSubagentRecord,
} from '../../../electron/main/agent/agent-subagent-store'
import {
  _resetBackgroundRunsForTest,
  createBackgroundRunId,
  finalizeBackgroundRun,
  getBackgroundRun,
  putBackgroundRun,
  waitForBackgroundRun,
} from '../../../electron/main/agent/agent-subagent-tasks'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'
import { filterToolsForSubagent } from '../../../electron/main/agent/agent-ext-executor'
import { resolveAgentToolName } from '../../../electron/main/agent/agent-tool-aliases'

describe('agent-subagent-parity', () => {
  afterEach(() => {
    _resetBackgroundRunsForTest()
  })

  it('normalizeSubagentType 未知类型回退 generalPurpose', () => {
    expect(normalizeSubagentType('')).toBe('generalPurpose')
    expect(normalizeSubagentType('shell')).toBe('shell')
    expect(normalizeSubagentType('unknown-x')).toBe('generalPurpose')
  })

  it('shell 子代理仅保留 Bash/Read/Grep/Glob', () => {
    const tools = filterToolsForCcSubagent(buildFullAgentTools(), 'shell')
    const names = tools.map((t) => t.name)
    expect(names).toEqual(expect.arrayContaining(['Bash', 'Read']))
    expect(names).not.toContain('Edit')
    expect(names).not.toContain('Task')
  })

  it('explore 子代理过滤写与 Bash', () => {
    const tools = filterToolsForSubagent(buildFullAgentTools(), 'explore')
    const names = tools.map((t) => t.name)
    expect(names).toContain('Read')
    expect(names).not.toContain('Edit')
    expect(names).not.toContain('Bash')
  })

  it('readonly 强制只读', () => {
    const tools = filterToolsForCcSubagent(buildFullAgentTools(), 'generalPurpose', true)
    expect(tools.map((t) => t.name)).not.toContain('Write')
  })

  it('Agent 别名解析为 Task', () => {
    expect(resolveAgentToolName('Agent')).toBe('Task')
    expect(resolveAgentToolName('Task')).toBe('Task')
  })

  it('子代理 transcript 可存取', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-sub-'))
    const sessionId = 'sess-1'
    const agentId = createSubagentAgentId()
    await saveSubagentRecord(root, {
      agentId,
      sessionId,
      subagentType: 'explore',
      messages: [{ role: 'user', content: 'find auth' }],
      updatedAt: Date.now(),
    })
    const loaded = await loadSubagentRecord(root, sessionId, agentId)
    expect(loaded?.messages[0].content).toBe('find auth')
  })

  it('TaskOutput block 等待后台任务完成', async () => {
    const root = process.cwd()
    const id = createBackgroundRunId()
    putBackgroundRun({
      id,
      description: 'test',
      status: 'running',
      report: '',
      startedAt: Date.now(),
    })
    setTimeout(() => {
      const run = getBackgroundRun(id)
      if (!run) return
      run.status = 'completed'
      run.report = 'done'
      putBackgroundRun(run)
    }, 80)
    const done = await waitForBackgroundRun(id, 2000, 40)
    expect(done?.status).toBe('completed')
    expect(done?.report).toContain('done')
    await finalizeBackgroundRun(root, done!)
    expect(done?.outputFile).toBeTruthy()
  })

  it('explore 配置为 subagent 档位', () => {
    expect(getSubagentTypeConfig('explore').modelTaskKind).toBe('subagent')
    expect(getSubagentTypeConfig('shell').modelTaskKind).toBe('main')
  })
})
