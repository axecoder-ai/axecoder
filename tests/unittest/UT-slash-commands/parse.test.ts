import { describe, expect, it } from 'vitest'
import { parseSlashCommand } from '../../../src/slash-commands/parse'

describe('parseSlashCommand', () => {
  it('解析命令名与参数', () => {
    expect(parseSlashCommand('/help')).toEqual({ commandName: 'help', args: '' })
    expect(parseSlashCommand('/model my-model-id')).toEqual({
      commandName: 'model',
      args: 'my-model-id',
    })
    expect(parseSlashCommand('  /clear  ')).toEqual({ commandName: 'clear', args: '' })
  })

  it('非斜杠或空命令返回 null', () => {
    expect(parseSlashCommand('hello')).toBeNull()
    expect(parseSlashCommand('/')).toBeNull()
    expect(parseSlashCommand('/   ')).toBeNull()
  })
})
