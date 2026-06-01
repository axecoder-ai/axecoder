import { loadMcpConfig } from './agent-mcp'

/** Claude Code §11 `getMcpInstructions` — MCP 动态段 */
export const getMcpInstructionsSection = async (): Promise<string | null> => {
  const { servers, error } = await loadMcpConfig()
  if (!servers.length) {
    if (error) return `# MCP\n\n${error}`
    return null
  }
  const lines = servers.map((s) => {
    const kind = s.url ? `url=${s.url}` : `stdio ${s.command ?? ''} ${(s.args ?? []).join(' ')}`.trim()
    return `- **${s.name}**: ${kind}`
  })
  return `# MCP servers\n\nThe following MCP servers are configured. Use \`CallMcpTool\`, \`ListMcpResources\`, and \`ReadMcpResource\` when needed.\n\n${lines.join('\n')}`
}
