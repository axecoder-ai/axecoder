import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadMcpConfig, parseMcpServersFromJson } from '../../../electron/main/agent/agent-mcp'

describe('agent-mcp merge', () => {
  const prev = process.env.AXECODER_MCP_CONFIG_OVERRIDE
  afterEach(() => {
    if (prev === undefined) delete process.env.AXECODER_MCP_CONFIG_OVERRIDE
    else process.env.AXECODER_MCP_CONFIG_OVERRIDE = prev
  })

  it('parseMcpServersFromJson 解析 stdio 与 url', () => {
    const { servers } = parseMcpServersFromJson(
      JSON.stringify({
        mcpServers: {
          fs: { command: 'npx', args: ['-y', 'srv'] },
          remote: { url: 'http://127.0.0.1:3000/mcp' },
        },
      }),
    )
    expect(servers).toHaveLength(2)
    expect(servers[0].name).toBe('fs')
    expect(servers[1].url).toContain('3000')
  })

  it('项目 .mcp.json 覆盖同名全局 server', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mcp-'))
    const project = path.join(tmp, 'proj')
    await fs.mkdir(project, { recursive: true })
    await fs.writeFile(
      path.join(project, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          shared: { url: 'http://project-override/mcp' },
          localOnly: { command: 'echo' },
        },
      }),
    )
    delete process.env.AXECODER_MCP_CONFIG_OVERRIDE
    const fakeHome = path.join(tmp, 'home')
    await fs.mkdir(path.join(fakeHome, '.cursor'), { recursive: true })
    await fs.writeFile(
      path.join(fakeHome, '.cursor', 'mcp.json'),
      JSON.stringify({
        mcpServers: {
          shared: { url: 'http://global/mcp' },
        },
      }),
    )
    const oldHome = process.env.HOME
    process.env.HOME = fakeHome
    try {
      const { servers } = await loadMcpConfig(project)
      const shared = servers.find((s) => s.name === 'shared')
      const localOnly = servers.find((s) => s.name === 'localOnly')
      expect(shared?.url).toBe('http://project-override/mcp')
      expect(localOnly?.command).toBe('echo')
    } finally {
      process.env.HOME = oldHome
    }
  })
})
