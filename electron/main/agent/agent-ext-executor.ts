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
import { callMcpTool, listMcpResources, loadMcpConfig, readMcpResource } from './agent-mcp'
import { fetchUrl, webSearchStub } from './agent-web'
import { editNotebookCell } from './agent-notebook'
import {
  createBackgroundRunId,
  formatTaskOutput,
  getBackgroundRun,
  putBackgroundRun,
  stopBackgroundRun,
} from './agent-subagent-tasks'
import { getConfig } from '../config-store'
import { ALL_AGENT_TOOL_NAMES } from './agent-types'
import { buildExtendedAgentTools } from './agent-tool-prompts-ext'
import { buildCoreAgentTools } from './agent-tool-prompts'

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

  if (ctx.planMode && ['Edit', 'Write', 'Delete', 'Move', 'Bash'].includes(name)) {
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
    return immediate(name, 'TodoWrite', JSON.stringify({ todos: list }, null, 2), true)
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
    const res = await webSearchStub(str(args.search_term), cfg.agentWebSearchApiKey)
    return immediate(name, 'WebSearch', res.ok ? res.text : `Error: ${res.error}`, res.ok)
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

  if (name === 'CallMcpTool') {
    const res = await callMcpTool(
      str(args.server),
      str(args.toolName),
      (args.arguments as Record<string, unknown>) ?? {},
    )
    if (!res.ok) return immediate(name, 'CallMcpTool', `Error: ${res.error}`, false)
    return immediate(name, 'CallMcpTool', res.text, true)
  }

  if (name === 'McpAuth') {
    const { servers, error } = await loadMcpConfig()
    const server = str(args.server)
    const found = servers.find((s) => s.name === server)
    if (!found) return immediate(name, 'McpAuth', `Error: ${error ?? 'server not found'}`, false)
    return immediate(
      name,
      'McpAuth',
      `MCP server "${server}" is configured (${found.url ? 'url' : 'stdio'}). If the server requires OAuth, complete authentication in mcp.json / Cursor MCP settings, then retry CallMcpTool.`,
      true,
    )
  }

  if (name === 'ListMcpResources') {
    const res = await listMcpResources()
    return immediate(name, 'ListMcpResources', res.ok ? res.text : `Error: ${res.error}`, res.ok)
  }

  if (name === 'ReadMcpResource') {
    const res = await readMcpResource(str(args.server), str(args.uri))
    if (!res.ok) return immediate(name, 'ReadMcpResource', `Error: ${res.error}`, false)
    return immediate(name, 'ReadMcpResource', res.text, true)
  }

  if (name === 'TaskOutput') {
    const run = getBackgroundRun(str(args.task_id))
    if (!run) return immediate(name, 'TaskOutput', 'Error: task not found', false)
    return immediate(name, 'TaskOutput', formatTaskOutput(run), true)
  }

  if (name === 'TaskStop') {
    const run = stopBackgroundRun(str(args.task_id))
    if (!run) return immediate(name, 'TaskStop', 'Error: task not found', false)
    return immediate(name, 'TaskStop', `Stopped task ${run.id}`, true)
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
    return immediate(
      name,
      'LSP',
      `LSP stub: operation=${str(args.operation)} file=${str(args.file_path)}:${args.line}:${args.character}. Wire language server in a future release.`,
      true,
    )
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

  return immediate(name, String(name), `Error: unhandled extended tool ${name}`, false)
}

export const filterToolsForSubagent = (
  tools: readonly { name: AgentToolName }[],
  subagentType?: string,
) => {
  const t = (subagentType || 'generalPurpose').toLowerCase()
  const readOnly = t === 'explore' || t === 'plan'
  const blocked = new Set<AgentToolName>(['Agent', 'AskUserQuestion'])
  if (readOnly) {
    for (const n of ['Edit', 'Write', 'Delete', 'Move', 'Bash'] as AgentToolName[]) blocked.add(n)
  }
  if (t === 'plan') {
    blocked.add('EnterPlanMode')
    blocked.add('ExitPlanMode')
  }
  return tools.filter((tool) => !blocked.has(tool.name))
}

export const getSessionActiveTools = (
  allTools: { name: AgentToolName }[],
  revealed: Set<AgentToolName>,
) => {
  const hidden = new Set(
    ALL_AGENT_TOOL_NAMES.filter(
      (n) =>
        !revealed.has(n) &&
        buildExtendedAgentTools().some((t) => t.name === n) &&
        !['TodoWrite', 'EnterPlanMode', 'ExitPlanMode', 'ToolSearch', 'DiscoverSkills'].includes(n),
    ),
  )
  return allTools.filter((t) => !hidden.has(t.name))
}
