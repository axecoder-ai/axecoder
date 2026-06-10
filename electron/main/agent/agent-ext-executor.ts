import type { AgentToolCall, AgentToolName, AgentToolLogEntry } from './agent-types'
import type { AgentContext } from './tool-executor'
import { getSession } from './agent-session-store'
import {
  createTask,
  getSessionTodos,
  getTask,
  listTasks,
  mergeTodos,
  updateTask,
  type AgentTodoItem,
  type AgentTaskItem,
} from './agent-todo-store'
import { discoverSkills, findSkillByName, readSkillContent } from './agent-skills'
import { discoverSlashCommands, runSlashCommandForAgent } from './agent-slash-commands'
import { authenticateMcpServer } from './agent-mcp-auth'
import { callMcpTool, listMcpResources, readMcpResource } from './agent-mcp'
import { fetchUrl, webSearch } from './agent-web'
import { runWebRun } from './agent-browser-playwright'
import { editNotebookCell } from './agent-notebook'
import { formatShellTaskOutput, getShellTask, stopShellTask, writeShellStdin } from './agent-bash-tasks'
import {
  createBackgroundRunId,
  formatTaskOutput,
  getBackgroundRun,
  putBackgroundRun,
  stopBackgroundRun,
  waitForBackgroundRun,
} from './agent-subagent-tasks'
import { getConfig } from '../config-store'
import { ALL_AGENT_TOOL_NAMES } from './agent-types'
import { buildExtendedAgentTools } from './agent-tool-prompts-ext'
import { buildCoreAgentTools } from './agent-tool-prompts'
import { executeCodeGraphAgentTool, isCodeGraphAgentTool } from './agent-codegraph'
import { forgetMemory, saveMemory } from './agent-memory'
import { applySwitchModeToSession } from './chat-mode'
import { emitAgentProgress } from './agent-progress-emit'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export type ExtToolRunResult = {
  kind: 'immediate'
  content: string
  log: AgentToolLogEntry
}

const immediate = (
  name: AgentToolName,
  summary: string,
  content: string,
  ok: boolean,
): ExtToolRunResult => ({
  kind: 'immediate',
  content,
  log: { name, summary, ok },
})

const EXTENDED_NAMES = new Set<AgentToolName>(
  buildExtendedAgentTools().map((t) => t.name),
)

export const isExtendedTool = (name: AgentToolName) => EXTENDED_NAMES.has(name)

