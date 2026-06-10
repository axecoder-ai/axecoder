import { describe, expect, it } from 'vitest'
import {
  discoverSlashCommands,
  runSlashCommandForAgent,
} from '../../../electron/main/agent/agent-slash-commands'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'

describe('agent-slash-commands', () => {
  it('discoverSlashCommands 含内置 workflow 与 UI 命令', async () => {
    const commands = await discoverSlashCommands(process.cwd())
    const names = commands.map((c) => c.name)
    expect(names).toContain('research-codebase')
    expect(names).toContain('rppit')
    expect(names).toContain('compact')
    expect(names).toContain('help')
  })

  it('runSlashCommandForAgent 可加载内置 playbook', async () => {
    const res = await runSlashCommandForAgent(process.cwd(), 'research-codebase', 'auth module')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.kind).toBe('playbook')
    expect(res.text).toContain('User notes')
    expect(res.text).toContain('auth module')
  })

  it('runSlashCommandForAgent 未知命令报错', async () => {
    const res = await runSlashCommandForAgent(process.cwd(), 'not-a-real-cmd', '')
    expect(res.ok).toBe(false)
  })

  it('DiscoverCommands / SlashCommand 工具可调用', async () => {
    const ctx = { projectRoot: process.cwd(), readCache: new Set(), sessionId: 'slash-cmd-test' }
    const list = await executeExtendedAgentTool(ctx, {
      id: 'dc1',
      name: 'DiscoverCommands',
      arguments: {},
    })
    expect(list?.log.ok).toBe(true)
    expect(list?.content).toContain('research-codebase')

    const run = await executeExtendedAgentTool(ctx, {
      id: 'sc1',
      name: 'SlashCommand',
      arguments: { command: 'plan', args: '' },
    })
    expect(run?.log.ok).toBe(true)
    expect(run?.content).toContain('UI-only')
  })
})
