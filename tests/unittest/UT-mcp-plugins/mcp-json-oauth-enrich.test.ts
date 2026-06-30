import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  enrichBuiltinOAuthServers,
  loadMcpConfig,
} from '../../../electron/main/agent/agent-mcp'
import { CONTEXT7_PLUGIN_ID, CONTEXT7_SECRET_KEY } from '../../../electron/main/mcp-plugins-registry'
import { patchMcpOAuthSession } from '../../../electron/main/mcp-oauth-store'
import { writeSecrets } from '../../../electron/main/secrets-store'

let tmpDir = ''
let oldHome: string | undefined

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mcp-enrich-'))
  setAxecoderDirForTests(tmpDir)
  oldHome = process.env.HOME
  process.env.HOME = path.join(tmpDir, 'home')
  await fs.mkdir(path.join(process.env.HOME, '.cursor'), { recursive: true })
  delete process.env.AXECODER_MCP_CONFIG_OVERRIDE
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  if (oldHome === undefined) delete process.env.HOME
  else process.env.HOME = oldHome
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('enrichBuiltinOAuthServers', () => {
  it('空配置 context7 注入 oauthPluginId 与 oauth URL', async () => {
    const [out] = await enrichBuiltinOAuthServers([{ name: 'context7' }])
    expect(out.oauthPluginId).toBe(CONTEXT7_PLUGIN_ID)
    expect(out.url).toBe('https://mcp.context7.com/mcp/oauth')
  })

  it('有 OAuth token 时注入 oauthPluginId', async () => {
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
    })
    const [out] = await enrichBuiltinOAuthServers([
      { name: 'context7', url: 'https://custom.example/mcp' },
    ])
    expect(out.oauthPluginId).toBe(CONTEXT7_PLUGIN_ID)
    expect(out.url).toBe('https://mcp.context7.com/mcp/oauth')
  })

  it('secrets API Key 回退为非 oauth URL + header', async () => {
    await writeSecrets({ [CONTEXT7_SECRET_KEY]: 'ctx7sk-test' })
    const [out] = await enrichBuiltinOAuthServers([{ name: 'context7' }])
    expect(out.oauthPluginId).toBeUndefined()
    expect(out.url).toBe('https://mcp.context7.com/mcp')
    expect(out.headers?.CONTEXT7_API_KEY).toBe('ctx7sk-test')
  })

  it('已有 headers 时不富化 OAuth', async () => {
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
    })
    const [out] = await enrichBuiltinOAuthServers([
      {
        name: 'context7',
        url: 'https://example.com/mcp',
        headers: { CONTEXT7_API_KEY: 'manual-key' },
      },
    ])
    expect(out.oauthPluginId).toBeUndefined()
    expect(out.url).toBe('https://example.com/mcp')
    expect(out.headers?.CONTEXT7_API_KEY).toBe('manual-key')
  })

  it('非内置 server 原样返回', async () => {
    const input = { name: 'custom', url: 'http://local/mcp' }
    const [out] = await enrichBuiltinOAuthServers([input])
    expect(out).toEqual(input)
  })
})

describe('loadMcpConfig mcp.json 内置 OAuth 富化', () => {
  it('mcp.json 仅 context7 时 loadMcpConfig 带 oauthPluginId', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'mcp.json'),
      JSON.stringify({ mcpServers: { context7: {} } }),
    )
    const { servers } = await loadMcpConfig()
    const c7 = servers.find((s) => s.name === 'context7')
    expect(c7?.oauthPluginId).toBe(CONTEXT7_PLUGIN_ID)
    expect(c7?.url).toBe('https://mcp.context7.com/mcp/oauth')
  })
})
