import { describe, expect, it } from 'vitest'
import { parseRuleFile, ruleDisplayTitle, serializeRuleFile } from '../../../electron/main/rules/rules-parse'

describe('rules-parse', () => {
  it('解析 frontmatter 与正文', () => {
    const raw = `---
description: 永远都用中文
alwaysApply: true
---
请用中文回答。`
    const { frontmatter, body } = parseRuleFile(raw)
    expect(frontmatter.description).toBe('永远都用中文')
    expect(frontmatter.alwaysApply).toBe(true)
    expect(body).toBe('请用中文回答。')
  })

  it('无 frontmatter 时正文为全文', () => {
    const { frontmatter, body } = parseRuleFile('仅正文')
    expect(frontmatter.alwaysApply).toBeFalsy()
    expect(body).toBe('仅正文')
  })

  it('serialize 往返', () => {
    const text = serializeRuleFile(
      { description: '最小改动', alwaysApply: true },
      '改少一点',
    )
    const parsed = parseRuleFile(text)
    expect(parsed.frontmatter.description).toBe('最小改动')
    expect(parsed.frontmatter.alwaysApply).toBe(true)
    expect(parsed.body).toBe('改少一点')
  })

  it('ruleDisplayTitle 优先 description', () => {
    const title = ruleDisplayTitle({ description: '标题' }, '正文', 'x.mdc')
    expect(title).toBe('标题')
  })
})
