import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  loadMcpConfig,
  materializeEnabledPlugins,
  getMcpJsonServerNames,
} from '../../../electron/main/agent/agent-mcp'
import { setPluginEnabled, CONTEXT7_PLUGIN_ID } from '../../../electron/main/mcp-plugins-store'
import { writeSecrets } from '../../../electron/main/secrets-store'
import { CONTEXT7_SECRET_KEY } from '../../../electron/main/mcp-plugins-registry'
import { patchMcpOAuthSession } from '../../../electron/main/mcp-oauth-store'

let tmpDir = ''
let oldHome: string | undefined

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mcp-merge-'))
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

describe('materializeEnabledPlugins', () => {
  it('OAuth 已连接时注入 context7（oauth URL）', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
      redirectUrl: 'http://127.0.0.1:8765/callback',
    })
    const servers = await materializeEnabledPlugins(new Set())
    expect(servers).toHaveLength(1)
    expect(servers[0].name).toBe('context7')
    expect(servers[0].url).toBe('https://mcp.context7.com/mcp/oauth')
    expect(servers[0].oauthPluginId).toBe('context7')
  })

  it('API Key 回退路径仍可用', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    await writeSecrets({ [CONTEXT7_SECRET_KEY]: 'ctx7sk-test' })
    const servers = await materializeEnabledPlugins(new Set())
    expect(servers).toHaveLength(1)
    expect(servers[0].headers?.CONTEXT7_API_KEY).toBe('ctx7sk-test')
    expect(servers[0].url).toBe('https://mcp.context7.com/mcp')
  })

  it('disabled 时不注入', async () => {
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
    })
    const servers = await materializeEnabledPlugins(new Set())
    expect(servers).toHaveLength(0)
  })

  it('未连接 OAuth 且无 Key 时不注入', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    const servers = await materializeEnabledPlugins(new Set())
    expect(servers).toHaveLength(0)
  })

  it('mcp.json 已有 context7 时 skip', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
    })
    const servers = await materializeEnabledPlugins(new Set(['context7']))
    expect(servers).toHaveLength(0)
  })
})

describe('loadMcpConfig 合并插件层', () => {
  it('OAuth 已连接且 enabled 时返回 context7', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
    })
    const { servers, error } = await loadMcpConfig()
    expect(error).toBeUndefined()
    expect(servers.find((s) => s.name === 'context7')?.oauthPluginId).toBe('context7')
  })

  it('getMcpJsonServerNames 不含插件层', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'mcp.json'),
      JSON.stringify({ mcpServers: { custom: { url: 'http://local/mcp' } } }),
    )
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'tok', token_type: 'Bearer' },
    })
    const names = await getMcpJsonServerNames()
    expect(names.has('custom')).toBe(true)
    expect(names.has('context7')).toBe(false)
    const { servers } = await loadMcpConfig()
    expect(servers.some((s) => s.name === 'custom')).toBe(true)
    expect(servers.some((s) => s.name === 'context7')).toBe(true)
  })
})
