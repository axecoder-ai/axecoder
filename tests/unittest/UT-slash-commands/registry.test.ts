import { describe, expect, it } from 'vitest'
import { allSlashCommands, findCommand } from '../../../src/slash-commands/registry'

describe('findCommand', () => {
  it('registry 已注册内置命令', () => {
    const names = allSlashCommands().map((c) => c.name)
    expect(names).toContain('compact')
    expect(names).toContain('hooks')
    expect(names).toContain('mcp')
    expect(names).toContain('plan')
    expect(names).toContain('skills')
    expect(names).toContain('style')
    expect(names).toContain('model')
    expect(names).toContain('research-codebase')
    expect(names).toContain('make-proposals')
    expect(names).toContain('create-proposals')
    expect(names).toContain('implement')
    expect(names).toContain('code-review')
    expect(names).toContain('design_doc_template')
  })

  it('未知命令返回 undefined', () => {
    expect(findCommand('unknown-cmd')).toBeUndefined()
    expect(findCommand('compact')?.name).toBe('compact')
  })
})
