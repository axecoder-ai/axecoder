import { loadMcpConfig } from './agent-mcp'

type McpCliGuard = {
  serverName: string
  pattern: RegExp
  cliLabel: string
  hint: string
}

const MONGO_CLI_RE = /\b(mongosh|mongo\b|brew\s+install\s+(-?[\w.]*\s+)*mongosh)\b/i
const MYSQL_CLI_RE =
  /\b(mysql\b|mysqladmin|mysqldump|brew\s+install\s+(-?[\w.]*\s+)*mysql)\b/i

const MCP_CLI_GUARDS: McpCliGuard[] = [
  {
    serverName: 'mongodb',
    pattern: MONGO_CLI_RE,
    cliLabel: 'mongosh/mongo',
    hint: 'Use CallMcpTool with server "mongodb". Read the connection string from project config and use the connect tool if not preconfigured.',
  },
  {
    serverName: 'mysql',
    pattern: MYSQL_CLI_RE,
    cliLabel: 'mysql',
    hint:
      'Use CallMcpTool with server "mysql". Read credentials from project config (.env, conf.ini, etc.), save mysql:// URL to project .axecoder/secrets.json as mcp:mysql:connection_string if needed, then query via MCP.',
  },
]

export const isMongoCliCommand = (command: string): boolean => MONGO_CLI_RE.test(command)

export const isMysqlCliCommand = (command: string): boolean => MYSQL_CLI_RE.test(command)

export const rejectMcpDuplicateCli = async (
  projectRoot: string,
  command: string,
): Promise<string | null> => {
  const { servers } = await loadMcpConfig(projectRoot)
  const names = new Set(servers.map((s) => s.name))
  for (const guard of MCP_CLI_GUARDS) {
    if (!names.has(guard.serverName) || !guard.pattern.test(command)) continue
    return (
      `Rejected: ${guard.serverName} MCP is available for this project. ` +
      `Use CallMcpTool instead of ${guard.cliLabel} CLI. ${guard.hint}`
    )
  }
  return null
}
