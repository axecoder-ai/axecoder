import { describe, expect, it } from 'vitest'
import { WORKSHOP_ROLE_UI, workshopRoleUi } from '../../../src/utils/workshop-roles'

describe('workshop-roles-ui', () => {
  it('每个员工角色含昵称与职位', () => {
    for (const id of ['manager', 'backend', 'frontend', 'tester'] as const) {
      const r = WORKSHOP_ROLE_UI[id]
      expect(r.nickname.length).toBeGreaterThan(0)
      expect(r.roleTitle.length).toBeGreaterThan(0)
      expect(r.avatar.length).toBe(1)
    }
  })

  it('用户角色含头像字与需求方', () => {
    const u = workshopRoleUi('user')
    expect(u.nickname).toBe('你')
    expect(u.roleTitle).toBe('需求方')
    expect(u.avatar).toBe('我')
  })
})
