import { describe, expect, it } from 'vitest'
import { isDangerousGitCommand } from '../../../electron/main/agent/agent-bash'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'
import { mergeTodos, createTask, getTask } from '../../../electron/main/agent/agent-todo-store'
import { discoverSkills } from '../../../electron/main/agent/agent-skills'
import { filterToolsForSubagent } from '../../../electron/main/agent/agent-ext-executor'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'
import path from 'node:path'

describe('agent-tool-layer-parity', () => {
  it('危险 git 命令被拒绝', () => {
    expect(isDangerousGitCommand('git push --force origin main')).toBeTruthy()
    expect(isDangerousGitCommand('git status')).toBe('')
  })

  it('TodoWrite 合并会话待办', async () => {
    const sid = 'test-session-todo'
    mergeTodos(sid, [{ id: '1', content: 'a', status: 'pending' }])
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), sessionId: sid },
      {
        id: 'c1',
        name: 'TodoWrite',
        arguments: {
          todos: [{ id: '1', content: 'a', status: 'completed' }],
        },
      },
    )
    expect(res?.log.ok).toBe(true)
    expect(res?.content).toContain('completed')
  })

  it('TaskCreate / TaskGet', async () => {
    const sid = 'test-session-task'
    const task = createTask(sid, 'subj', 'desc')
    expect(getTask(sid, task.id)?.subject).toBe('subj')
  })

  it('EnterPlanMode 设置 planMode', async () => {
    const ctx = { projectRoot: process.cwd(), readCache: new Set(), sessionId: 'plan-s' }
    const res = await executeExtendedAgentTool(ctx, {
      id: 'p1',
      name: 'EnterPlanMode',
      arguments: {},
    })
    expect(res?.log.ok).toBe(true)
    expect(ctx.planMode).toBe(true)
  })

  it('explore 子代理过滤写工具', () => {
    const tools = filterToolsForSubagent(buildFullAgentTools(), 'explore')
    const names = tools.map((t) => t.name)
    expect(names).toContain('Read')
    expect(names).not.toContain('Edit')
    expect(names).not.toContain('Bash')
  })

  it('DiscoverSkills 可扫描项目 .cursor/skills', async () => {
    const root = path.join(process.cwd())
    const skills = await discoverSkills(root)
    expect(Array.isArray(skills)).toBe(true)
  })
})
