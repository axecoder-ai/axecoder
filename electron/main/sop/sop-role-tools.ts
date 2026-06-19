import type { AgentToolDef, AgentToolName } from '../agent/agent-types'
import type { BuiltinUserRole } from '../users-types'

const WRITE_TOOLS = new Set<AgentToolName>(['Write', 'Edit', 'Delete', 'NotebookEdit', 'Move'])

const SHELL_TOOLS = new Set<AgentToolName>(['Bash', 'ShellStdin'])

const READ_TOOLS = new Set<AgentToolName>([
  'Read',
  'Grep',
  'Glob',
  'CodeGraphExplore',
  'CodeGraphSearch',
  'CodeGraphNode',
  'ListMcpResources',
  'ReadMcpResource',
  'WebSearch',
  'WebFetch',
  'ReadLints',
])

/** MetaGPT 式角色工具剖面：限制各角色可用工具 */
export const filterToolsForSopRole = (
  tools: AgentToolDef[],
  role?: BuiltinUserRole,
): AgentToolDef[] => {
  if (!role) return tools

  if (role === 'product_analyst') {
    const allow = new Set<AgentToolName>([...READ_TOOLS, 'AskUserQuestion'])
    return tools.filter((t) => allow.has(t.name))
  }

  if (role === 'architect' || role === 'project_manager' || role === 'planner') {
    const deny = new Set<AgentToolName>([...SHELL_TOOLS])
    return tools.filter((t) => !deny.has(t.name))
  }

  if (role === 'qa_engineer') {
    const allow = new Set<AgentToolName>([...READ_TOOLS, ...SHELL_TOOLS, 'CallMcpTool'])
    return tools.filter((t) => allow.has(t.name) || !WRITE_TOOLS.has(t.name))
  }

  if (role === 'researcher') {
    return tools.filter((t) => !WRITE_TOOLS.has(t.name) && !SHELL_TOOLS.has(t.name))
  }

  return tools
}
