import type { AgentToolDef } from './agent-types'
import { LSP_TOOL_DESCRIPTION } from './agent-lsp-prompt'
import { LSP_OPERATIONS } from '../lsp/types'
import {
  CODEGRAPH_EXPLORE_DESCRIPTION,
  CODEGRAPH_NODE_DESCRIPTION,
  CODEGRAPH_SEARCH_DESCRIPTION,
} from './agent-codegraph-prompt'

const pad = (text: string, min = 420) => {
  let s = text.trim()
  const tail =
    ' Follow AxeCoder agent conventions: prefer dedicated file tools, do not fabricate tool results, and respect user approval for destructive operations.'
  if (!s.includes(tail)) s += tail
  while (s.length < min) s += ' Use only when this capability is required for the user task.'
  return s
}

const obj = (
  name: AgentToolDef['name'],
  description: string,
  properties: Record<string, unknown>,
  required: string[],
): AgentToolDef => ({
  name,
  description: pad(description),
  parameters: { type: 'object', properties, required },
})

export const buildExtendedAgentTools = (): AgentToolDef[] => [
  obj(
    'TodoWrite',
    'Update the structured todo list for this session. Use to track multi-step work. Merge by id; statuses: pending, in_progress, completed, cancelled. Do not use for trivial single-step tasks.',
    {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
          },
          required: ['id', 'content', 'status'],
        },
      },
    },
    ['todos'],
  ),
  obj('TaskCreate', 'Create a task (todo v2) with subject and description.', {
    subject: { type: 'string' },
    description: { type: 'string' },
  }, ['subject', 'description']),
  obj('TaskGet', 'Get a task by id.', { task_id: { type: 'string' } }, ['task_id']),
  obj('TaskUpdate', 'Update task fields.', {
    task_id: { type: 'string' },
    subject: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
  }, ['task_id']),
  obj('TaskList', 'List all tasks in this session.', {}, []),
  obj(
    'Coordinator',
    'Coordinate multiple sub-agents: pass an array of subtasks (description + prompt + optional subagent_type). Runs in parallel by default; set parallel:false for serial. Returns aggregated reports. Use for decomposable work instead of many separate Task calls.',
    {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Short label for this subtask' },
            prompt: { type: 'string', description: 'Full prompt for the sub-agent' },
            subagent_type: { type: 'string', description: 'e.g. explore, generalPurpose, shell' },
            readonly: { type: 'boolean' },
          },
          required: ['description', 'prompt'],
        },
      },
      parallel: { type: 'boolean', description: 'Run subtasks in parallel (default true)' },
    },
    ['tasks'],
  ),
  obj('WebFetch', 'Fetch a URL and return readable text content. HTTPS only.', {
    url: { type: 'string' },
  }, ['url']),
  obj('WebSearch', 'Search the web: Serper API (cloud) when key set, else Playwright (local browser).', {
    search_term: { type: 'string', description: 'Search query' },
    explanation: { type: 'string', description: 'Why this search is needed' },
  }, ['search_term']),
  obj(
    'WebRun',
    'Browser automation via Playwright (navigate, snapshot, click, type, screenshot). Requires agentFeatureWebRun in Settings.',
    {
      action: {
        type: 'string',
        description: 'navigate | snapshot | click | type | screenshot',
      },
      url: { type: 'string', description: 'URL for navigate' },
      selector: { type: 'string', description: 'CSS selector for click/type' },
      text: { type: 'string', description: 'Text for type action' },
    },
    ['action'],
  ),
  obj('NotebookEdit', 'Edit Jupyter notebook cells (.ipynb).', {
    target_notebook: { type: 'string' },
    cell_idx: { type: 'number' },
    is_new_cell: { type: 'boolean' },
    cell_language: { type: 'string' },
    old_string: { type: 'string' },
    new_string: { type: 'string' },
  }, ['target_notebook', 'cell_idx', 'is_new_cell', 'cell_language', 'old_string', 'new_string']),
  obj('EnterPlanMode', 'Switch to plan mode: read-only planning before implementation.', {}, []),
  obj('ExitPlanMode', 'Exit plan mode and resume normal agent execution.', {}, []),
  obj(
    'SwitchMode',
    'Switch interaction mode. target_mode_id: agent | plan (planning and auto-plan are legacy aliases).',
    {
      target_mode_id: { type: 'string', description: 'Target mode id' },
      explanation: { type: 'string', description: 'Optional reason for switching mode' },
    },
    ['target_mode_id'],
  ),
  obj(
    'CreatePlan',
    'Create an implementation plan in plan mode. Writes docs/plans/plan-<slug>.md and shows Build in chat. User must click Build to start implementation.',
    {
      name: { type: 'string', description: 'Plan title / slug source' },
      overview: { type: 'string', description: 'Short summary of the plan' },
      plan: { type: 'string', description: 'Full plan markdown body' },
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['content'],
        },
      },
      file_path: { type: 'string', description: 'Optional override path (default docs/plans/plan-<slug>.md)' },
    },
    ['name', 'overview', 'plan'],
  ),
  obj('Skill', 'Load and follow a skill by name from .cursor/skills.', {
    skill: { type: 'string' },
  }, ['skill']),
  obj('DiscoverSkills', 'List available skills in project and user .cursor/skills.', {}, []),
  obj(
    'DiscoverCommands',
    'List slash commands: built-in workflow playbooks, custom ~/.cursor/commands, project commands, skills-as-slash, and UI-only chat commands.',
    {},
    [],
  ),
  obj(
    'SlashCommand',
    'Load and follow a slash command playbook by name (without leading /). Returns workflow/custom markdown for playbook commands; UI-only commands return a hint to use chat or Agent tools.',
    {
      command: { type: 'string', description: 'Slash command name, e.g. research-codebase or rppit' },
      args: { type: 'string', description: 'Optional user notes appended to the playbook' },
    },
    ['command'],
  ),
  obj('CallMcpTool', 'Invoke an MCP tool on a configured server.', {
    server: { type: 'string' },
    toolName: { type: 'string' },
    arguments: { type: 'object' },
  }, ['server', 'toolName']),
  obj(
    'McpAuth',
    'Authenticate an MCP server when required. For OAuth plugins (e.g. context7), opens browser sign-in. Retry CallMcpTool after success.',
    { server: { type: 'string', description: 'MCP server name from mcp.json or builtin plugins' } },
    ['server'],
  ),
  obj('ListMcpResources', 'List MCP resources from configured servers.', {}, []),
  obj('ReadMcpResource', 'Read an MCP resource by URI.', {
    server: { type: 'string' },
    uri: { type: 'string' },
  }, ['server', 'uri']),
  obj('TaskOutput', 'Read output from a background sub-agent task by id.', {
    task_id: { type: 'string' },
    block: { type: 'boolean' },
  }, ['task_id']),
  obj(
    'ShellStdin',
    'Write stdin to a running background shell task (from Bash with run_in_background). Use TaskOutput to read prompts first, then ShellStdin to respond. Set close_stdin:true to send EOF.',
    {
      task_id: { type: 'string', description: 'Background shell task id from Bash' },
      input: { type: 'string', description: 'Bytes/text to write to the process stdin' },
      close_stdin: {
        type: 'boolean',
        description: 'When true, close stdin after writing (EOF). Default false.',
      },
    },
    ['task_id', 'input'],
  ),
  obj('TaskStop', 'Stop a running background sub-agent task or background Bash shell task by task_id.', {
    task_id: { type: 'string' },
  }, ['task_id']),
  obj('ToolSearch', 'Search available tools by keyword when the tool pool is large.', {
    query: { type: 'string' },
  }, ['query']),
  obj('LSP', LSP_TOOL_DESCRIPTION, {
    operation: {
      type: 'string',
      enum: [...LSP_OPERATIONS],
      description: 'The LSP operation to perform',
    },
    filePath: { type: 'string', description: 'The absolute or relative path to the file' },
    line: { type: 'number', description: 'The line number (1-based, as shown in editors)' },
    character: { type: 'number', description: 'The character offset (1-based, as shown in editors)' },
  }, ['operation', 'filePath', 'line', 'character']),
  obj(
    'ReadLints',
    'Read linter/IDE diagnostics for project files via LSP. Use after edits to verify no type or lint errors. Requires agentFeatureLsp and LSP servers in lsp.json.',
    {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional file paths relative to project root. Omit to scan up to 30 common source files.',
      },
    },
    [],
  ),
  obj(
    'FixLints',
    'Auto-fix linter/IDE diagnostics via LSP codeAction (quickfix / fixAll). Applies WorkspaceEdit then re-runs ReadLints. Requires agentFeatureLsp. Not available in plan mode.',
    {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional file paths to fix. Omit to scan up to 30 common source files.',
      },
    },
    [],
  ),
  obj('CodeGraphExplore', CODEGRAPH_EXPLORE_DESCRIPTION, {
    query: { type: 'string', description: 'Symbol names, file names, or terms to explore' },
    maxFiles: { type: 'number', description: 'Max files to include source from (default 12)' },
  }, ['query']),
  obj('CodeGraphSearch', CODEGRAPH_SEARCH_DESCRIPTION, {
    query: { type: 'string', description: 'Symbol name or partial name' },
    kind: {
      type: 'string',
      enum: ['function', 'method', 'class', 'interface', 'type', 'variable', 'route', 'component'],
    },
    limit: { type: 'number', description: 'Max results (default 10)' },
  }, ['query']),
  obj('CodeGraphNode', CODEGRAPH_NODE_DESCRIPTION, {
    symbol: { type: 'string', description: 'Exact or qualified symbol name' },
    includeCode: { type: 'boolean', description: 'Include full source body (default true)' },
    file: { type: 'string', description: 'Disambiguate overloads by file path or basename' },
    line: { type: 'number', description: 'Disambiguate by line number' },
  }, ['symbol']),
  obj('EnterWorktree', 'Create/use a git worktree for isolated work. Requires agentFeatureWorktree.', {
    name: { type: 'string' },
  }, []),
  obj('ExitWorktree', 'Leave the current git worktree.', {}, []),
  obj('Sleep', 'Wait for a duration in ms (background polling). Requires agentFeatureSleep.', {
    ms: { type: 'number' },
  }, ['ms']),
  obj('Brief', 'Request a brief structured summary from the user.', {
    message: { type: 'string' },
  }, ['message']),
  obj('Config', 'Read agent-related config keys from AxeCoder settings.', {
    keys: { type: 'array', items: { type: 'string' } },
  }, []),
  obj('Workflow', 'Run a named workflow stub. Requires agentFeatureWorkflow.', {
    name: { type: 'string' },
  }, ['name']),
  obj(
    'Remember',
    'Save a durable fact to project auto-memory (.axecoder/memory). Loads into future sessions. Reuse name to update; use Forget to delete.',
    {
      name: { type: 'string', description: 'kebab-case slug; omit to derive from description' },
      title: { type: 'string' },
      description: { type: 'string', description: 'One-line summary for the memory index' },
      type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'] },
      body: { type: 'string', description: 'The fact (Markdown)' },
    },
    ['description', 'body'],
  ),
  obj('Forget', 'Delete a saved auto-memory entry by name.', {
    name: { type: 'string' },
  }, ['name']),
  obj(
    'DisplayDiagram',
    'Display a new draw.io diagram or replace the entire diagram XML.',
    { xml: { type: 'string', description: 'Full draw.io mxfile or mxGraphModel XML' } },
    ['xml'],
  ),
  obj(
    'EditDiagram',
    'Apply search/replace edits to the current diagram XML.',
    {
      edits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            replace: { type: 'string' },
          },
          required: ['search', 'replace'],
        },
      },
    },
    ['edits'],
  ),
  obj('GetDiagram', 'Return the current diagram XML before making targeted edits.', {}, []),
]
