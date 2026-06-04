import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  listSkills,
  saveSkill,
  deleteSkill,
  readSkill,
  setUserSkillsDirForTests,
} from '../../../electron/main/skills/skills-store'

let tmpUserSkills = ''
let tmpProject = ''

beforeEach(async () => {
  tmpUserSkills = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-skills-user-'))
  tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-skills-proj-'))
  setUserSkillsDirForTests(tmpUserSkills)
})

afterEach(async () => {
  setUserSkillsDirForTests(null)
  await fs.rm(tmpUserSkills, { recursive: true, force: true })
  await fs.rm(tmpProject, { recursive: true, force: true })
})

describe('skills-store', () => {
  it('用户 Skill CRUD', async () => {
    await saveSkill({
      scope: 'user',
      folderName: '',
      name: 'my-skill',
      description: '测试技能',
      body: '按步骤执行',
      isNew: true,
    })
    let data = await listSkills()
    expect(data.skills.some((s) => s.name === 'my-skill' && s.scope === 'user')).toBe(true)
    const item = data.skills.find((s) => s.name === 'my-skill')!
    const detail = await readSkill('user', item.folderName)
    expect(detail.body).toContain('按步骤执行')
    await deleteSkill('user', item.folderName)
    data = await listSkills()
    expect(data.skills.some((s) => s.name === 'my-skill')).toBe(false)
  })

  it('项目 Skill 写入 .cursor/skills', async () => {
    await saveSkill({
      scope: 'project',
      folderName: '',
      name: 'proj-skill',
      description: '项目技能',
      body: '项目内说明',
      projectRoot: tmpProject,
      isNew: true,
    })
    const md = path.join(tmpProject, '.cursor', 'skills', 'proj-skill', 'SKILL.md')
    const raw = await fs.readFile(md, 'utf-8')
    expect(raw).toContain('name: proj-skill')
    expect(raw).toContain('项目内说明')
  })
})
