import { describe, expect, it } from 'vitest'
import { parseSlashCommand } from '../../../src/slash-commands/parse'
import { registerBuiltinSlashCommands } from '../../../src/slash-commands/builtin'

describe('slash parse', () => {
  it('解析 /style Explanatory', () => {
    const p = parseSlashCommand('/style Explanatory')
    expect(p?.commandName).toBe('style')
    expect(p?.args).toBe('Explanatory')
  })
})

describe('builtin slash commands', () => {
  it('内置命令包含生态命令', () => {
    const names = registerBuiltinSlashCommands().map((c) => c.name)
    expect(names).toContain('rewind')
    expect(names).toContain('mcp')
  })
})
