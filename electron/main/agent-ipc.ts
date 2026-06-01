import { ipcMain, type BrowserWindow } from 'electron'
import type { AiChatMessage } from './models-types'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  AGENTS_MD_TEMPLATE,
  listAgentCheckpoints,
  readMemoryFile,
  writeMemoryFile,
} from './agent/agent-checkpoint'
import { listBackgroundRuns } from './agent/agent-subagent-tasks'
import {
  answerAgentQuestions,
  confirmAgentAllWrites,
  confirmAgentBash,
  confirmAgentWrite,
  compactAgentMessages,
  formatHooksHelp,
  listAgentSessions,
  rejectAgentAllWrites,
  rejectAgentBash,
  rejectAgentWrite,
  rewindAgentCheckpoint,
  runUserShellCommand,
  startAgentTurn,
} from './agent/agent-loop'
import { getSession } from './agent/agent-session-store'
import { axecoderPath } from './axecoder-dir'
import type { AgentLoopMessage } from './agent/agent-types'
import { compactChatHistory } from './chat-compact'
import { bindAgentProgressWindow } from './agent/agent-progress-emit'
import { listMcpResourcesStub } from './agent/agent-mcp'
import { discoverSkills, findSkillByName, readSkillContent } from './agent/agent-skills'
import {
  getCachedCustomOutputStyles,
  refreshCustomOutputStylesCache,
} from './agent/agent-output-styles-custom'
import {
  DEFAULT_OUTPUT_STYLE_NAME,
  OUTPUT_STYLE_CONFIG,
  type AgentBuiltInOutputStyleId,
} from './agent/agent-output-styles'
import { getConfig, setConfig } from './config-store'

