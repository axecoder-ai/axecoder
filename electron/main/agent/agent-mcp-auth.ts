import { getMcpPluginById, getMcpPluginByServerName } from '../mcp-plugins-registry'
import { connectMcpPluginOAuth } from '../mcp-oauth-connect'
import { hasMcpOAuthTokens } from '../mcp-oauth-store'
import { setPluginEnabled } from '../mcp-plugins-store'
import { findMcpServer } from './agent-mcp'
import { disconnectMcpServer } from './agent-mcp-runtime'

export type McpAuthResult =
  | { ok: true; message: string; alreadyAuthenticated?: boolean }
  | { ok: false; error: string }

const runOAuthForPlugin = async (
  pluginId: string,
  serverName: string,
): Promise<McpAuthResult> => {
  if (await hasMcpOAuthTokens(pluginId)) {
    await disconnectMcpServer(serverName)
    return {
      ok: true,
      alreadyAuthenticated: true,
      message: `MCP server "${serverName}" is already authenticated. You can retry CallMcpTool.`,
    }
  }
  const res = await connectMcpPluginOAuth(pluginId)
  if (!res.ok) return { ok: false, error: res.error }
  await setPluginEnabled(pluginId, true)
  await disconnectMcpServer(serverName)
  return {
    ok: true,
    message: `MCP server "${serverName}" OAuth completed successfully. A browser window may have opened for sign-in. You can now use CallMcpTool.`,
  }
}

/** Agent McpAuth：对接内置 OAuth 插件与已配置 server */
export const authenticateMcpServer = async (
  serverName: string,
  projectRoot?: string,
): Promise<McpAuthResult> => {
  const trimmed = serverName.trim()
  if (!trimmed) return { ok: false, error: 'server name is required' }

  const builtin = getMcpPluginByServerName(trimmed)
  if (builtin?.authMode === 'oauth') {
    return runOAuthForPlugin(builtin.id, trimmed)
  }

  const lookup = await findMcpServer(trimmed, projectRoot)
  if ('error' in lookup) return { ok: false, error: lookup.error }

  const { server } = lookup
  if (server.oauthPluginId) {
    const plugin = getMcpPluginById(server.oauthPluginId)
    if (plugin?.authMode === 'oauth') {
      return runOAuthForPlugin(plugin.id, trimmed)
    }
    return {
      ok: false,
      error: `MCP server "${trimmed}" requires OAuth but plugin "${server.oauthPluginId}" is not available.`,
    }
  }

  if (server.headers && Object.keys(server.headers).length > 0) {
    return {
      ok: true,
      message: `MCP server "${trimmed}" uses header/API-key authentication and is already configured.`,
    }
  }

  if (server.command) {
    return {
      ok: true,
      message: `MCP server "${trimmed}" uses stdio transport and does not require OAuth.`,
    }
  }

  return {
    ok: true,
    message: `MCP server "${trimmed}" is configured for direct HTTP/SSE connection without OAuth.`,
  }
}
