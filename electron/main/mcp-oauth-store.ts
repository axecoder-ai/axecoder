import fs from 'node:fs/promises'
import type {
  OAuthClientInformationMixed,
  OAuthDiscoveryState,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { axecoderPath, ensureAxecoderDir } from './axecoder-dir'

export type McpOAuthSession = {
  tokens?: OAuthTokens
  clientInformation?: OAuthClientInformationMixed
  codeVerifier?: string
  discoveryState?: OAuthDiscoveryState
  redirectUrl?: string
}

export type McpOAuthFile = {
  schemaVersion: 1
  plugins: Record<string, McpOAuthSession>
}

const oauthPath = () => axecoderPath('mcp-oauth.json')

const emptyFile = (): McpOAuthFile => ({ schemaVersion: 1, plugins: {} })

export const readMcpOAuthFile = async (): Promise<McpOAuthFile> => {
  try {
    const raw = await fs.readFile(oauthPath(), 'utf-8')
    const data = JSON.parse(raw) as Partial<McpOAuthFile>
    if (data.schemaVersion !== 1 || !data.plugins || typeof data.plugins !== 'object') {
      return emptyFile()
    }
    return { schemaVersion: 1, plugins: data.plugins }
  } catch {
    return emptyFile()
  }
}

const writeMcpOAuthFile = async (file: McpOAuthFile) => {
  await ensureAxecoderDir()
  await fs.writeFile(oauthPath(), JSON.stringify(file, null, 2), 'utf-8')
  await fs.chmod(oauthPath(), 0o600)
}

export const readMcpOAuthSession = async (pluginId: string): Promise<McpOAuthSession> => {
  const file = await readMcpOAuthFile()
  return file.plugins[pluginId] ?? {}
}

export const writeMcpOAuthSession = async (pluginId: string, session: McpOAuthSession) => {
  const file = await readMcpOAuthFile()
  file.plugins[pluginId] = session
  await writeMcpOAuthFile(file)
}

export const patchMcpOAuthSession = async (
  pluginId: string,
  patch: Partial<McpOAuthSession>,
): Promise<McpOAuthSession> => {
  const file = await readMcpOAuthFile()
  const next = { ...(file.plugins[pluginId] ?? {}), ...patch }
  file.plugins[pluginId] = next
  await writeMcpOAuthFile(file)
  return next
}

export const clearMcpOAuthSession = async (pluginId: string) => {
  const file = await readMcpOAuthFile()
  delete file.plugins[pluginId]
  await writeMcpOAuthFile(file)
}

export const hasMcpOAuthTokens = async (pluginId: string): Promise<boolean> => {
  const session = await readMcpOAuthSession(pluginId)
  const t = session.tokens
  return !!(t?.access_token?.trim() || t?.refresh_token?.trim())
}
