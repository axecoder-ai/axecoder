import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type McpServerConfig = {
  name: string
  command?: string
  args?: string[]
  url?: string
}

const mcpConfigPaths = () => [
  path.join(os.homedir(), '.cursor', 'mcp.json'),
  path.join(os.homedir(), '.config', 'axecoder', 'mcp.json'),
]

export const loadMcpConfig = async (): Promise<{ servers: McpServerConfig[]; error?: string }> => {
  for (const p of mcpConfigPaths()) {
    try {
      const raw = await fs.readFile(p, 'utf-8')
      const data = JSON.parse(raw) as { mcpServers?: Record<string, Record<string, unknown>> }
      const servers: McpServerConfig[] = []
      const map = data.mcpServers ?? {}
      for (const [name, cfg] of Object.entries(map)) {
        servers.push({
          name,
          command: typeof cfg.command === 'string' ? cfg.command : undefined,
          args: Array.isArray(cfg.args) ? cfg.args.map(String) : undefined,
          url: typeof cfg.url === 'string' ? cfg.url : undefined,
        })
      }
      return { servers }
    } catch {
      // try next path
    }
  }
  return {
    servers: [],
    error: 'No MCP config found. Add ~/.cursor/mcp.json with mcpServers.',
  }
}

export const listMcpResourcesStub = async () => {
  const { servers, error } = await loadMcpConfig()
  if (!servers.length) {
    return { ok: false as const, error: error ?? 'No MCP servers configured' }
  }
  const lines = servers.map((s) => `- ${s.name} (${s.url ? 'url' : 'stdio'})`)
  return {
    ok: true as const,
    text: `MCP servers (resources require live MCP client; stub listing):\n${lines.join('\n')}`,
  }
}

export const callMcpToolStub = async (
  server: string,
  toolName: string,
  _args: Record<string, unknown>,
) => {
  const { servers, error } = await loadMcpConfig()
  const found = servers.find((s) => s.name === server)
  if (!found) {
    return {
      ok: false as const,
      error: error ?? `MCP server "${server}" not found in config`,
    }
  }
  return {
    ok: false as const,
    error: `MCP tool execution not yet wired for server "${server}" tool "${toolName}". Configure MCP in Cursor and use IDE integration.`,
  }
}
