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
  it('首次 list 种子技术经理', async () => {
    const data = await listUsers()
    expect(data.users).toHaveLength(1)
    const m = data.users[0]
    expect(m.id).toBe(BUILTIN_MANAGER_ID)
    expect(m.isBuiltin).toBe(true)
    expect(m.builtinRole).toBe('manager')
    expect(m.role).toBe('技术经理')
  })

  it('内置技术经理不可删除', async () => {
    await listUsers()
    await expect(deleteUser(BUILTIN_MANAGER_ID)).rejects.toThrow('内置用户不可删除')
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
    expect(m.role).toBe('技术经理')
    expect(m.expertise).not.toBe('写 PRD')
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
    expect(data.users).toHaveLength(2)
    data = await deleteUser('u1')
    expect(data.users).toHaveLength(1)
    expect(data.users[0].id).toBe(BUILTIN_MANAGER_ID)
  })
})
