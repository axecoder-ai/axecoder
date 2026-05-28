import { describe, expect, it } from 'vitest'
import {
  applyStringReplace,
  countOccurrences,
  formatNumberedContent,
  patchToUnifiedDiff,
} from '../../../electron/main/agent/edit-utils'

describe('countOccurrences', () => {
  it('空 needle 为 0', () => {
    expect(countOccurrences('abc', '')).toBe(0)
  })

  it('统计出现次数', () => {
    expect(countOccurrences('aa-b-aa', 'aa')).toBe(2)
  })
})

describe('applyStringReplace', () => {
  it('单次替换成功', () => {
    const r = applyStringReplace('hello world', 'world', 'there', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.content).toBe('hello there')
  })

  it('old_string 不存在', () => {
    const r = applyStringReplace('hello', 'xyz', 'a', false)
    expect(r.ok).toBe(false)
  })

  it('多处出现且未 replace_all 失败', () => {
    const r = applyStringReplace('aa-b-aa', 'aa', 'xx', false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('unique')
  })

  it('replace_all 替换全部', () => {
    const r = applyStringReplace('aa-b-aa', 'aa', 'xx', true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.content).toBe('xx-b-xx')
  })

  it('old 与 new 相同失败', () => {
    const r = applyStringReplace('a', 'a', 'a', false)
    expect(r.ok).toBe(false)
  })
})

describe('formatNumberedContent', () => {
  it('带行号', () => {
    expect(formatNumberedContent('a\nb')).toBe('1|a\n2|b')
  })
})

describe('patchToUnifiedDiff', () => {
  it('生成可读的 unified diff', () => {
    const text = patchToUnifiedDiff('f.md', 'a\n', 'a\nb\n')
    expect(text).toContain('---')
    expect(text).toContain('+++')
  })
})
