import { describe, expect, it } from 'vitest'
import {
  destPathWithSuffix,
  fileNameFromPath,
  isPathInsideRoot,
  parseRipgrepJsonLine,
  shouldIgnoreWorkspacePath,
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

  it('优先使用 data.lines.text', () => {
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: '/p/b.md' },
        line_number: 10,
        lines: { text: '技术方案内容\n' },
        submatches: [{ start: 0, match: { text: '技术' } }],
      },
    })
    expect(parseRipgrepJsonLine(line)).toEqual({
      file: '/p/b.md',
      line: 10,
      col: 1,
      text: '技术方案内容',
    })
  })

  it('非 match 返回 null', () => {
    expect(parseRipgrepJsonLine(JSON.stringify({ type: 'begin' }))).toBeNull()
  })
})

describe('shouldIgnoreWorkspacePath', () => {
  it('忽略 release、vscode 与 asar', () => {
    expect(shouldIgnoreWorkspacePath('/proj/release/0.2.0/foo')).toBe(true)
    expect(shouldIgnoreWorkspacePath('/proj/vscode/extensions/foo')).toBe(true)
    expect(
      shouldIgnoreWorkspacePath(
        '/proj/release/0.2.0/AxeCoder.app/Contents/Resources/app.asar',
      ),
    ).toBe(true)
    expect(
      shouldIgnoreWorkspacePath(
        '/proj/vscode/extensions/css-language-features/server/test/pathCompletionFixtures/src/data/foo.asar',
      ),
    ).toBe(true)
  })

  it('普通源码不忽略', () => {
    expect(shouldIgnoreWorkspacePath('/proj/src/App.vue')).toBe(false)
  })
})
