import fs from 'node:fs/promises'
import { axecoderPath, ensureAxecoderDir } from './axecoder-dir'
import {
  BUILTIN_MCP_PLUGINS,
  getMcpPluginById,
  type McpPluginDefinition,
} from './mcp-plugins-registry'
import { hasMcpOAuthTokens } from './mcp-oauth-store'
import { getSecret } from './secrets-store'

export { CONTEXT7_PLUGIN_ID } from './mcp-plugins-registry'

export type McpPluginState = { enabled: boolean }

export type McpPluginsFile = {
  schemaVersion: 1
  plugins: Record<string, McpPluginState>
}

const pluginsPath = () => axecoderPath('mcp-plugins.json')

const defaultFile = (): McpPluginsFile => {
  const plugins: Record<string, McpPluginState> = {}
  for (const p of BUILTIN_MCP_PLUGINS) {
    plugins[p.id] = { enabled: false }
  }
  return { schemaVersion: 1, plugins }
}

export const readMcpPluginsFile = async (): Promise<McpPluginsFile> => {
  try {
    const raw = await fs.readFile(pluginsPath(), 'utf-8')
    const data = JSON.parse(raw) as Partial<McpPluginsFile>
    const base = defaultFile()
    if (data.schemaVersion !== 1 || !data.plugins || typeof data.plugins !== 'object') {
      return base
    }
    for (const def of BUILTIN_MCP_PLUGINS) {
      const st = data.plugins[def.id]
      if (st && typeof st.enabled === 'boolean') {
        base.plugins[def.id] = { enabled: st.enabled }
      }
    }
    return base
  } catch {
    return defaultFile()
  }
}

const writeMcpPluginsFile = async (file: McpPluginsFile) => {
  await ensureAxecoderDir()
  await fs.writeFile(pluginsPath(), JSON.stringify(file, null, 2), 'utf-8')
}

export const isPluginEnabled = async (id: string): Promise<boolean> => {
  const file = await readMcpPluginsFile()
  return file.plugins[id]?.enabled ?? false
}

export const setPluginEnabled = async (id: string, enabled: boolean): Promise<void> => {
  if (!getMcpPluginById(id)) {
    throw new Error(`Unknown MCP plugin: ${id}`)
  }
  const file = await readMcpPluginsFile()
  file.plugins[id] = { enabled }
  await writeMcpPluginsFile(file)
}

export const pluginToServerConfig = async (
  def: McpPluginDefinition,
): Promise<
  | { name: string; url: string; headers?: Record<string, string>; oauthPluginId?: string }
  | null
> => {
  if (def.authMode === 'oauth') {
    if (!(await hasMcpOAuthTokens(def.id))) {
      if (def.secretKey) {
        const key = (await getSecret(def.secretKey)).trim()
        if (key && def.headerKey) {
          return {
            name: def.serverName,
            url: def.url.replace(/\/oauth$/, '') || def.url,
            headers: { [def.headerKey]: key },
          }
        }
      }
      return null
    }
    return {
      name: def.serverName,
      url: def.oauthUrl ?? def.url,
      oauthPluginId: def.id,
    }
  }
  if (!def.secretKey || !def.headerKey) return null
  const key = (await getSecret(def.secretKey)).trim()
  if (!key) return null
  return {
    name: def.serverName,
    url: def.url,
    headers: { [def.headerKey]: key },
  }
}
