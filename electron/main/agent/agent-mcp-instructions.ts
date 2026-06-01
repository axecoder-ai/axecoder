import { buildMcpPromptLines, loadMcpConfig } from './agent-mcp'

/** Claude Code §11 `getMcpInstructions` — MCP 动态段 */
export const getMcpInstructionsSection = async (): Promise<string | null> => {
  const { servers, error } = await loadMcpConfig()
  if (!servers.length) {
    if (error) return `# MCP\n\n${error}`
    return null
  }
  const lines = await buildMcpPromptLines()
  return `# MCP servers

The following MCP servers are configured in mcp.json. Use \`CallMcpTool\`, \`ListMcpResources\`, and \`ReadMcpResource\` with the \`server\` parameter set to the server name.

${lines.join('\n')}`
}
