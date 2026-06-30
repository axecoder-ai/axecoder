export type McpPluginAuthMode = 'oauth' | 'api_key' | 'env'

export type McpPluginDefinition = {
  id: string
  serverName: string
  displayName: string
  description: string
  docUrl: string
  /** MCP 连接 URL（OAuth 插件为 /mcp/oauth） */
  url?: string
  oauthUrl?: string
  authMode: McpPluginAuthMode
  headerKey?: string
  secretKey?: string
  /** stdio 传输（如 mongodb-mcp-server） */
  command?: string
  args?: string[]
  /** env 变量名 → secrets.json 键 */
  envFromSecrets?: Record<string, string>
  /** 若 secret 有值，追加到 args 末尾（如 mysql://...） */
  argsFromSecret?: string
  /** 凭证与开关按项目隔离（存 <project>/.axecoder/） */
  projectScoped?: boolean
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

export const MONGODB_PLUGIN_ID = 'mongodb'
export const MONGODB_SECRET_KEY = 'mcp:mongodb:connection_string'

const MONGODB_DEF: McpPluginDefinition = {
  id: MONGODB_PLUGIN_ID,
  serverName: 'mongodb',
  displayName: 'MongoDB',
  description: 'Query and manage MongoDB databases and Atlas clusters via MCP.',
  docUrl: 'https://www.mongodb.com/docs/mcp-server/get-started/',
  authMode: 'env',
  command: 'npx',
  args: ['-y', 'mongodb-mcp-server@latest'],
  secretKey: MONGODB_SECRET_KEY,
  envFromSecrets: {
    MDB_MCP_CONNECTION_STRING: MONGODB_SECRET_KEY,
  },
  projectScoped: true,
  expectedTools: ['find', 'list-databases'],
}

export const MYSQL_PLUGIN_ID = 'mysql'
export const MYSQL_SECRET_KEY = 'mcp:mysql:connection_string'

const MYSQL_DEF: McpPluginDefinition = {
  id: MYSQL_PLUGIN_ID,
  serverName: 'mysql',
  displayName: 'MySQL',
  description: 'Query MySQL and MariaDB databases via MCP.',
  docUrl: 'https://www.npmjs.com/package/@imrieul/mysql-mcp-server',
  authMode: 'env',
  command: 'npx',
  args: ['-y', '@imrieul/mysql-mcp-server'],
  secretKey: MYSQL_SECRET_KEY,
  argsFromSecret: MYSQL_SECRET_KEY,
  projectScoped: true,
  expectedTools: ['query', 'describe_all_tables'],
}

/** 打开项目后默认启用的按项目 MCP 插件（无需 Settings 开关） */
export const PROJECT_PLUGINS_DEFAULT_ON = new Set([MONGODB_PLUGIN_ID, MYSQL_PLUGIN_ID])

export const BUILTIN_MCP_PLUGINS: McpPluginDefinition[] = [CONTEXT7_DEF, MONGODB_DEF, MYSQL_DEF]

export const getMcpPluginById = (id: string): McpPluginDefinition | undefined =>
  BUILTIN_MCP_PLUGINS.find((p) => p.id === id)

export const getMcpPluginByServerName = (serverName: string): McpPluginDefinition | undefined =>
  BUILTIN_MCP_PLUGINS.find((p) => p.serverName === serverName)
