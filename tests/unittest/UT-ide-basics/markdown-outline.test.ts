import { describe, it, expect } from 'vitest'
import { parseMarkdownOutline } from '../../../src/utils/markdown-outline'

describe('parseMarkdownOutline', () => {
  it('解析 Markdown 标题', () => {
    const md = '# 第一章\n\n## 第一节\n正文'
    const items = parseMarkdownOutline(md)
    expect(items).toEqual([
      { line: 1, level: 1, text: '第一章' },
      { line: 3, level: 2, text: '第一节' },
    ])
  })
})
