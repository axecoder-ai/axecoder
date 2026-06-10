import { shell } from 'electron'
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js'
import type {
  OAuthClientInformationMixed,
  OAuthDiscoveryState,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import {
  clearMcpOAuthSession,
  patchMcpOAuthSession,
  readMcpOAuthSession,
} from './mcp-oauth-store'

export class AxecoderMcpOAuthProvider implements OAuthClientProvider {
  constructor(
    private readonly pluginId: string,
    private readonly redirectUri: string,
  ) {}

  get redirectUrl(): string {
    return this.redirectUri
  }

  get clientMetadata() {
    return {
      client_name: 'AxeCoder',
      redirect_uris: [this.redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none' as const,
    }
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    return (await readMcpOAuthSession(this.pluginId)).clientInformation
  }

  async saveClientInformation(info: OAuthClientInformationMixed): Promise<void> {
    await patchMcpOAuthSession(this.pluginId, { clientInformation: info, redirectUrl: this.redirectUri })
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return (await readMcpOAuthSession(this.pluginId)).tokens
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await patchMcpOAuthSession(this.pluginId, { tokens, redirectUrl: this.redirectUri })
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await shell.openExternal(authorizationUrl.toString())
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await patchMcpOAuthSession(this.pluginId, { codeVerifier, redirectUrl: this.redirectUri })
  }

  async codeVerifier(): Promise<string> {
    const v = (await readMcpOAuthSession(this.pluginId)).codeVerifier
    if (!v) throw new Error('OAuth code verifier missing — restart Connect flow')
    return v
  }

  async invalidateCredentials(
    scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery',
  ): Promise<void> {
    if (scope === 'all') {
      await clearMcpOAuthSession(this.pluginId)
      return
    }
    const session = await readMcpOAuthSession(this.pluginId)
    if (scope === 'client') {
      delete session.clientInformation
    } else if (scope === 'tokens') {
      delete session.tokens
    } else if (scope === 'verifier') {
      delete session.codeVerifier
    } else if (scope === 'discovery') {
      delete session.discoveryState
    }
    await patchMcpOAuthSession(this.pluginId, session)
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await patchMcpOAuthSession(this.pluginId, { discoveryState: state, redirectUrl: this.redirectUri })
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return (await readMcpOAuthSession(this.pluginId)).discoveryState
  }
}

export const createMcpOAuthProvider = (pluginId: string, redirectUri: string) =>
  new AxecoderMcpOAuthProvider(pluginId, redirectUri)

/** 已连接会话复用：redirectUri 从持久化读取，仅用于 token refresh */
export const createMcpOAuthProviderFromSession = async (pluginId: string) => {
  const session = await readMcpOAuthSession(pluginId)
  const redirectUri = session.redirectUrl ?? 'http://127.0.0.1/callback'
  return new AxecoderMcpOAuthProvider(pluginId, redirectUri)
}
