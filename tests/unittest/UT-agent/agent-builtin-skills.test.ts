import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  discoverBuiltinSkills,
  listBuiltinSkills,
  loadBuiltinSkill,
} from '../../../electron/main/agent/agent-builtin-skills'
import { discoverSkills } from '../../../electron/main/agent/agent-skills'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('agent-builtin-skills', () => {
  let prevAppRoot = process.env.APP_ROOT

  beforeEach(() => {
    prevAppRoot = process.env.APP_ROOT
    process.env.APP_ROOT = projectRoot
  })

  afterEach(() => {
    if (prevAppRoot === undefined) delete process.env.APP_ROOT
    else process.env.APP_ROOT = prevAppRoot
  })

  it('lists builtin-skills plus mattpocock manifest entries', async () => {
    const list = await discoverBuiltinSkills()
    expect(list.length).toBeGreaterThanOrEqual(14)
    expect(list.map((s) => s.name)).toContain('brainstorming')
    expect(list.map((s) => s.name)).toContain('writing-plans')
    expect(list.every((s) => s.source === 'builtin')).toBe(true)
  })

  it('加载 brainstorming 正文', async () => {
    const loaded = await loadBuiltinSkill('brainstorming')
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.text).toContain('Brainstorming Ideas Into Designs')
      expect(loaded.path).toContain('resources/builtin-skills/brainstorming/SKILL.md')
    }
  })

  it('discoverSkills 无项目时仍含内置 skill', async () => {
    const skills = await discoverSkills('')
    expect(skills.some((s) => s.name === 'brainstorming' && s.source === 'builtin')).toBe(true)
  })

  it('listBuiltinSkills 含 description', async () => {
    const list = await listBuiltinSkills()
    const brainstorming = list.find((s) => s.name === 'brainstorming')
    expect(brainstorming?.description.length).toBeGreaterThan(0)
  })

  it('未知 skill 返回错误', async () => {
    const loaded = await loadBuiltinSkill('unknown-skill')
    expect(loaded.ok).toBe(false)
  })
})
