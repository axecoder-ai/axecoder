import { describe, expect, it } from 'vitest'
import { allCommands, findCommand } from '../../../src/slash-commands/registry'

describe('findCommand', () => {
  it('findCommand 可找到 init', () => {
    expect(findCommand('init')?.name).toBe('init')
    expect(allCommands().some((c) => c.name === 'init')).toBe(true)
  })

  it('未知命令返回 undefined', () => {
    expect(findCommand('help')).toBeUndefined()
    expect(findCommand('unknown-cmd')).toBeUndefined()
  })
})
