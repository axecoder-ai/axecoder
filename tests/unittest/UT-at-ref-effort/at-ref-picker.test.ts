import { describe, expect, it } from 'vitest'
import type { UserEntry } from '../../../src/types/axecoder'
import {
  atPickerContext,
  roleMentionSkipTokens,
  rolesForAtPicker,
} from '../../../src/utils/at-ref-picker'

const lois: UserEntry = {
  id: '1',
  displayName: 'Lois Lane',
  role: 'Researcher',
  expertise: '',
  avatarPath: '',
}

describe('at-ref-picker unified', () => {
  it('rolesForAtPicker 与文件 @ 共存', () => {
    const text = '@Lo'
    const roles = rolesForAtPicker(text, text.length, [lois])
    expect(roles.map((u) => u.displayName)).toContain('Lois Lane')
    expect(atPickerContext(text, text.length, [lois])?.partial).toBe('Lo')
  })

  it('roleMentionSkipTokens 跳过角色名片段', () => {
    const skip = roleMentionSkipTokens('@Lois Lane 看 @README.md', [lois])
    expect(skip).toContain('Lois Lane')
    expect(skip).toContain('Lois')
    expect(skip).toContain('Lane')
  })
})
