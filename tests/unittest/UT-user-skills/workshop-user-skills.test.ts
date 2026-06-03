import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { resolveUserSkillPromptBlock } from '../../../electron/main/workshop/workshop-user-skills'
import type { UserEntry } from '../../../electron/main/users-types'

let tmpDir = ''
let projectRoot = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-ws-skills-'))
  projectRoot = path.join(tmpDir, 'proj')
  await fs.mkdir(projectRoot, { recursive: true })
  const skillDir = path.join(projectRoot, '.cursor', 'skills', 'demo-skill')
  await fs.mkdir(skillDir, { recursive: true })
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    '# Demo Skill\n\n按此 Skill 执行演示任务。',
    'utf-8',
  )
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('resolveUserSkillPromptBlock', () => {
  it('无 skillSlugs 时返回空串', async () => {
    const user: UserEntry = {
      id: 'u1',
      displayName: '小李',
      role: '后端',
      expertise: '',
      avatarPath: '',
    }
    const block = await resolveUserSkillPromptBlock(user, projectRoot)
    expect(block).toBe('')
  })

  it('有效 slug 时输出含 Skill 标题与正文', async () => {
    const user: UserEntry = {
      id: 'u1',
      displayName: '小李',
      role: '后端',
      expertise: '',
      avatarPath: '',
      skillSlugs: ['demo-skill'],
    }
    const block = await resolveUserSkillPromptBlock(user, projectRoot)
    expect(block).toContain('【绑定 Skill / 命令】')
    expect(block).toContain('demo-skill')
    expect(block).toContain('Demo Skill')
    expect(block).toContain('按此 Skill 执行演示任务')
  })

  it('无效 slug 跳过不报错', async () => {
    const user: UserEntry = {
      id: 'u1',
      displayName: '小李',
      role: '后端',
      expertise: '',
      avatarPath: '',
      skillSlugs: ['missing-skill', 'demo-skill'],
    }
    const block = await resolveUserSkillPromptBlock(user, projectRoot)
    expect(block).toContain('demo-skill')
    expect(block).not.toContain('missing-skill')
  })
})
