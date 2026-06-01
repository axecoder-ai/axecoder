import { describe, expect, it } from 'vitest'
import { allSlashCommands, findCommand } from '../../../src/slash-commands/registry'

describe('findCommand', () => {
  it('registry 已注册内置命令', () => {
    const names = allSlashCommands().map((c) => c.name)
    expect(names).toContain('help')
    expect(names).toContain('clear')
    expect(names).toContain('compact')
    expect(names).toContain('hooks')
    expect(names).toContain('mcp')
    expect(names).toContain('plan')
    expect(names).toContain('skills')
    expect(names).toContain('style')
    expect(names).toContain('model')
  })

  it('未知命令返回 undefined', () => {
    expect(findCommand('unknown-cmd')).toBeUndefined()
    expect(findCommand('help')?.name).toBe('help')
  })
})
