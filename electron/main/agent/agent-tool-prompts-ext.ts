import type { AgentToolDef } from './agent-types'

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
  obj('WebFetch', 'Fetch a URL and return readable text content. HTTPS only.', {
    url: { type: 'string' },
  }, ['url']),
  obj('WebSearch', 'Search the web (requires agentWebSearchApiKey in config).', {
    search_term: { type: 'string' },
  }, ['search_term']),
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
  obj('Skill', 'Load and follow a skill by name from .cursor/skills.', {
    skill: { type: 'string' },
  }, ['skill']),
  obj('DiscoverSkills', 'List available skills in project and user .cursor/skills.', {}, []),
  obj('CallMcpTool', 'Invoke an MCP tool on a configured server.', {
    server: { type: 'string' },
    toolName: { type: 'string' },
    arguments: { type: 'object' },
  }, ['server', 'toolName']),
  obj('McpAuth', 'Authenticate an MCP server when required.', {
    server: { type: 'string' },
  }, ['server']),
  obj('ListMcpResources', 'List MCP resources from configured servers.', {}, []),
  obj('ReadMcpResource', 'Read an MCP resource by URI.', {
    server: { type: 'string' },
    uri: { type: 'string' },
  }, ['server', 'uri']),
  obj('TaskOutput', 'Read output from a background sub-agent task by id.', {
    task_id: { type: 'string' },
    block: { type: 'boolean' },
  }, ['task_id']),
  obj('TaskStop', 'Stop a running background sub-agent task.', {
    task_id: { type: 'string' },
  }, ['task_id']),
  obj('ToolSearch', 'Search available tools by keyword when the tool pool is large.', {
    query: { type: 'string' },
  }, ['query']),
  obj('LSP', 'Language server operation (goToDefinition, references). Requires agentFeatureLsp.', {
    operation: { type: 'string' },
    file_path: { type: 'string' },
    line: { type: 'number' },
    character: { type: 'number' },
  }, ['operation', 'file_path', 'line', 'character']),
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
]
