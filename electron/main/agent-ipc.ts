import { ipcMain, type BrowserWindow } from 'electron'
import type { AiChatMessage } from './models-types'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  AGENTS_MD_TEMPLATE,
  listAgentCheckpoints,
  readMemoryFile,
  restoreCheckpointFilesOnly,
  writeMemoryFile,
} from './agent/agent-checkpoint'
import { listBackgroundRuns, resolveBackgroundTasks } from './agent/agent-subagent-tasks'
import {
  answerAgentQuestions,
  buildAgentPlan,
  composePlanBuildMessage,
  dismissAgentPlan,
  confirmAgentAllWrites,
  confirmAgentBash,
  confirmAgentWrite,
  formatHooksHelp,
  listAgentSessions,
  rejectAgentAllWrites,
  rejectAgentBash,
  rejectAgentWrite,
  rewindAgentCheckpoint,
  runUserShellCommand,
  startAgentTurn,
  stopAgentTurn,
} from './agent/agent-loop'
import { getSession } from './agent/agent-session-store'
import { axecoderPath } from './axecoder-dir'
import type { AgentLoopMessage } from './agent/agent-types'
import { compactAgentMessagesWithLlm } from './agent/agent-context-compact'
import { compactChatHistory } from './chat-compact'
import { listMcpResources } from './agent/agent-mcp'
import {
  discoverCustomCommands,
  findCustomCommandByName,
  readCustomCommandContent,
} from './agent/agent-custom-commands'
import { listBuiltinCommands, loadBuiltinCommand } from './agent/agent-builtin-commands'
import { runDesignSlash } from './design/design-slash'
import { listBuiltinSkills, loadBuiltinSkill } from './agent/agent-builtin-skills'
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
import { t } from './i18n'
import { withAgentRuntime } from './agent-runtime-proxy'

