import { describe, expect, it, vi, beforeEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'

vi.mock('../../../electron/main/git-run', () => ({
  runGit: vi.fn(),
}))

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({
    agentFeatureWorktree: true,
    agentFeatureWorkflow: true,
    agentFeatureBrief: true,
  })),
}))

import { runGit } from '../../../electron/main/git-run'
import { enterWorktree, exitWorktree } from '../../../electron/main/agent/agent-worktree'
import { loadWorkflowPlaybook } from '../../../electron/main/agent/agent-workflow'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'
import type { AgentContext } from '../../../electron/main/agent/tool-executor'

const runGitMock = vi.mocked(runGit)

const tmpRoot = () => path.join(os.tmpdir(), `axecoder-wtwb-${Date.now()}-${Math.random().toString(36).slice(2)}`)

describe('agent-worktree', () => {
  beforeEach(() => {
    runGitMock.mockReset()
  })

  it('EnterWorktree 已在 worktree 时不重复创建', async () => {
    const root = '/repo/wt-branch'
    runGitMock.mockImplementation(async (cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return '/repo'
      if (args[0] === 'rev-parse' && args[1] === '--git-dir') return path.join(root, '.git')
      if (args[0] === 'rev-parse' && args[1] === '--git-common-dir') return '/repo/.git'
      if (args[0] === 'rev-parse' && args[1] === '--show-superproject-working-tree') throw new Error('no')
      if (args[0] === 'branch' && args[1] === '--show-current') return 'feat-x'
      throw new Error(`unexpected git ${args.join(' ')} @ ${cwd}`)
    })
    const ctx: AgentContext = { projectRoot: root, readCache: new Set() }
    const res = await enterWorktree(ctx, { name: 'feat-x' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.alreadyThere).toBe(true)
    expect(ctx.projectRoot).toBe(root)
  })

  it('EnterWorktree 创建 worktree 并切换 projectRoot', async () => {
    const root = '/repo'
    const wtPath = '/repo/.worktrees/axecoder-agent'
    runGitMock.mockImplementation(async (cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return root
      if (args[0] === 'rev-parse' && args[1] === '--git-dir') return path.join(cwd, '.git')
      if (args[0] === 'rev-parse' && args[1] === '--git-common-dir') return path.join(root, '.git')
      if (args[0] === 'rev-parse' && args[1] === '--show-superproject-working-tree') throw new Error('no')
      if (args[0] === 'check-ignore') return ''
      if (args[0] === 'worktree' && args[1] === 'add') return ''
      if (args[0] === 'branch' && args[1] === '--show-current') return 'axecoder-agent'
      throw new Error(`unexpected git ${args.join(' ')} @ ${cwd}`)
    })
    const ctx: AgentContext = { projectRoot: root, readCache: new Set() }
    const res = await enterWorktree(ctx, {})
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.alreadyThere).toBe(false)
    expect(ctx.projectRoot).toBe(wtPath)
    expect(ctx.worktreePath).toBe(wtPath)
    expect(ctx.worktreeOriginalRoot).toBe(root)
  })

  it('ExitWorktree 恢复 projectRoot', async () => {
    const ctx: AgentContext = {
      projectRoot: '/repo/.worktrees/axecoder-agent',
      readCache: new Set(),
      worktreeOriginalRoot: '/repo',
      worktreePath: '/repo/.worktrees/axecoder-agent',
    }
    runGitMock.mockImplementation(async (cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return '/repo'
      if (args[0] === 'worktree' && args[1] === 'remove') return ''
      throw new Error(`unexpected git ${args.join(' ')} @ ${cwd}`)
    })
    const res = await exitWorktree(ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(ctx.projectRoot).toBe('/repo')
    expect(ctx.worktreePath).toBeUndefined()
  })
})

describe('agent-workflow', () => {
  it('loadWorkflowPlaybook 加载 builtin command', async () => {
    const root = tmpRoot()
    await fs.mkdir(root, { recursive: true })
    const res = await loadWorkflowPlaybook(root, 'summary')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.text.length).toBeGreaterThan(20)
  })

  it('loadWorkflowPlaybook 未知名称失败', async () => {
    const res = await loadWorkflowPlaybook('/tmp', 'not-a-real-workflow-slug-xyz')
    expect(res.ok).toBe(false)
  })
})

describe('Brief tool', () => {
  it('executeAgentTool Brief 返回 ask_pending', async () => {
    const ctx: AgentContext = { projectRoot: process.cwd(), readCache: new Set() }
    const res = await executeAgentTool(ctx, {
      id: 'b1',
      name: 'Brief',
      arguments: { message: '请用三句话总结进度' },
    })
    expect(res.kind).toBe('ask_pending')
    if (res.kind !== 'ask_pending') return
    expect(res.pendingAsk.questions[0]?.prompt).toContain('三句话')
  })
})
