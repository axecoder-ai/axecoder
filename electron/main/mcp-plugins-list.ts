import { getMcpJsonServerNames } from './agent/agent-mcp'
import { BUILTIN_MCP_PLUGINS, type McpPluginDefinition } from './mcp-plugins-registry'
import { isPluginEnabled, resolvePluginSecret } from './mcp-plugins-store'
import { hasMcpOAuthTokens } from './mcp-oauth-store'
import { getSecret } from './secrets-store'

export type McpPluginView = {
  id: string
  displayName: string
  description: string
  docUrl: string
  enabled: boolean
  authMode: 'oauth' | 'api_key' | 'env'
  connected: boolean
  hasApiKey: boolean
  managedBy: 'plugin' | 'mcp.json'
  projectScoped?: boolean
}

export const isPluginAuthenticated = async (
  def: McpPluginDefinition,
  projectRoot?: string,
): Promise<boolean> => {
  if (def.authMode === 'oauth') {
    if (await hasMcpOAuthTokens(def.id)) return true
    if (def.secretKey) return !!(await getSecret(def.secretKey)).trim()
    return false
  }
  if (def.authMode === 'env') {
    for (const secretKey of Object.values(def.envFromSecrets ?? {})) {
      if (await resolvePluginSecret(secretKey, projectRoot, def.projectScoped)) return true
    }
    if (def.argsFromSecret) {
      return !!(await resolvePluginSecret(def.argsFromSecret, projectRoot, def.projectScoped))
    }
    return false
  }
  if (!def.secretKey) return false
  return !!(await getSecret(def.secretKey)).trim()
}

const pluginHasCredential = async (
  def: McpPluginDefinition,
  projectRoot?: string,
): Promise<boolean> => {
  if (def.authMode === 'env') {
    for (const secretKey of Object.values(def.envFromSecrets ?? {})) {
      if (await resolvePluginSecret(secretKey, projectRoot, def.projectScoped)) return true
    }
    if (def.argsFromSecret) {
      return !!(await resolvePluginSecret(def.argsFromSecret, projectRoot, def.projectScoped))
    }
    return false
  }
  if (!def.secretKey) return false
  return !!(await getSecret(def.secretKey)).trim()
}

export const listMcpPluginViews = async (projectRoot?: string): Promise<McpPluginView[]> => {
  const jsonNames = await getMcpJsonServerNames(projectRoot)
  const views: McpPluginView[] = []
  for (const def of BUILTIN_MCP_PLUGINS) {
    const connected = await isPluginAuthenticated(def, projectRoot)
    const hasKey = await pluginHasCredential(def, projectRoot)
    const managedBy = jsonNames.has(def.serverName) ? 'mcp.json' : 'plugin'
    const pluginEnabled = await isPluginEnabled(def.id, projectRoot)
    views.push({
      id: def.id,
      displayName: def.displayName,
      description: def.description,
      docUrl: def.docUrl,
      enabled: managedBy === 'mcp.json' ? true : pluginEnabled,
      authMode: def.authMode,
      connected,
      hasApiKey: hasKey,
      managedBy,
      projectScoped: def.projectScoped,
    })
  }
  return views
}
