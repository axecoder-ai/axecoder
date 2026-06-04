import { describe, expect, it } from 'vitest'
import { parseSkillFile, serializeSkillFile } from '../../../electron/main/skills/skills-parse'

describe('skills-parse', () => {
  it('解析与序列化 frontmatter', () => {
    const raw = `---
name: foo
description: "bar baz"
---

# Hello
`
    const { frontmatter, body } = parseSkillFile(raw)
    expect(frontmatter.name).toBe('foo')
    expect(frontmatter.description).toBe('bar baz')
    expect(body).toContain('# Hello')
    const out = serializeSkillFile({ name: 'foo', description: 'bar baz' }, '# Hello')
    const again = parseSkillFile(out)
    expect(again.frontmatter.name).toBe('foo')
    expect(again.frontmatter.description).toBe('bar baz')
  })
})