export const registerAgentIpc = (_getMainWindow: () => BrowserWindow | null) => {
  ipcMain.handle(
    'agent:send',
    async (
      _,
      projectRoot: string,
      modelId: string,
      messages: AiChatMessage[],
      chatMode?: string,
      assigneeUserId?: string,
      roleWorkflowInvoke?: boolean,
      reasoningEffort?: string,
      clientChatId?: string,
    ) => {
      const history = (Array.isArray(messages) ? messages : [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
          ...(m.role === 'user' && m.images?.length ? { images: m.images } : {}),
          ...(m.role === 'assistant' && m.reasoningContent
            ? { reasoningContent: m.reasoningContent }
            : {}),
        }))
      if (!history.some((m) => m.role === 'user')) {
        return { ok: false as const, error: 'No user message' }
      }
      return withAgentRuntime(
        () =>
          startAgentTurn(
            projectRoot,
            modelId,
            history,
            chatMode,
            assigneeUserId,
            roleWorkflowInvoke === true,
            reasoningEffort,
            clientChatId,
          ),
        (b) =>
          b.call('send', {
            projectRoot,
            modelId,
            messages: history,
            chatMode,
            assigneeUserId,
            roleWorkflowInvoke: roleWorkflowInvoke === true,
            reasoningEffort,
            clientChatId,
          }),
      )
    },
  )

  ipcMain.handle('agent:stop', async (_, sessionId: string) =>
    withAgentRuntime(
      () => stopAgentTurn(sessionId),
      (b) => b.call('stop', { sessionId }),
    ),
  )

  ipcMain.handle('agent:confirmWrite', async (_, sessionId: string, pendingId: string) =>
    withAgentRuntime(
      () => confirmAgentWrite(sessionId, pendingId),
      (b) => b.call('confirmWrite', { sessionId, pendingId }),
    ),
  )

  ipcMain.handle('agent:confirmAllWrites', async (_, sessionId: string) =>
    withAgentRuntime(
      () => confirmAgentAllWrites(sessionId),
      (b) => b.call('confirmAllWrites', { sessionId }),
    ),
  )

  ipcMain.handle(
    'agent:rejectWrite',
    async (_, sessionId: string, pendingId: string, reason?: string) =>
      withAgentRuntime(
        () => rejectAgentWrite(sessionId, pendingId, reason),
        (b) => b.call('rejectWrite', { sessionId, pendingId, reason }),
      ),
  )

  ipcMain.handle(
    'agent:rejectAllWrites',
    async (_, sessionId: string, reason?: string) =>
      withAgentRuntime(
        () => rejectAgentAllWrites(sessionId, reason),
        (b) => b.call('rejectAllWrites', { sessionId, reason }),
      ),
  )

  ipcMain.handle('agent:confirmBash', async (_, sessionId: string, pendingId: string) =>
    withAgentRuntime(
      () => confirmAgentBash(sessionId, pendingId),
      (b) => b.call('confirmBash', { sessionId, pendingId }),
    ),
  )

  ipcMain.handle(
    'agent:rejectBash',
    async (_, sessionId: string, pendingId: string, reason?: string) =>
      withAgentRuntime(
        () => rejectAgentBash(sessionId, pendingId, reason),
        (b) => b.call('rejectBash', { sessionId, pendingId, reason }),
      ),
  )

  ipcMain.handle('agent:runUserShell', async (_, projectRoot: string, command: string) =>
    withAgentRuntime(
      () => runUserShellCommand(projectRoot, command),
      (b) => b.call('runUserShell', { projectRoot, command }),
    ),
  )

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
    async (
      _,
      messages: AgentLoopMessage[],
      modelId?: string,
      sessionId?: string,
    ) => {
      const llmOpts =
        typeof modelId === 'string' && modelId.trim()
          ? { modelId: modelId.trim(), sessionId: typeof sessionId === 'string' ? sessionId : undefined }
          : undefined
      const result = await compactAgentMessagesWithLlm(messages, 24, llmOpts)
      return { ok: true as const, ...result }
    },
  )

  ipcMain.handle('agent:hooksHelp', async () => ({ ok: true as const, text: await formatHooksHelp() }))

  ipcMain.handle('agent:listMcp', async (_, projectRoot?: string) => {
    const res = await listMcpResources(typeof projectRoot === 'string' ? projectRoot : undefined)
    if (!res.ok) return { ok: false as const, error: res.error }
    return { ok: true as const, text: res.text }
  })

  ipcMain.handle('agent:listSkills', async (_, projectRoot: string) => {
    const skills = await discoverSkills(projectRoot ?? '')
    return {
      ok: true as const,
      skills: skills.map((s) => ({ name: s.name, path: s.path, source: s.source })),
    }
  })

  ipcMain.handle('agent:loadSkill', async (_, projectRoot: string, skillName: string) => {
    const skill = await findSkillByName(projectRoot ?? '', skillName)
    if (!skill) return { ok: false as const, error: `Skill not found: ${skillName}` }
    const content = await readSkillContent(skill.path)
    if (!content.ok) return { ok: false as const, error: content.error }
    return { ok: true as const, name: skill.name, text: content.text, path: skill.path }
  })

  ipcMain.handle('agent:listBuiltinSkills', async () => {
    const skills = await listBuiltinSkills()
    return {
      ok: true as const,
      skills: skills.map((s) => ({
        name: s.name,
        path: s.path,
        description: s.description,
        source: 'builtin' as const,
      })),
      dir: 'resources/builtin-skills',
    }
  })

  ipcMain.handle('agent:loadBuiltinSkill', async (_, skillName: string) => {
    const content = await loadBuiltinSkill(skillName)
    if (!content.ok) return { ok: false as const, error: content.error }
    return { ok: true as const, name: content.name, text: content.text, path: content.path }
  })

  ipcMain.handle('agent:listCustomCommands', async (_, projectRoot: string) => {
    const commands = await discoverCustomCommands(projectRoot ?? '')
    return {
      ok: true as const,
      commands: commands.map((c) => ({
        name: c.name,
        path: c.path,
        description: c.description,
        source: c.source,
      })),
      dirs: ['~/.cursor/commands', '~/.axecoder/commands', '<project>/.axecoder/commands'],
    }
  })

  ipcMain.handle('agent:loadCustomCommand', async (_, projectRoot: string, commandName: string) => {
    const cmd = await findCustomCommandByName(projectRoot ?? '', commandName)
    if (!cmd) return { ok: false as const, error: `Command not found: ${commandName}` }
    const content = await readCustomCommandContent(cmd.path)
    if (!content.ok) return { ok: false as const, error: content.error }
    return { ok: true as const, name: cmd.name, text: content.text, path: cmd.path }
  })

  ipcMain.handle('agent:listBuiltinCommands', async () => {
    const commands = await listBuiltinCommands()
    return {
      ok: true as const,
      commands: commands.map((c) => ({
        name: c.name,
        path: c.path,
        description: c.description,
        source: 'builtin' as const,
      })),
      dir: 'resources/builtin-commands',
    }
  })

  ipcMain.handle('agent:loadBuiltinCommand', async (_, commandName: string) => {
    const content = await loadBuiltinCommand(commandName)
    if (!content.ok) return { ok: false as const, error: content.error }
    return { ok: true as const, name: content.name, text: content.text, path: content.path }
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
      styles: [{ id: 'default', name: 'default', description: 'Standard software engineering assistant', source: 'builtin' as const }, ...builtin, ...custom],
      dirs: ['~/.axecoder/output-styles', '~/.claude/output-styles', '<project>/.axecoder/output-styles'],
    }
  })

  ipcMain.handle('agent:setOutputStyle', async (_, styleId: string) => {
    const id = styleId.trim() || DEFAULT_OUTPUT_STYLE_NAME
    if (id !== DEFAULT_OUTPUT_STYLE_NAME && !OUTPUT_STYLE_CONFIG[id as AgentBuiltInOutputStyleId]) {
      await refreshCustomOutputStylesCache()
      if (!getCachedCustomOutputStyles().styles[id]) {
        return { ok: false as const, error: `Unknown output style: ${id}` }
      }
    }
    await setConfig({ agentOutputStyle: id })
    return { ok: true as const, activeId: id }
  })

  ipcMain.handle('agent:planModeHelp', async () => {
    const cfg = await getConfig()
    const hooksStatus = cfg.agentHooksEnabled !== false
      ? t('agentHelp.hooksEnabled')
      : t('agentHelp.hooksDisabled')
    return {
      ok: true as const,
      text: [
        t('agentHelp.planTitle'),
        '',
        `- ${t('agentHelp.planBullet1')}`,
        `- ${t('agentHelp.planBullet2')}`,
        `- ${t('agentHelp.planBullet3')}`,
        '',
        t('agentHelp.hooksLine', { status: hooksStatus }),
      ].join('\n'),
    }
  })

  ipcMain.handle('agent:rewindHelp', async (_, projectRoot: string) => {
    if (!projectRoot) return { ok: false as const, error: t('errors.noProject') }
    const { spawn } = await import('node:child_process')
    const gitLines = await new Promise<string>((resolve) => {
      const proc = spawn('git', ['status', '--short'], { cwd: projectRoot })
      let out = ''
      proc.stdout?.on('data', (d) => { out += d.toString() })
      proc.on('close', () => resolve(out.trim() || t('agentHelp.gitClean')))
      proc.on('error', () => resolve('(Git unavailable)'))
    })
    return {
      ok: true as const,
      text: [
        t('agentHelp.rewindTitle'),
        '',
        t('agentHelp.rewindBullet1'),
        t('agentHelp.rewindBullet2'),
        '',
        '```',
        gitLines,
        '```',
        '',
        t('agentHelp.rewindCommands'),
      ].join('\n'),
    }
  })

  ipcMain.handle('agent:listSessions', async () =>
    withAgentRuntime(
      () => ({ ok: true as const, sessions: listAgentSessions() }),
      (b) => b.call('listSessions'),
    ),
  )

  ipcMain.handle('agent:listCheckpoints', async (_, sessionId: string) => {
    if (!sessionId?.trim()) return { ok: false as const, error: t('errors.missingSessionId') }
    return withAgentRuntime(
      () => ({ ok: true as const, checkpoints: listAgentCheckpoints(sessionId) }),
      (b) => b.call('listCheckpoints', { sessionId }),
    )
  })

  ipcMain.handle(
    'agent:rewind',
    async (_, sessionId: string, checkpointId?: string) => {
      const session = getSession(sessionId)
      if (!session) return { ok: false as const, error: t('errors.agentSessionMissing') }
      return withAgentRuntime(
        () => rewindAgentCheckpoint(sessionId, session, checkpointId),
        (b) => b.call('rewind', { sessionId, checkpointId }),
      )
    },
  )

  ipcMain.handle(
    'agent:restoreCheckpointFiles',
    async (_, sessionId: string, projectRoot: string, checkpointId?: string) => {
      if (!sessionId?.trim()) return { ok: false as const, error: t('errors.missingSessionId') }
      if (!projectRoot?.trim()) return { ok: false as const, error: t('errors.noProject') }
      return withAgentRuntime(
        () => restoreCheckpointFilesOnly(sessionId.trim(), projectRoot.trim(), checkpointId),
        (b) => b.call('restoreCheckpointFiles', { sessionId, projectRoot, checkpointId }),
      )
    },
  )

  ipcMain.handle('agent:listBackgroundTasks', async (_, sessionId?: string) =>
    withAgentRuntime(
      () => ({
        ok: true as const,
        tasks: listBackgroundRuns(sessionId).map((t) => ({
          id: t.id,
          description: t.description,
          status: t.status,
          startedAt: t.startedAt,
        })),
      }),
      (b) => b.call('listBackgroundTasks', { sessionId }),
    ),
  )

  ipcMain.handle(
    'agent:resolveBackgroundTasks',
    async (_, projectRoot: string, taskIds: string[]) => {
      if (!projectRoot?.trim()) return { ok: false as const, error: t('errors.noProject') }
      const ids = Array.isArray(taskIds) ? taskIds : []
      return withAgentRuntime(
        () => resolveBackgroundTasks(projectRoot.trim(), ids).then((tasks) => ({
          ok: true as const,
          tasks,
        })),
        (b) => b.call('resolveBackgroundTasks', { projectRoot, taskIds: ids }),
      )
    },
  )

  ipcMain.handle('agent:readMemory', async () => {
    const p = axecoderPath('memory.md')
    const res = await readMemoryFile(p)
    if (!res.ok) return res
    return { ok: true as const, path: p, text: res.text }
  })

  ipcMain.handle('agent:projectMemory', async (_, projectRoot: string) => {
    if (!projectRoot?.trim()) return { ok: false as const, error: t('errors.noProject') }
    const { composeMemoryPrompt, loadMemoryIndex } = await import('./agent/agent-memory')
    const index = await loadMemoryIndex(projectRoot)
    const full = await composeMemoryPrompt(projectRoot)
    const text = full?.trim() || (index ? `# Saved memories\n\n${index}` : '(no project memory yet — use Remember tool or create AGENTS.md)')
    return { ok: true as const, text }
  })

  ipcMain.handle('agent:writeMemory', async (_, text: string) => {
    const p = axecoderPath('memory.md')
    const res = await writeMemoryFile(p, text)
    if (!res.ok) return res
    return { ok: true as const, path: p }
  })

  ipcMain.handle('agent:initAgentsMd', async (_, projectRoot: string) => {
    if (!projectRoot?.trim()) return { ok: false as const, error: 'No project open' }
    const filePath = path.join(path.resolve(projectRoot), 'AGENTS.md')
    try {
      await fs.access(filePath)
      return { ok: true as const, path: filePath, created: false }
    } catch {
      await fs.writeFile(filePath, AGENTS_MD_TEMPLATE, 'utf-8')
      return { ok: true as const, path: filePath, created: true }
    }
  })

  ipcMain.handle('agent:designSlash', async (_, projectRoot: string, args: string) => {
    return runDesignSlash(typeof projectRoot === 'string' ? projectRoot : '', typeof args === 'string' ? args : '')
  })

  ipcMain.handle(
    'agent:answerQuestions',
    async (
      _,
      sessionId: string,
      pendingId: string,
      answers: Record<string, string | string[]>,
    ) =>
      withAgentRuntime(
        () => answerAgentQuestions(sessionId, pendingId, answers),
        (b) => b.call('answerQuestions', { sessionId, pendingId, answers }),
      ),
  )

  ipcMain.handle('agent:buildPlan', async (_, sessionId: string, pendingId: string) =>
    withAgentRuntime(
      () => buildAgentPlan(sessionId, pendingId),
      (b) => b.call('buildPlan', { sessionId, pendingId }),
    ),
  )

  ipcMain.handle('agent:dismissPlan', async (_, sessionId: string, pendingId: string) =>
    withAgentRuntime(
      () => dismissAgentPlan(sessionId, pendingId),
      (b) => b.call('dismissPlan', { sessionId, pendingId }),
    ),
  )

  ipcMain.handle('agent:composePlanBuild', async (_, projectRoot: string, planPath: string) => {
    return composePlanBuildMessage(projectRoot, planPath)
  })
}
