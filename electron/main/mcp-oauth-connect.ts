import { auth } from '@modelcontextprotocol/sdk/client/auth.js'
import { getMcpPluginById } from './mcp-plugins-registry'
import { createMcpOAuthProvider } from './mcp-oauth-provider'
import { listenOAuthCallback, pickOAuthCallbackPort } from './mcp-oauth-callback'
import { hasMcpOAuthTokens } from './mcp-oauth-store'

export const connectMcpPluginOAuth = async (
  pluginId: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const def = getMcpPluginById(pluginId)
  if (!def) return { ok: false, error: `Unknown MCP plugin: ${pluginId}` }
  if (def.authMode !== 'oauth') {
    return { ok: false, error: 'This plugin does not use OAuth' }
  }

  const serverUrl = def.oauthUrl ?? def.url

  if (await hasMcpOAuthTokens(pluginId)) {
    try {
      const provider = createMcpOAuthProvider(pluginId, 'http://127.0.0.1/callback')
      const result = await auth(provider, { serverUrl })
      if (result === 'AUTHORIZED') return { ok: true }
    } catch {
      /* fall through to full connect */
    }
  }

  try {
    const port = await pickOAuthCallbackPort()
    const redirectUri = `http://127.0.0.1:${port}/callback`
    const provider = createMcpOAuthProvider(pluginId, redirectUri)
    const { wait } = listenOAuthCallback(port)

    const phase = await auth(provider, { serverUrl })
    if (phase === 'AUTHORIZED') return { ok: true }
    if (phase !== 'REDIRECT') {
      return { ok: false, error: `Unexpected OAuth phase: ${phase}` }
    }

    const { code } = await wait
    const final = await auth(provider, { serverUrl, authorizationCode: code })
    if (final !== 'AUTHORIZED') {
      return { ok: false, error: `OAuth failed after callback: ${final}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
