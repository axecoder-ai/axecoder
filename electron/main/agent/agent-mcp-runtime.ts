import { Client } from '@modelcontextprotocol/sdk/client'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport'
import type { McpServerConfig } from './agent-mcp'

const CLIENT_INFO = { name: 'axecoder', version: '0.1.0' }
const CONNECT_TIMEOUT_MS = 30_000

type Pooled = {
  client: Client
  transport: Transport
  toolNames: string[]
  serverInstructions?: string
}

const pool = new Map<string, Pooled>()

const withTimeout = async <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const buildTransport = (cfg: McpServerConfig): Transport => {
  if (cfg.url) {
    const url = new URL(cfg.url)
    const headers = cfg.headers ?? {}
    const requestInit: RequestInit = Object.keys(headers).length
      ? { headers: { ...headers } }
      : {}
    if (url.pathname.toLowerCase().includes('sse')) {
      return new SSEClientTransport(url, { requestInit })
    }
    return new StreamableHTTPClientTransport(url, { requestInit })
  }
  if (!cfg.command) {
    throw new Error(`MCP server "${cfg.name}" has no command or url`)
  }
  return new StdioClientTransport({
    command: cfg.command,
    args: cfg.args,
    env: { ...getDefaultEnvironment(), ...(cfg.env ?? {}) },
    cwd: cfg.cwd,
    stderr: 'pipe',
  })
}

const formatToolContent = (result: {
  isError?: boolean
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
  structuredContent?: unknown
}): string => {
  const lines: string[] = []
  if (result.structuredContent !== undefined) {
    lines.push(JSON.stringify(result.structuredContent, null, 2))
  }
  for (const block of result.content ?? []) {
    if (block.type === 'text' && block.text) lines.push(block.text)
    else if (block.type === 'image' && block.data) {
      lines.push(`[image ${block.mimeType ?? 'image'}]`)
    } else lines.push(JSON.stringify(block))
  }
  const body = lines.join('\n').trim() || '(empty tool result)'
  return result.isError ? `Error: ${body}` : body
}

const formatResourceContents = (
  contents: Array<{ uri: string; text?: string; blob?: string; mimeType?: string }>,
): string => {
  const parts: string[] = []
  for (const c of contents) {
    if (c.text !== undefined) parts.push(c.text)
    else if (c.blob) parts.push(`[resource ${c.uri} blob]`)
    else parts.push(JSON.stringify(c))
  }
  return parts.join('\n\n') || '(empty resource)'
}

export const disconnectMcpServer = async (serverName: string): Promise<void> => {
  const entry = pool.get(serverName)
  if (!entry) return
  pool.delete(serverName)
  try {
    await entry.transport.close()
  } catch {
    // ignore
  }
}

export const disconnectAllMcpServers = async (): Promise<void> => {
  for (const n of [...pool.keys()]) await disconnectMcpServer(n)
}

export const getMcpClient = async (
  cfg: McpServerConfig,
): Promise<{ ok: true; pooled: Pooled } | { ok: false; error: string }> => {
  const cached = pool.get(cfg.name)
  if (cached) return { ok: true, pooled: cached }

  let transport: Transport
  try {
    transport = buildTransport(cfg)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  const client = new Client(CLIENT_INFO)
  try {
    await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, `MCP connect ${cfg.name}`)
    const toolsRes = await withTimeout(client.listTools(), CONNECT_TIMEOUT_MS, `MCP listTools ${cfg.name}`)
    const pooled: Pooled = {
      client,
      transport,
      toolNames: (toolsRes.tools ?? []).map((t) => t.name),
      serverInstructions: client.getInstructions(),
    }
    pool.set(cfg.name, pooled)
    return { ok: true, pooled }
  } catch (e) {
    try {
      await transport.close()
    } catch {
      // ignore
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const callMcpToolLive = async (
  cfg: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const conn = await getMcpClient(cfg)
  if (!conn.ok) return conn
  try {
    const result = await withTimeout(
      conn.pooled.client.callTool({ name: toolName, arguments: args }),
      CONNECT_TIMEOUT_MS,
      `MCP callTool ${cfg.name}/${toolName}`,
    )
    const text = formatToolContent(result)
    if (result.isError) return { ok: false, error: text }
    return { ok: true, text }
  } catch (e) {
    await disconnectMcpServer(cfg.name)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const listMcpResourcesLive = async (
  servers: McpServerConfig[],
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  if (!servers.length) {
    return { ok: false, error: 'No MCP servers configured' }
  }
  const blocks: string[] = []
  for (const cfg of servers) {
    const conn = await getMcpClient(cfg)
    if (!conn.ok) {
      blocks.push(`## ${cfg.name}\n(connection failed: ${conn.error})`)
      continue
    }
    try {
      const res = await withTimeout(
        conn.pooled.client.listResources(),
        CONNECT_TIMEOUT_MS,
        `MCP listResources ${cfg.name}`,
      )
      const items = res.resources ?? []
      if (!items.length) {
        blocks.push(`## ${cfg.name}\n(no resources)`)
        continue
      }
      const lines = items.map((r) => `- ${r.uri}${r.name ? ` (${r.name})` : ''}`)
      blocks.push(`## ${cfg.name}\n${lines.join('\n')}`)
    } catch (e) {
      blocks.push(`## ${cfg.name}\n(error: ${e instanceof Error ? e.message : String(e)})`)
    }
  }
  return { ok: true, text: blocks.join('\n\n') }
}

export const readMcpResourceLive = async (
  cfg: McpServerConfig,
  uri: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const conn = await getMcpClient(cfg)
  if (!conn.ok) return conn
  try {
    const res = await withTimeout(
      conn.pooled.client.readResource({ uri }),
      CONNECT_TIMEOUT_MS,
      `MCP readResource ${cfg.name}`,
    )
    return { ok: true, text: formatResourceContents(res.contents ?? []) }
  } catch (e) {
    await disconnectMcpServer(cfg.name)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const describeMcpServerForPrompt = async (
  cfg: McpServerConfig,
): Promise<string> => {
  const kind = cfg.url ? `url=${cfg.url}` : `stdio ${cfg.command ?? ''} ${(cfg.args ?? []).join(' ')}`.trim()
  const conn = await getMcpClient(cfg)
  if (!conn.ok) {
    return `- **${cfg.name}** (${kind}): _unavailable — ${conn.error}_`
  }
  const toolNames = conn.pooled.toolNames ?? []
  const tools =
    toolNames.length > 0 ? toolNames.join(', ') : '(no tools advertised)'
  const instr = conn.pooled.serverInstructions?.trim()
  let line = `- **${cfg.name}** (${kind}): tools: ${tools}`
  if (instr) line += `\n  Instructions: ${instr}`
  return line
}
