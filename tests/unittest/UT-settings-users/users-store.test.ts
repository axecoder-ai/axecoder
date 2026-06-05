import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  listUsers,
  saveUser,
  deleteUser,
  BUILTIN_MANAGER_ID,
} from '../../../electron/main/users-store'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-users-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('users-store', () => {
  it('首次 list 种子全部内置工作流角色', async () => {
    const data = await listUsers()
    expect(data.users.length).toBeGreaterThanOrEqual(7)
    const m = data.users.find((u) => u.id === BUILTIN_MANAGER_ID)!
    expect(m.isBuiltin).toBe(true)
    expect(m.builtinRole).toBe('manager')
    expect(m.role).toBe('Tech Lead')
    expect(m.expertise).toBe('Requirements breakdown, coordination, technical review')
    const dev = data.users.find((u) => u.builtinRole === 'developer')!
    expect(dev.skillSlugs).toEqual(['implement'])
    const reviewer = data.users.find((u) => u.builtinRole === 'reviewer')!
    expect(reviewer.skillSlugs).toEqual(['code-review'])
    expect(data.users[0].id).toBe(BUILTIN_MANAGER_ID)
  })

  it('内置技术经理不可删除', async () => {
    await listUsers()
    await expect(deleteUser(BUILTIN_MANAGER_ID)).rejects.toThrow('Built-in user cannot be deleted')
  })

  it('内置角色不可改角色、擅长与绑定命令', async () => {
    await listUsers()
    const saved = await saveUser({
      id: 'builtin-developer',
      displayName: '小李',
      role: '全栈',
      expertise: '什么都干',
      skillSlugs: ['code-review', 'implement'],
    })
    const dev = saved.users.find((u) => u.builtinRole === 'developer')!
    expect(dev.displayName).toBe('小李')
    expect(dev.role).toBe('Developer')
    expect(dev.expertise).toBe('TDD implementation, unit tests')
    expect(dev.skillSlugs).toEqual(['implement'])
  })

  it('内置技术经理不可改角色与擅长', async () => {
    await listUsers()
    const saved = await saveUser({
      id: BUILTIN_MANAGER_ID,
      displayName: '张经理',
      role: '产品经理',
      expertise: '写 PRD',
    })
    const m = saved.users.find((u) => u.id === BUILTIN_MANAGER_ID)!
    expect(m.displayName).toBe('张经理')
    expect(m.role).toBe('Tech Lead')
    expect(m.expertise).toBe('Requirements breakdown, coordination, technical review')
  })

  it('可添加并删除普通用户', async () => {
    await listUsers()
    await saveUser({
      id: 'u1',
      displayName: '小李',
      role: '后端',
      expertise: 'Node.js',
    })
    let data = await listUsers()
    expect(data.users.length).toBeGreaterThanOrEqual(7)
    data = await deleteUser('u1')
    expect(data.users.length).toBeGreaterThanOrEqual(6)
    expect(data.users.some((u) => u.id === BUILTIN_MANAGER_ID)).toBe(true)
  })

  it('旧版中文内置经理 list 时迁移为英文', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'users.json'),
      JSON.stringify({
        schemaVersion: 1,
        users: [
          {
            id: BUILTIN_MANAGER_ID,
            displayName: '徐然',
            role: '技术经理',
            expertise: '需求拆解、任务协调、技术评审',
            avatarPath: '',
            isBuiltin: true,
            builtinRole: 'manager',
          },
        ],
      }),
    )
    const m = (await listUsers()).users.find((u) => u.id === BUILTIN_MANAGER_ID)!
    expect(m.displayName).toBe('Tech Lead')
    expect(m.role).toBe('Tech Lead')
    expect(m.expertise).toBe('Requirements breakdown, coordination, technical review')
  })
})
