import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { axecoderPath } from '../axecoder-dir'
import {
  callMcpToolLive,
  describeMcpServerForPrompt,
  listMcpResourcesLive,
  readMcpResourceLive,
} from './agent-mcp-runtime'

export type McpServerConfig = {
  name: string
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  cwd?: string
}

/** 从低优先级到高优先级；同名 server 后者覆盖前者 */
export const mcpConfigPaths = (projectRoot?: string): string[] => {
  const paths = [
    path.join(os.homedir(), '.cursor', 'mcp.json'),
    axecoderPath('mcp.json'),
    path.join(os.homedir(), '.config', 'axecoder', 'mcp.json'),
  ]
  const root = projectRoot?.trim()
  if (root) paths.push(path.join(path.resolve(root), '.mcp.json'))
  return paths
}

const parseEnv = (raw: unknown): Record<string, string> | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

const parseHeaders = (raw: unknown): Record<string, string> | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

/** 供单测：从 JSON 解析 mcpServers */
export const parseMcpServersFromJson = (
  raw: string,
): { servers: McpServerConfig[]; configPath?: string } => {
  const data = JSON.parse(raw) as { mcpServers?: Record<string, Record<string, unknown>> }
  const servers: McpServerConfig[] = []
  for (const [name, cfg] of Object.entries(data.mcpServers ?? {})) {
    servers.push({
      name,
      command: typeof cfg.command === 'string' ? cfg.command : undefined,
      args: Array.isArray(cfg.args) ? cfg.args.map(String) : undefined,
      url: typeof cfg.url === 'string' ? cfg.url : undefined,
      env: parseEnv(cfg.env),
      headers: parseHeaders(cfg.headers),
      cwd: typeof cfg.cwd === 'string' ? cfg.cwd : undefined,
    })
  }
  return { servers }
}

const mergeMcpServers = (layers: McpServerConfig[][]): McpServerConfig[] => {
  const byName = new Map<string, McpServerConfig>()
  for (const layer of layers) {
    for (const s of layer) byName.set(s.name, s)
  }
  return [...byName.values()]
}

export const loadMcpConfig = async (
  projectRoot?: string,
): Promise<{
  servers: McpServerConfig[]
  configPath?: string
  error?: string
}> => {
  const override = process.env.AXECODER_MCP_CONFIG_OVERRIDE?.trim()
  if (override) {
    try {
      const raw = await fs.readFile(override, 'utf-8')
      const { servers } = parseMcpServersFromJson(raw)
      return { servers, configPath: override }
    } catch {
      return { servers: [], error: `MCP config not found: ${override}` }
    }
  }

  const layers: McpServerConfig[][] = []
  const loadedPaths: string[] = []
  for (const p of mcpConfigPaths(projectRoot)) {
    try {
      const raw = await fs.readFile(p, 'utf-8')
      const { servers } = parseMcpServersFromJson(raw)
      if (servers.length) {
        layers.push(servers)
        loadedPaths.push(p)
      }
    } catch {
      /* try next */
    }
  }
  const servers = mergeMcpServers(layers)
  if (!servers.length) {
    return {
      servers: [],
      error:
        'No MCP config found. Add project-root `.mcp.json` or `~/.cursor/mcp.json` with mcpServers.',
    }
  }
  return { servers, configPath: loadedPaths.join(', ') }
}

export const findMcpServer = async (
  serverName: string,
  projectRoot?: string,
): Promise<{ server: McpServerConfig } | { error: string }> => {
  const { servers, error } = await loadMcpConfig(projectRoot)
  const found = servers.find((s) => s.name === serverName)
  if (!found) {
    return { error: error ?? `MCP server "${serverName}" not found in config` }
  }
  return { server: found }
}

export const listMcpResources = (projectRoot?: string) =>
  loadMcpConfig(projectRoot).then(({ servers, error }) => {
    if (!servers.length) {
      return { ok: false as const, error: error ?? 'No MCP servers configured' }
    }
    return listMcpResourcesLive(servers)
  })

export const callMcpTool = async (
  server: string,
  toolName: string,
  args: Record<string, unknown>,
  projectRoot?: string,
) => {
  const lookup = await findMcpServer(server, projectRoot)
  if ('error' in lookup) return { ok: false as const, error: lookup.error }
  return callMcpToolLive(lookup.server, toolName, args)
}

export const readMcpResource = async (server: string, uri: string, projectRoot?: string) => {
  const lookup = await findMcpServer(server, projectRoot)
  if ('error' in lookup) return { ok: false as const, error: lookup.error }
  return readMcpResourceLive(lookup.server, uri)
}

export const buildMcpPromptLines = async (projectRoot?: string): Promise<string[]> => {
  const { servers, error } = await loadMcpConfig(projectRoot)
  if (!servers.length) {
    return error ? [`_No servers — ${error}_`] : []
  }
  const lines: string[] = []
  for (const s of servers) {
    lines.push(await describeMcpServerForPrompt(s))
  }
  return lines
}
