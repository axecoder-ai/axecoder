import { describe, expect, it } from 'vitest'
import { findUserForWorkshopRole } from '../../../src/utils/workshop-user-bind'
import type { UserEntry } from '../../../src/types/axecoder'

const users: UserEntry[] = [
  {
    id: 'builtin-manager',
    displayName: '王经理',
    role: '技术经理',
    expertise: '',
    avatarPath: 'a.png',
    isBuiltin: true,
    builtinRole: 'manager',
  },
  {
    id: 'u2',
    displayName: '小陈',
    role: 'Backend',
    expertise: '',
    avatarPath: '',
  },
  {
    id: 'u3',
    displayName: '甲方',
    role: '需求方',
    expertise: '',
    avatarPath: 'r.png',
  },
]

describe('workshop-user-bind', () => {
  it('经理匹配 builtin', () => {
    expect(findUserForWorkshopRole(users, 'manager')?.displayName).toBe('王经理')
  })

  it('员工按 role 匹配', () => {
    expect(findUserForWorkshopRole(users, 'backend')?.displayName).toBe('小陈')
  })

  it('BOSS 不在 users.json，user 角色不匹配', () => {
    expect(findUserForWorkshopRole(users, 'user')).toBeUndefined()
  })
})