export const registerAgentIpc = (getMainWindow: () => BrowserWindow | null) => {
  bindAgentProgressWindow(getMainWindow)
  ipcMain.handle(
    'agent:send',
    async (
      _,
      projectRoot: string,
      modelId: string,
      messages: AiChatMessage[],
    ) => {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          ...(m.role === 'assistant' && m.reasoningContent
            ? { reasoningContent: m.reasoningContent }
            : {}),
        }))
      if (!history.some((m) => m.role === 'user')) {
        return { ok: false as const, error: '无用户消息' }
      }
      return startAgentTurn(projectRoot, modelId, history)
    },
  )

  ipcMain.handle('agent:confirmWrite', async (_, sessionId: string, pendingId: string) => {
    return confirmAgentWrite(sessionId, pendingId)
  })

  ipcMain.handle('agent:confirmAllWrites', async (_, sessionId: string) => {
    return confirmAgentAllWrites(sessionId)
  })

  ipcMain.handle(
    'agent:rejectWrite',
    async (_, sessionId: string, pendingId: string, reason?: string) => {
      return rejectAgentWrite(sessionId, pendingId, reason)
    },
  )

  ipcMain.handle(
    'agent:rejectAllWrites',
    async (_, sessionId: string, reason?: string) => {
      return rejectAgentAllWrites(sessionId, reason)
    },
  )

  ipcMain.handle('agent:confirmBash', async (_, sessionId: string, pendingId: string) => {
    return confirmAgentBash(sessionId, pendingId)
  })

  ipcMain.handle(
    'agent:rejectBash',
    async (_, sessionId: string, pendingId: string, reason?: string) => {
      return rejectAgentBash(sessionId, pendingId, reason)
    },
  )

  ipcMain.handle('agent:runUserShell', async (_, projectRoot: string, command: string) => {
    return runUserShellCommand(projectRoot, command)
  })

  ipcMain.handle(
    'chat:compact',
    async (_, messages: { role: string; content: string }[]) => {
      const compacted = compactChatHistory(
        messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      )
      return { ok: true as const, ...compacted }
    },
  )

  ipcMain.handle(
    'agent:compactMessages',
    async (_, messages: AgentLoopMessage[]) => {
      const result = compactAgentMessages(messages)
      return { ok: true as const, ...result }
    },
  )

  ipcMain.handle('agent:hooksHelp', async () => ({ ok: true as const, text: await formatHooksHelp() }))

  ipcMain.handle('agent:listMcp', async () => {
    const res = await listMcpResourcesStub()
    if (!res.ok) return { ok: false as const, error: res.error }
    return { ok: true as const, text: res.text }
  })

  ipcMain.handle('agent:listSkills', async (_, projectRoot: string) => {
    if (!projectRoot) return { ok: false as const, error: '未打开项目' }
    const skills = await discoverSkills(projectRoot)
    return {
      ok: true as const,
      skills: skills.map((s) => ({ name: s.name, path: s.path, source: s.source })),
    }
  })

  ipcMain.handle('agent:loadSkill', async (_, projectRoot: string, skillName: string) => {
    const skill = await findSkillByName(projectRoot, skillName)
    if (!skill) return { ok: false as const, error: `未找到 Skill：${skillName}` }
    const content = await readSkillContent(skill.path)
    if (!content.ok) return { ok: false as const, error: content.error }
    return { ok: true as const, name: skill.name, text: content.text, path: skill.path }
  })

  ipcMain.handle('agent:listOutputStyles', async (_, projectRoot?: string) => {
    await refreshCustomOutputStylesCache(projectRoot)
    const builtin = (
      Object.keys(OUTPUT_STYLE_CONFIG) as AgentBuiltInOutputStyleId[]
    )
      .filter((id) => id !== DEFAULT_OUTPUT_STYLE_NAME)
      .map((id) => {
        const c = OUTPUT_STYLE_CONFIG[id]!
        return { id, name: c.name, description: c.description, source: 'builtin' as const }
      })
    const custom = getCachedCustomOutputStyles().metas.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      source: m.source,
    }))
    const cfg = await getConfig()
    return {
      ok: true as const,
      activeId: cfg.agentOutputStyle,
      styles: [{ id: 'default', name: 'default', description: '标准软件工程助手', source: 'builtin' as const }, ...builtin, ...custom],
      dirs: ['~/.axecoder/output-styles', '~/.claude/output-styles', '<project>/.axecoder/output-styles'],
    }
  })

  ipcMain.handle('agent:setOutputStyle', async (_, styleId: string) => {
    const id = styleId.trim() || DEFAULT_OUTPUT_STYLE_NAME
    if (id !== DEFAULT_OUTPUT_STYLE_NAME && !OUTPUT_STYLE_CONFIG[id as AgentBuiltInOutputStyleId]) {
      await refreshCustomOutputStylesCache()
      if (!getCachedCustomOutputStyles().styles[id]) {
        return { ok: false as const, error: `未知输出风格：${id}` }
      }
    }
    await setConfig({ agentOutputStyle: id })
    return { ok: true as const, activeId: id }
  })

  ipcMain.handle('agent:planModeHelp', async () => {
    const cfg = await getConfig()
    const hooks = cfg.agentHooksEnabled !== false ? '已启用' : '已关闭'
    return {
      ok: true as const,
      text: [
        '计划模式（Plan Mode）',
        '',
        '- 在 Agent 对话中调用工具 EnterPlanMode / ExitPlanMode 进入或退出计划模式。',
        '- 计划模式下 Edit / Write / Delete / Move / Bash 会被阻断，便于先规划再实施。',
        '- 斜杠命令 /plan 仅显示本说明；实际切换由 Agent 工具完成。',
        '',
        `Hooks：${hooks}（配置见 ~/.axecoder/hooks.json，/hooks 查看详情）`,
      ].join('\n'),
    }
  })

  ipcMain.handle('agent:rewindHelp', async (_, projectRoot: string) => {
    if (!projectRoot) return { ok: false as const, error: '未打开项目' }
    const { spawn } = await import('node:child_process')
    const gitLines = await new Promise<string>((resolve) => {
      const proc = spawn('git', ['status', '--short'], { cwd: projectRoot })
      let out = ''
      proc.stdout?.on('data', (d) => { out += d.toString() })
      proc.on('close', () => resolve(out.trim() || '(无未提交变更)'))
      proc.on('error', () => resolve('(Git 不可用)'))
    })
    return {
      ok: true as const,
      text: [
        '回滚（/rewind）',
        '',
        'Agent 会话支持 checkpoint：在对话中使用 `/rewind` 或 `/rewind <checkpointId>` 恢复上一轮开始前状态。',
        '也可用 Git 查看并撤销工作区变更：',
        '',
        '```',
        gitLines,
        '```',
        '',
        '常用命令：`git checkout -- <file>`、`git restore .`、`git stash`',
      ].join('\n'),
    }
  })

  ipcMain.handle('agent:listSessions', async () => ({
    ok: true as const,
    sessions: listAgentSessions(),
  }))

  ipcMain.handle('agent:listCheckpoints', async (_, sessionId: string) => {
    if (!sessionId?.trim()) return { ok: false as const, error: '缺少 sessionId' }
    return { ok: true as const, checkpoints: listAgentCheckpoints(sessionId) }
  })

  ipcMain.handle(
    'agent:rewind',
    async (_, sessionId: string, checkpointId?: string) => {
      const session = getSession(sessionId)
      if (!session) return { ok: false as const, error: 'Agent 会话不存在或已过期' }
      return rewindAgentCheckpoint(sessionId, session, checkpointId)
    },
  )

  ipcMain.handle('agent:listBackgroundTasks', async (_, sessionId?: string) => ({
    ok: true as const,
    tasks: listBackgroundRuns(sessionId).map((t) => ({
      id: t.id,
      description: t.description,
      status: t.status,
      startedAt: t.startedAt,
    })),
  }))

  ipcMain.handle('agent:readMemory', async () => {
    const p = axecoderPath('memory.md')
    const res = await readMemoryFile(p)
    if (!res.ok) return res
    return { ok: true as const, path: p, text: res.text }
  })

  ipcMain.handle('agent:writeMemory', async (_, text: string) => {
    const p = axecoderPath('memory.md')
    const res = await writeMemoryFile(p, text)
    if (!res.ok) return res
    return { ok: true as const, path: p }
  })

  ipcMain.handle('agent:initAgentsMd', async (_, projectRoot: string) => {
    if (!projectRoot?.trim()) return { ok: false as const, error: '未打开项目' }
    const filePath = path.join(path.resolve(projectRoot), 'AGENTS.md')
    try {
      await fs.access(filePath)
      return { ok: true as const, path: filePath, created: false }
    } catch {
      await fs.writeFile(filePath, AGENTS_MD_TEMPLATE, 'utf-8')
      return { ok: true as const, path: filePath, created: true }
    }
  })

  ipcMain.handle(
    'agent:answerQuestions',
    async (
      _,
      sessionId: string,
      pendingId: string,
      answers: Record<string, string | string[]>,
    ) => {
      return answerAgentQuestions(sessionId, pendingId, answers)
    },
  )
}