export const executeExtendedAgentTool = async (
  ctx: AgentContext,
  call: AgentToolCall,
): Promise<ExtToolRunResult | null> => {
  const { name, arguments: args } = call
  if (!isExtendedTool(name)) return null

  const sessionId = ctx.sessionId ?? ''
  const session = sessionId ? getSession(sessionId) : undefined

  if (ctx.planMode && ['Edit', 'Write', 'Delete', 'Move', 'Bash', 'FixLints'].includes(name)) {
    return immediate(name, name, 'Error: Plan mode is active. Exit plan mode before mutating files or running shell commands.', false)
  }

  if (name === 'TodoWrite') {
    if (!sessionId) return immediate(name, 'TodoWrite', 'Error: no session', false)
    const raw = args.todos
    if (!Array.isArray(raw)) return immediate(name, 'TodoWrite', 'Error: todos array required', false)
    const items: AgentTodoItem[] = []
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const rec = row as Record<string, unknown>
      const id = str(rec.id).trim() || `todo-${items.length}`
      const content = str(rec.content)
      const status = str(rec.status) as AgentTodoItem['status']
      if (!content) continue
      items.push({
        id,
        content,
        status: ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
          ? status
          : 'pending',
      })
    }
    const list = mergeTodos(sessionId, items)
    const lines = list.map((t, i) => `${i + 1}. [${t.status}] ${t.content}`).join('\n')
    const body = [
      'Todos have been modified successfully. Continue using the todo list to track progress. Proceed with current tasks if applicable.',
      lines ? `\nCurrent list:\n${lines}` : '',
    ]
      .filter(Boolean)
      .join('')
    return immediate(name, 'TodoWrite', body, true)
  }

  if (name === 'TaskCreate') {
    if (!sessionId) return immediate(name, 'TaskCreate', 'Error: no session', false)
    const task = createTask(sessionId, str(args.subject), str(args.description))
    return immediate(name, 'TaskCreate', JSON.stringify(task, null, 2), true)
  }

  if (name === 'TaskGet') {
    if (!sessionId) return immediate(name, 'TaskGet', 'Error: no session', false)
    const task = getTask(sessionId, str(args.task_id))
    if (!task) return immediate(name, 'TaskGet', 'Error: task not found', false)
    return immediate(name, 'TaskGet', JSON.stringify(task, null, 2), true)
  }

  if (name === 'TaskUpdate') {
    if (!sessionId) return immediate(name, 'TaskUpdate', 'Error: no session', false)
    const task = updateTask(sessionId, str(args.task_id), {
      subject: args.subject !== undefined ? str(args.subject) : undefined,
      description: args.description !== undefined ? str(args.description) : undefined,
      status: args.status !== undefined ? (str(args.status) as AgentTaskItem['status']) : undefined,
    })
    if (!task) return immediate(name, 'TaskUpdate', 'Error: task not found', false)
    return immediate(name, 'TaskUpdate', JSON.stringify(task, null, 2), true)
  }

  if (name === 'TaskList') {
    if (!sessionId) return immediate(name, 'TaskList', 'Error: no session', false)
    return immediate(name, 'TaskList', JSON.stringify({ tasks: listTasks(sessionId) }, null, 2), true)
  }

  if (name === 'WebFetch') {
    const res = await fetchUrl(str(args.url))
    return immediate(name, 'WebFetch', res.ok ? res.text : `Error: ${res.error}`, res.ok)
  }

  if (name === 'WebSearch') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureWebSearch) {
      return immediate(
        name,
        'WebSearch',
        'Error: WebSearch disabled. Enable agentFeatureWebSearch in AxeCoder config.',
        false,
      )
    }
    const res = await webSearch(str(args.search_term), cfg.agentWebSearchApiKey)
    return immediate(name, 'WebSearch', res.ok ? res.text : `Error: ${res.error}`, res.ok)
  }

  if (name === 'WebRun') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureWebRun) {
      return immediate(
        name,
        'WebRun',
        'Error: WebRun disabled. Enable agentFeatureWebRun in AxeCoder Settings.',
        false,
      )
    }
    const res = await runWebRun({
      action: str(args.action),
      url: str(args.url) || undefined,
      selector: str(args.selector) || undefined,
      text: str(args.text) || undefined,
    })
    return immediate(name, 'WebRun', res.ok ? res.text : `Error: ${res.error}`, res.ok)
  }

  if (name === 'NotebookEdit') {
    const res = await editNotebookCell(
      ctx.projectRoot,
      str(args.target_notebook),
      Number(args.cell_idx) || 0,
      args.is_new_cell === true,
      str(args.cell_language) || 'python',
      str(args.old_string),
      str(args.new_string),
    )
    return immediate(name, 'NotebookEdit', res.ok ? res.message : `Error: ${res.error}`, res.ok)
  }

  if (name === 'EnterPlanMode') {
    if (session) session.planMode = true
    if (ctx) ctx.planMode = true
    return immediate(name, 'EnterPlanMode', 'Plan mode enabled. File writes and Bash are blocked until ExitPlanMode.', true)
  }

  if (name === 'ExitPlanMode') {
    if (session) session.planMode = false
    if (ctx) ctx.planMode = false
    return immediate(name, 'ExitPlanMode', 'Plan mode disabled. Normal tools restored.', true)
  }

  if (name === 'SwitchMode') {
    const target = str(args.target_mode_id)
    if (!target) {
      return immediate(name, 'SwitchMode', 'Error: target_mode_id is required', false)
    }
    if (!session) {
      return immediate(name, 'SwitchMode', 'Error: no active agent session', false)
    }
    const switched = applySwitchModeToSession(session, target)
    if (!switched.ok) {
      return immediate(name, 'SwitchMode', `Error: ${switched.error}`, false)
    }
    if (ctx) ctx.planMode = session.planMode
    if (ctx.sessionId) {
      emitAgentProgress({
        sessionId: ctx.sessionId,
        kind: 'chat_mode',
        chatMode: switched.chatMode,
        planMode: session.planMode,
      })
    }
    return immediate(name, 'SwitchMode', switched.message, true)
  }

  if (name === 'Skill') {
    const skillName = str(args.skill)
    const found = await findSkillByName(ctx.projectRoot, skillName)
    if (!found) return immediate(name, 'Skill', `Error: skill "${skillName}" not found`, false)
    const content = await readSkillContent(found.path)
    if (!content.ok) return immediate(name, 'Skill', `Error: ${content.error}`, false)
    return immediate(
      name,
      `Skill ${found.name}`,
      `Skill: ${found.name} (${found.source})\nPath: ${found.path}\n\n---\n\n${content.text}`,
      true,
    )
  }

  if (name === 'DiscoverSkills') {
    const skills = await discoverSkills(ctx.projectRoot)
    return immediate(name, 'DiscoverSkills', JSON.stringify({ skills }, null, 2), true)
  }

  if (name === 'DiscoverCommands') {
    const commands = await discoverSlashCommands(ctx.projectRoot)
    return immediate(name, 'DiscoverCommands', JSON.stringify({ commands }, null, 2), true)
  }

  if (name === 'SlashCommand') {
    const command = str(args.command)
    if (!command) return immediate(name, 'SlashCommand', 'Error: command is required', false)
    const res = await runSlashCommandForAgent(ctx.projectRoot, command, str(args.args))
    if (!res.ok) return immediate(name, 'SlashCommand', `Error: ${res.error}`, false)
    const header =
      res.kind === 'ui'
        ? `UI slash /${res.name}`
        : res.kind === 'skill'
          ? `Skill slash /${res.name} (${res.path})`
          : `Slash /${res.name} (${res.path})`
    return immediate(name, header, `${header}\n\n---\n\n${res.text}`, true)
  }

  if (name === 'CallMcpTool') {
    const res = await callMcpTool(
      str(args.server),
      str(args.toolName),
      (args.arguments as Record<string, unknown>) ?? {},
      ctx.projectRoot,
    )
    if (!res.ok) return immediate(name, 'CallMcpTool', `Error: ${res.error}`, false)
    return immediate(name, 'CallMcpTool', res.text, true)
  }

  if (name === 'McpAuth') {
    const server = str(args.server)
    if (!server) return immediate(name, 'McpAuth', 'Error: server is required', false)
    const res = await authenticateMcpServer(server, ctx.projectRoot)
    if (!res.ok) return immediate(name, 'McpAuth', `Error: ${res.error}`, false)
    return immediate(name, 'McpAuth', res.message, true)
  }

  if (name === 'ListMcpResources') {
    const res = await listMcpResources(ctx.projectRoot)
    return immediate(name, 'ListMcpResources', res.ok ? res.text : `Error: ${res.error}`, res.ok)
  }

  if (name === 'ReadMcpResource') {
    const res = await readMcpResource(str(args.server), str(args.uri), ctx.projectRoot)
    if (!res.ok) return immediate(name, 'ReadMcpResource', `Error: ${res.error}`, false)
    return immediate(name, 'ReadMcpResource', res.text, true)
  }

  if (name === 'TaskOutput') {
    const taskId = str(args.task_id)
    const block = args.block === true
    const subRun = block ? await waitForBackgroundRun(taskId) : getBackgroundRun(taskId)
    if (subRun) return immediate(name, 'TaskOutput', formatTaskOutput(subRun), true)
    const shellRun = getShellTask(taskId)
    if (shellRun) {
      return immediate(name, 'TaskOutput', formatShellTaskOutput(shellRun), true)
    }
    return immediate(name, 'TaskOutput', 'Error: task not found', false)
  }

  if (name === 'ShellStdin') {
    const taskId = str(args.task_id)
    const input = typeof args.input === 'string' ? args.input : ''
    if (!taskId) return immediate(name, 'ShellStdin', 'Error: task_id is required', false)
    if (!input) return immediate(name, 'ShellStdin', 'Error: input is required', false)
    const res = writeShellStdin(taskId, input, { closeStdin: args.close_stdin === true })
    if (!res.ok) return immediate(name, 'ShellStdin', `Error: ${res.error}`, false)
    const closeNote = args.close_stdin === true ? ' (stdin closed)' : ''
    return immediate(name, 'ShellStdin', `Wrote ${input.length} byte(s) to task ${taskId}${closeNote}`, true)
  }

  if (name === 'TaskStop') {
    const taskId = str(args.task_id)
    const subRun = stopBackgroundRun(taskId)
    if (subRun) return immediate(name, 'TaskStop', `Stopped task ${subRun.id}`, true)
    const wasRunning = getShellTask(taskId)?.status === 'running'
    const shellRun = stopShellTask(taskId)
    if (shellRun) {
      return immediate(
        name,
        'TaskStop',
        wasRunning ? `Stopped shell task ${shellRun.id}` : `Shell task ${shellRun.id} (${shellRun.status})`,
        true,
      )
    }
    return immediate(name, 'TaskStop', 'Error: task not found', false)
  }

  if (name === 'ToolSearch') {
    const q = str(args.query).toLowerCase()
    const all = [...buildCoreAgentTools(), ...buildExtendedAgentTools()]
    const matched = all.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    )
    if (session) {
      for (const t of matched) session.revealedToolNames.add(t.name)
    }
    return immediate(
      name,
      'ToolSearch',
      JSON.stringify(
        { query: q, matches: matched.map((t) => ({ name: t.name, description: t.description.slice(0, 200) })) },
        null,
        2,
      ),
      true,
    )
  }

  if (name === 'LSP') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureLsp) {
      return immediate(name, 'LSP', 'Error: LSP tool disabled. Enable agentFeatureLsp in config.', false)
    }
    const { executeAgentLsp } = await import('./agent-lsp')
    const res = await executeAgentLsp(ctx.projectRoot, args as Record<string, unknown>)
    return immediate(name, 'LSP', res.text, res.ok)
  }

  if (name === 'ReadLints') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureLsp) {
      return immediate(
        name,
        'ReadLints',
        'Error: ReadLints disabled. Enable agentFeatureLsp in AxeCoder Settings.',
        false,
      )
    }
    const { executeAgentReadLints } = await import('./agent-read-lints')
    const res = await executeAgentReadLints(ctx.projectRoot, args as Record<string, unknown>)
    const summary =
      Array.isArray(args.paths) && args.paths.length
        ? `ReadLints ${(args.paths as string[]).length} file(s)`
        : 'ReadLints'
    return immediate(name, summary, res.text, res.ok)
  }

  if (name === 'FixLints') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureLsp) {
      return immediate(
        name,
        'FixLints',
        'Error: FixLints disabled. Enable agentFeatureLsp in AxeCoder Settings.',
        false,
      )
    }
    const { executeAgentFixLints } = await import('./agent-fix-lints')
    const res = await executeAgentFixLints(ctx.projectRoot, args as Record<string, unknown>)
    const summary =
      Array.isArray(args.paths) && args.paths.length
        ? `FixLints ${(args.paths as string[]).length} file(s)`
        : 'FixLints'
    return immediate(name, summary, res.text, res.ok)
  }

  if (isCodeGraphAgentTool(name)) {
    const cfg = await getConfig()
    if (cfg.agentFeatureCodeGraph === false) {
      return immediate(
        name,
        name,
        'Error: CodeGraph tools disabled. Enable agentFeatureCodeGraph in config.',
        false,
      )
    }
    const res = await executeCodeGraphAgentTool(ctx.projectRoot, name, args as Record<string, unknown>)
    return immediate(name, name, res.text, res.ok)
  }

  if (name === 'EnterWorktree') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureWorktree) {
      return immediate(name, 'EnterWorktree', 'Error: Worktree disabled. Enable agentFeatureWorktree.', false)
    }
    return immediate(
      name,
      'EnterWorktree',
      `Worktree stub: would create worktree "${str(args.name) || 'axecoder-agent'}". Use git worktree manually for now.`,
      true,
    )
  }

  if (name === 'ExitWorktree') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureWorktree) {
      return immediate(name, 'ExitWorktree', 'Error: Worktree disabled.', false)
    }
    return immediate(name, 'ExitWorktree', 'Worktree stub: exit worktree (no-op in stub).', true)
  }

  if (name === 'Sleep') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureSleep) {
      return immediate(name, 'Sleep', 'Error: Sleep disabled. Enable agentFeatureSleep.', false)
    }
    const ms = Math.min(Math.max(Number(args.ms) || 1000, 100), 60_000)
    await new Promise((r) => setTimeout(r, ms))
    return immediate(name, 'Sleep', `Slept ${ms}ms`, true)
  }

  if (name === 'Brief') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureBrief) {
      return immediate(name, 'Brief', 'Error: Brief disabled. Enable agentFeatureBrief.', false)
    }
    return immediate(name, 'Brief', `Brief request noted: ${str(args.message)}`, true)
  }

  if (name === 'Config') {
    const cfg = await getConfig()
    const keys = Array.isArray(args.keys) ? args.keys.map(String) : Object.keys(cfg)
    const picked: Record<string, unknown> = {}
    for (const k of keys) {
      if (k in cfg) picked[k] = (cfg as Record<string, unknown>)[k]
    }
    return immediate(name, 'Config', JSON.stringify(picked, null, 2), true)
  }

  if (name === 'Workflow') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureWorkflow) {
      return immediate(name, 'Workflow', 'Error: Workflow disabled. Enable agentFeatureWorkflow.', false)
    }
    return immediate(
      name,
      'Workflow',
      `Workflow stub: "${str(args.name)}" is not registered. Add workflow definitions in a future release.`,
      true,
    )
  }

  if (name === 'Remember') {
    const res = await saveMemory(ctx.projectRoot, {
      name: str(args.name),
      title: str(args.title),
      description: str(args.description),
      type: str(args.type) as 'user' | 'feedback' | 'project' | 'reference',
      body: str(args.body),
    })
    if (!res.ok) return immediate(name, 'Remember', `Error: ${res.error}`, false)
    return immediate(
      name,
      'Remember',
      `Saved memory "${res.name}" to ${res.path} (loads in future sessions).`,
      true,
    )
  }

  if (name === 'Forget') {
    const res = await forgetMemory(ctx.projectRoot, str(args.name))
    if (!res.ok) return immediate(name, 'Forget', `Error: ${res.error}`, false)
    return immediate(name, 'Forget', `Deleted memory "${res.name}".`, true)
  }

  return immediate(name, String(name), `Error: unhandled extended tool ${name}`, false)
}

export { filterToolsForCcSubagent as filterToolsForSubagent } from './agent-subagent-types'

export const getSessionActiveTools = (
  allTools: { name: AgentToolName }[],
  revealed: Set<AgentToolName>,
) => {
  const hidden = new Set(
    ALL_AGENT_TOOL_NAMES.filter(
      (n) =>
        !revealed.has(n) &&
        buildExtendedAgentTools().some((t) => t.name === n) &&
        ![
          'TodoWrite',
          'EnterPlanMode',
          'ExitPlanMode',
          'SwitchMode',
          'ToolSearch',
          'DiscoverSkills',
          'DiscoverCommands',
          'CodeGraphExplore',
          'CodeGraphSearch',
          'CodeGraphNode',
        ].includes(n),
    ),
  )
  return allTools.filter((t) => !hidden.has(t.name))
}
