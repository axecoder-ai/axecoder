export type McpPluginAuthMode = 'oauth' | 'api_key'

export type McpPluginDefinition = {
  id: string
  serverName: string
  displayName: string
  description: string
  docUrl: string
  /** MCP 连接 URL（OAuth 插件为 /mcp/oauth） */
  url: string
  oauthUrl?: string
  authMode: McpPluginAuthMode
  headerKey?: string
  secretKey?: string
  expectedTools: string[]
}

export const CONTEXT7_PLUGIN_ID = 'context7'
export const CONTEXT7_SECRET_KEY = 'mcp:context7'

const CONTEXT7_DEF: McpPluginDefinition = {
  id: CONTEXT7_PLUGIN_ID,
  serverName: 'context7',
  displayName: 'Context7',
  description: 'Up-to-date library and framework documentation via MCP.',
  docUrl: 'https://context7.com/docs/howto/oauth',
  url: 'https://mcp.context7.com/mcp/oauth',
  oauthUrl: 'https://mcp.context7.com/mcp/oauth',
  authMode: 'oauth',
  headerKey: 'CONTEXT7_API_KEY',
  secretKey: CONTEXT7_SECRET_KEY,
  expectedTools: ['resolve-library-id', 'query-docs'],
}

export const BUILTIN_MCP_PLUGINS: McpPluginDefinition[] = [CONTEXT7_DEF]

export const getMcpPluginById = (id: string): McpPluginDefinition | undefined =>
  BUILTIN_MCP_PLUGINS.find((p) => p.id === id)
