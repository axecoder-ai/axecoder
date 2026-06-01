import { describe, expect, it } from 'vitest'
import { allCommands, findCommand } from '../../../src/slash-commands/registry'

describe('findCommand', () => {
  it('registry 当前无注册命令', () => {
    expect(allCommands()).toHaveLength(0)
    expect(findCommand('init')).toBeUndefined()
  })

  it('未知命令返回 undefined', () => {
    expect(findCommand('help')).toBeUndefined()
    expect(findCommand('unknown-cmd')).toBeUndefined()
  })
})
