import type { AgentToolName } from './agent-types'
import { executeVendoredCodeGraphTool } from '../codegraph/manager'

const MCP_TOOL: Partial<Record<AgentToolName, string>> = {
  CodeGraphExplore: 'codegraph_explore',
  CodeGraphSearch: 'codegraph_search',
  CodeGraphNode: 'codegraph_node',
}

export const isCodeGraphAgentTool = (name: AgentToolName) => name in MCP_TOOL

export const executeCodeGraphAgentTool = async (
  projectRoot: string,
  name: AgentToolName,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> => {
  const mcpName = MCP_TOOL[name]
  if (!mcpName) return { ok: false, text: `Error: unknown CodeGraph tool ${name}` }
  return executeVendoredCodeGraphTool(projectRoot, mcpName, args)
}
