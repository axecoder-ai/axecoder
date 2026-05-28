import { describe, expect, it } from 'vitest'
import {
  destPathWithSuffix,
  fileNameFromPath,
  isPathInsideRoot,
  parseRipgrepJsonLine,
} from '../../../electron/main/fs-utils'

describe('fileNameFromPath', () => {
  it('取 Unix 路径文件名', () => {
    expect(fileNameFromPath('/a/b/hello.md')).toBe('hello.md')
  })

  it('取 Windows 路径文件名', () => {
    expect(fileNameFromPath('C:\\proj\\x.md')).toBe('x.md')
  })
})

describe('isPathInsideRoot', () => {
  it('根内文件', () => {
    expect(isPathInsideRoot('/proj', '/proj/a.md')).toBe(true)
  })

  it('根目录自身', () => {
    expect(isPathInsideRoot('/proj', '/proj')).toBe(true)
  })

  it('根外路径', () => {
    expect(isPathInsideRoot('/proj', '/other/a.md')).toBe(false)
  })
})

describe('destPathWithSuffix', () => {
  it('生成带序号路径', () => {
    expect(destPathWithSuffix('/d/a.md', 2)).toBe('/d/a (2).md')
  })
})

describe('parseRipgrepJsonLine', () => {
  it('解析 match 行', () => {
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: '/p/a.md' },
        line_number: 3,
        submatches: [{ start: 0, lines: { text: 'hello\n' } }],
      },
    })
    expect(parseRipgrepJsonLine(line)).toEqual({
      file: '/p/a.md',
      line: 3,
      col: 1,
      text: 'hello',
    })
  })

  it('非 match 返回 null', () => {
    expect(parseRipgrepJsonLine(JSON.stringify({ type: 'begin' }))).toBeNull()
  })
})
