import { describe, expect, it } from 'vitest'
import {
  buildRipgrepArgs,
  replaceInLine,
  countReplacementsInLine,
} from '../../../electron/main/search-utils'

describe('buildRipgrepArgs', () => {
  it('默认字面量不区分大小写', () => {
    const args = buildRipgrepArgs('/proj', 'foo')
    expect(args).toContain('-i')
    expect(args).toContain('-F')
    expect(args).not.toContain('-w')
    expect(args.filter((a) => a === '--glob').length).toBeGreaterThanOrEqual(4)
    expect(args[args.length - 2]).toBe('foo')
    expect(args[args.length - 1]).toBe('/proj')
  })

  it('大小写敏感 + 全词 + 正则', () => {
    const args = buildRipgrepArgs('/proj', 'a+', {
      caseSensitive: true,
      wholeWord: true,
      regex: true,
    })
    expect(args).not.toContain('-i')
    expect(args).not.toContain('-F')
    expect(args).toContain('-w')
  })

  it('include/exclude glob', () => {
    const args = buildRipgrepArgs('/proj', 'x', {
      include: '*.ts',
      exclude: 'test/**',
    })
    expect(args).toContain('*.ts')
    expect(args).toContain('!test/**')
  })
})

describe('replaceInLine', () => {
  it('字面量不区分大小写替换', () => {
    expect(replaceInLine('Hello HELLO', 'hello', 'hi')).toBe('hi hi')
  })

  it('全词不匹配子串', () => {
    expect(replaceInLine('foobar foo bar', 'foo', 'X', { wholeWord: true })).toBe(
      'foobar X bar',
    )
  })

  it('大小写敏感', () => {
    expect(
      replaceInLine('Hello hello', 'hello', 'X', { caseSensitive: true }),
    ).toBe('Hello X')
  })
})

describe('countReplacementsInLine', () => {
  it('统计出现次数', () => {
    expect(countReplacementsInLine('a a a', 'a', 'b')).toBe(3)
  })
})
