import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { axecoderPath, ensureAxecoderDir } from './axecoder-dir'
import {
  BUILTIN_MCP_PLUGINS,
  getMcpPluginById,
  PROJECT_PLUGINS_DEFAULT_ON,
  type McpPluginDefinition,
} from './mcp-plugins-registry'
import { hasMcpOAuthTokens } from './mcp-oauth-store'
import { getProjectSecret, setProjectSecret } from './project-secrets-store'
import { getSecret } from './secrets-store'

export { CONTEXT7_PLUGIN_ID } from './mcp-plugins-registry'

export type McpPluginState = { enabled: boolean }

export type McpPluginsFile = {
  schemaVersion: 1
  plugins: Record<string, McpPluginState>
}

const pluginsPath = () => axecoderPath('mcp-plugins.json')

const projectPluginsPath = (projectRoot: string) =>
  path.join(path.resolve(projectRoot), '.axecoder', 'mcp-plugins.json')

const readProjectMcpPluginsFile = async (projectRoot: string): Promise<McpPluginsFile> => {
  try {
    const raw = await fs.readFile(projectPluginsPath(projectRoot), 'utf-8')
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

const writeProjectMcpPluginsFile = async (projectRoot: string, file: McpPluginsFile) => {
  const dir = path.join(path.resolve(projectRoot), '.axecoder')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(projectPluginsPath(projectRoot), JSON.stringify(file, null, 2), 'utf-8')
}

export const resolvePluginSecret = async (
  secretKey: string,
  projectRoot?: string,
  projectScoped?: boolean,
): Promise<string> => {
  const root = projectRoot?.trim()
  if (projectScoped) {
    if (!root) return ''
    return (await getProjectSecret(root, secretKey)).trim()
  }
  return (await getSecret(secretKey)).trim()
}

export const setPluginSecret = async (
  secretKey: string,
  value: string,
  projectRoot?: string,
  projectScoped?: boolean,
): Promise<void> => {
  const root = projectRoot?.trim()
  if (projectScoped) {
    if (!root) throw new Error('projectRoot required for project-scoped MCP plugin')
    await setProjectSecret(root, secretKey, value)
    return
  }
  await setSecret(secretKey, value)
}

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

export const isPluginEnabled = async (id: string, projectRoot?: string): Promise<boolean> => {
  const def = getMcpPluginById(id)
  const root = projectRoot?.trim()
  if (def?.projectScoped && root) {
    try {
      const raw = await fs.readFile(projectPluginsPath(root), 'utf-8')
      const data = JSON.parse(raw) as Partial<McpPluginsFile>
      const st = data.plugins?.[id]
      if (st && typeof st.enabled === 'boolean') return st.enabled
    } catch {
      /* 无项目配置文件 — 使用内置默认 */
    }
    if (PROJECT_PLUGINS_DEFAULT_ON.has(id)) return true
  }
  const file = await readMcpPluginsFile()
  return file.plugins[id]?.enabled ?? false
}

export const setPluginEnabled = async (
  id: string,
  enabled: boolean,
  projectRoot?: string,
): Promise<void> => {
  if (!getMcpPluginById(id)) {
    throw new Error(`Unknown MCP plugin: ${id}`)
  }
  const def = getMcpPluginById(id)
  const root = projectRoot?.trim()
  if (def?.projectScoped && root) {
    const file = await readProjectMcpPluginsFile(root)
    file.plugins[id] = { enabled }
    await writeProjectMcpPluginsFile(root, file)
    return
  }
  const file = await readMcpPluginsFile()
  file.plugins[id] = { enabled }
  await writeMcpPluginsFile(file)
}

export const pluginToServerConfig = async (
  def: McpPluginDefinition,
  projectRoot?: string,
): Promise<
  | {
      name: string
      url?: string
      command?: string
      args?: string[]
      env?: Record<string, string>
      headers?: Record<string, string>
      oauthPluginId?: string
      poolKey?: string
    }
  | null
> => {
  const root = projectRoot?.trim()

  if (def.authMode === 'env' && def.command) {
    const env: Record<string, string> = {}
    for (const [envVar, secretKey] of Object.entries(def.envFromSecrets ?? {})) {
      const val = await resolvePluginSecret(secretKey, root, def.projectScoped)
      if (val) env[envVar] = val
    }
    const args = [...(def.args ?? [])]
    let poolSuffix = ''
    if (def.argsFromSecret) {
      const url = await resolvePluginSecret(def.argsFromSecret, root, def.projectScoped)
      if (url) {
        args.push(url)
        poolSuffix = `::${crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)}`
      }
    }
    const resolvedPoolKey =
      def.projectScoped && root
        ? `${path.resolve(root)}::${def.serverName}${poolSuffix}`
        : undefined
    if (!Object.keys(env).length && !args.length && !def.projectScoped) return null
    if (!Object.keys(env).length && !def.projectScoped && !def.argsFromSecret) return null
    return {
      name: def.serverName,
      command: def.command,
      args: args.length ? args : def.args,
      env: Object.keys(env).length ? env : undefined,
      poolKey: resolvedPoolKey,
    }
  }
  if (def.authMode === 'oauth') {
    if (!(await hasMcpOAuthTokens(def.id))) {
      if (def.secretKey) {
        const key = (await getSecret(def.secretKey)).trim()
        if (key && def.headerKey) {
          return {
            name: def.serverName,
            url: def.url?.replace(/\/oauth$/, '') || def.url,
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
  if (!def.secretKey || !def.headerKey || !def.url) return null
  const key = (await getSecret(def.secretKey)).trim()
  if (!key) return null
  return {
    name: def.serverName,
    url: def.url,
    headers: { [def.headerKey]: key },
  }
}
