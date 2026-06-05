import { describe, expect, it } from 'vitest'
import { effectiveUserSkillSlugs } from '../../../shared/user-skill-slugs'

describe('effectiveUserSkillSlugs', () => {
  it('显式 skillSlugs 优先', () => {
    expect(
      effectiveUserSkillSlugs({ role: 'Researcher', skillSlugs: ['implement'] }),
    ).toEqual(['implement'])
  })

  it('Researcher 岗位继承 research-codebase', () => {
    expect(effectiveUserSkillSlugs({ role: 'Researcher' })).toEqual(['research-codebase'])
  })

  it('Tech Lead 无绑定命令', () => {
    expect(effectiveUserSkillSlugs({ role: 'Tech Lead' })).toEqual([])
  })
})
