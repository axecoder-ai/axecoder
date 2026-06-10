import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../electron/main/mcp-oauth-connect', () => ({
  connectMcpPluginOAuth: vi.fn(),
}))

vi.mock('../../../electron/main/mcp-oauth-store', () => ({
  hasMcpOAuthTokens: vi.fn(),
}))

vi.mock('../../../electron/main/mcp-plugins-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../electron/main/mcp-plugins-store')>()
  return { ...actual, setPluginEnabled: vi.fn() }
})

vi.mock('../../../electron/main/agent/agent-mcp-runtime', () => ({
  disconnectMcpServer: vi.fn(),
}))

import { connectMcpPluginOAuth } from '../../../electron/main/mcp-oauth-connect'
import { hasMcpOAuthTokens } from '../../../electron/main/mcp-oauth-store'
import { setPluginEnabled } from '../../../electron/main/mcp-plugins-store'
import { disconnectMcpServer } from '../../../electron/main/agent/agent-mcp-runtime'
import { authenticateMcpServer } from '../../../electron/main/agent/agent-mcp-auth'
import { CONTEXT7_PLUGIN_ID } from '../../../electron/main/mcp-plugins-registry'

let tmpDir = ''
let overridePath = ''

beforeEach(async () => {
  vi.mocked(connectMcpPluginOAuth).mockReset()
  vi.mocked(hasMcpOAuthTokens).mockReset()
  vi.mocked(setPluginEnabled).mockReset()
  vi.mocked(disconnectMcpServer).mockReset()
  vi.mocked(hasMcpOAuthTokens).mockResolvedValue(false)
  vi.mocked(connectMcpPluginOAuth).mockResolvedValue({ ok: true })
  vi.mocked(setPluginEnabled).mockResolvedValue(undefined)
  vi.mocked(disconnectMcpServer).mockResolvedValue(undefined)

  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mcp-auth-'))
  overridePath = path.join(tmpDir, 'mcp.json')
  process.env.AXECODER_MCP_CONFIG_OVERRIDE = overridePath
})

afterEach(async () => {
  delete process.env.AXECODER_MCP_CONFIG_OVERRIDE
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('authenticateMcpServer', () => {
  it('内置 OAuth 插件触发 connect 并启用', async () => {
    const res = await authenticateMcpServer('context7')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.message).toContain('OAuth completed')
    expect(connectMcpPluginOAuth).toHaveBeenCalledWith(CONTEXT7_PLUGIN_ID)
    expect(setPluginEnabled).toHaveBeenCalledWith(CONTEXT7_PLUGIN_ID, true)
    expect(disconnectMcpServer).toHaveBeenCalledWith('context7')
  })

  it('已有 OAuth token 时跳过浏览器授权', async () => {
    vi.mocked(hasMcpOAuthTokens).mockResolvedValue(true)
    const res = await authenticateMcpServer('context7')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.alreadyAuthenticated).toBe(true)
    expect(connectMcpPluginOAuth).not.toHaveBeenCalled()
    expect(disconnectMcpServer).toHaveBeenCalledWith('context7')
  })

  it('OAuth 失败返回错误', async () => {
    vi.mocked(connectMcpPluginOAuth).mockResolvedValue({ ok: false, error: 'user denied' })
    const res = await authenticateMcpServer('context7')
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('user denied')
  })

  it('stdio server 无需 OAuth', async () => {
    await fs.writeFile(
      overridePath,
      JSON.stringify({
        mcpServers: {
          fs: { command: 'npx', args: ['-y', 'mcp-server'] },
        },
      }),
      'utf-8',
    )
    const res = await authenticateMcpServer('fs')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.message).toContain('stdio')
    expect(connectMcpPluginOAuth).not.toHaveBeenCalled()
  })

  it('带 headers 的 server 视为已配置', async () => {
    await fs.writeFile(
      overridePath,
      JSON.stringify({
        mcpServers: {
          remote: { url: 'https://example.com/mcp', headers: { Authorization: 'Bearer x' } },
        },
      }),
      'utf-8',
    )
    const res = await authenticateMcpServer('remote')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.message).toContain('header')
  })

  it('未知 server 返回错误', async () => {
    await fs.writeFile(overridePath, JSON.stringify({ mcpServers: {} }), 'utf-8')
    const res = await authenticateMcpServer('missing')
    expect(res.ok).toBe(false)
  })
})
