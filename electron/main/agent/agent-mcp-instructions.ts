import { buildMcpPromptLines, loadMcpConfig } from './agent-mcp'

const dbPluginNotes = (serverNames: Set<string>): string => {
  const lines: string[] = []
  if (serverNames.has('mongodb')) {
    lines.push(
      '**MongoDB:** Connection strings are per-project (`.axecoder/secrets.json`, `.mcp.json`, or env/config in the repo) — not in global Settings. Read the connection string from project files when needed; if none is preconfigured, use the `mongodb` server\'s `connect` tool via `CallMcpTool`. Never run `mongosh`, `mongo`, or install MongoDB CLI clients.',
    )
  }
  if (serverNames.has('mysql')) {
    lines.push(
      '**MySQL:** Connection URL is per-project (`mcp:mysql:connection_string` in `.axecoder/secrets.json`, `.mcp.json`, or project config) — not in global Settings. Read host/user/password/database from project files, build a `mysql://user:pass@host:port/db` URL, save to `.axecoder/secrets.json` if not preconfigured, then use `CallMcpTool` with server `mysql`. Never run `mysql`, `mysqladmin`, or install MySQL CLI clients.',
    )
  }
  return lines.length ? `\n\n${lines.join('\n\n')}` : ''
}

export const getMcpInstructionsSection = async (
  projectRoot?: string,
): Promise<string | null> => {
  const { servers, error } = await loadMcpConfig(projectRoot)
  if (!servers.length) {
    if (error) return `# MCP\n\n${error}`
    return null
  }
  const lines = await buildMcpPromptLines(projectRoot)
  const names = new Set(servers.map((s) => s.name))

  return `# MCP servers

When a server below covers what you need, use \`CallMcpTool\`, \`ListMcpResources\`, and \`ReadMcpResource\` — do not install or run separate CLI tools for the same capability.

The following MCP servers are configured. Use the \`server\` parameter set to the server name.

${lines.join('\n')}${dbPluginNotes(names)}`
}
