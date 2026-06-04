import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { listUsers, saveUser, BUILTIN_MANAGER_ID } from '../../../electron/main/users-store'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-user-skills-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('users-store skillSlugs', () => {
  it('保存并读取普通用户 skillSlugs', async () => {
    await listUsers()
    await saveUser({
      id: 'u1',
      displayName: '小李',
      role: '后端',
      expertise: 'Node.js',
      skillSlugs: ['kill-aexcoder', 'code-review'],
    })
    const data = await listUsers()
    const u = data.users.find((x) => x.id === 'u1')!
    expect(u.skillSlugs).toEqual(['kill-aexcoder', 'code-review'])
  })

  it('缺省 skillSlugs 为空数组', async () => {
    await listUsers()
    await saveUser({
      id: 'u2',
      displayName: '小王',
      role: '前端',
      expertise: 'Vue',
    })
    const u = (await listUsers()).users.find((x) => x.id === 'u2')!
    expect(u.skillSlugs ?? []).toEqual([])
  })

  it('内置技术经理可更新 skillSlugs', async () => {
    await listUsers()
    await saveUser({
      id: BUILTIN_MANAGER_ID,
      displayName: '技术经理',
      role: '产品经理',
      expertise: '写 PRD',
      skillSlugs: ['make-plan'],
    })
    const m = (await listUsers()).users.find((u) => u.id === BUILTIN_MANAGER_ID)!
    expect(m.role).toBe('Tech Lead')
    expect(m.skillSlugs).toEqual(['make-plan'])
  })
})
