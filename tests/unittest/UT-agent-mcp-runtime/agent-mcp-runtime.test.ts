import { describe, expect, it } from 'vitest'
import { findMcpServer, parseMcpServersFromJson } from '../../../electron/main/agent/agent-mcp'

describe('agent-mcp-runtime', () => {
  it('parseMcpServersFromJson 解析 stdio 与 url', () => {
    const { servers } = parseMcpServersFromJson(
      JSON.stringify({
        mcpServers: {
          fs: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
            env: { FOO: 'bar' },
          },
          remote: {
            url: 'http://127.0.0.1:3000/mcp',
            headers: { Authorization: 'Bearer x' },
          },
        },
      }),
    )
    expect(servers).toHaveLength(2)
    expect(servers[0].name).toBe('fs')
    expect(servers[0].command).toBe('npx')
    expect(servers[0].env?.FOO).toBe('bar')
    expect(servers[1].url).toContain('3000')
    expect(servers[1].headers?.Authorization).toBe('Bearer x')
  })

  it('findMcpServer 无配置时返回错误', async () => {
    const prev = process.env.AXECODER_MCP_CONFIG_OVERRIDE
    process.env.AXECODER_MCP_CONFIG_OVERRIDE = '/nonexistent-mcp-test.json'
    const res = await findMcpServer('any')
    if (prev === undefined) delete process.env.AXECODER_MCP_CONFIG_OVERRIDE
    else process.env.AXECODER_MCP_CONFIG_OVERRIDE = prev
    expect('error' in res).toBe(true)
  })
})
