import { describe, expect, it } from 'vitest'
import type { UserEntry } from '../../../src/types/axecoder'
import {
  buildRoleCommandPromptText,
  effectiveUserSkillSlugs,
  filterUsersForMention,
  formatRoleMentionInput,
  parseCommittedRoleMention,
  resolveRoleCommandSlug,
  roleMentionPickerQuery,
  stripRoleCommandPrefix,
  hasMultipleRoleMentions,
} from '../../../src/utils/role-mention'

const users: UserEntry[] = [
  {
    id: 'builtin-manager',
    displayName: 'Tech Lead',
    role: 'Tech Lead',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'manager',
  },
  {
    id: 'builtin-developer',
    displayName: 'Developer',
    role: 'Developer',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'developer',
    skillSlugs: ['implement'],
  },
  {
    id: 'builtin-architect',
    displayName: 'Architect',
    role: 'Architect',
    expertise: '',
    avatarPath: '',
    isBuiltin: true,
    builtinRole: 'architect',
    skillSlugs: ['make-proposals', 'create-proposals'],
  },
]

describe('role-mention', () => {
  it('parseCommittedRoleMention 解析 @角色 与正文', () => {
    const m = parseCommittedRoleMention('@Developer 实现登录接口', users)
    expect(m?.userId).toBe('builtin-developer')
    expect(m?.args).toBe('实现登录接口')
  })

  it('roleMentionPickerQuery 在选定前返回查询', () => {
    expect(roleMentionPickerQuery('@Dev', users)).toBe('dev')
    expect(roleMentionPickerQuery('@Developer 任务', users)).toBeNull()
  })

  it('filterUsersForMention 按名称过滤', () => {
    const list = filterUsersForMention(users, 'dev')
    expect(list.map((u) => u.id)).toEqual(['builtin-developer'])
  })

  it('resolveRoleCommandSlug 单命令角色', () => {
    const dev = users.find((u) => u.id === 'builtin-developer')!
    expect(resolveRoleCommandSlug(dev, '')).toBe('implement')
    expect(resolveRoleCommandSlug(dev, '登录模块')).toBe('implement')
  })

  it('resolveRoleCommandSlug 多命令角色可指定子命令', () => {
    const arch = users.find((u) => u.id === 'builtin-architect')!
    expect(resolveRoleCommandSlug(arch, '')).toBe('make-proposals')
    expect(resolveRoleCommandSlug(arch, '补充说明')).toBe('make-proposals')
    expect(resolveRoleCommandSlug(arch, 'create-proposals 方案B')).toBe('create-proposals')
  })

  it('stripRoleCommandPrefix 去掉 args 里的命令前缀', () => {
    expect(stripRoleCommandPrefix('create-proposals 方案B', 'create-proposals', [])).toBe('方案B')
    expect(stripRoleCommandPrefix('/make-proposals', 'make-proposals', [])).toBe('')
  })

  it('buildRoleCommandPromptText 拼接用户补充', () => {
    expect(buildRoleCommandPromptText('PLAYBOOK', 'notes')).toContain('PLAYBOOK')
    expect(buildRoleCommandPromptText('PLAYBOOK', 'notes')).toContain('notes')
  })

  it('parseCommittedRoleMention 兼容 · 与空格', () => {
    const lois: UserEntry = {
      id: 'builtin-researcher',
      displayName: 'Lois Lane',
      role: 'Researcher',
      expertise: '',
      avatarPath: '',
      isBuiltin: true,
      builtinRole: 'researcher',
      skillSlugs: ['research-codebase'],
    }
    const m = parseCommittedRoleMention('@Lois·Lane 写到 research/', [lois])
    expect(m?.userId).toBe('builtin-researcher')
    expect(m?.args).toBe('写到 research/')
  })

  it('formatRoleMentionInput 保留 args 末尾空格', () => {
    expect(formatRoleMentionInput('Chloe Sullivan', '/implement run.sh serv ')).toBe(
      '@Chloe Sullivan /implement run.sh serv ',
    )
    expect(formatRoleMentionInput('Developer')).toBe('@Developer ')
  })

  it('hasMultipleRoleMentions 拒绝一条消息 @ 多个角色', () => {
    const lois: UserEntry = {
      id: 'r1',
      displayName: 'Lois Lane',
      role: 'Researcher',
      expertise: '',
      avatarPath: '',
    }
    const bob: UserEntry = {
      id: 'r2',
      displayName: 'Bob',
      role: 'Developer',
      expertise: '',
      avatarPath: '',
    }
    expect(hasMultipleRoleMentions('@Lois Lane @Bob 任务', [lois, bob])).toBe(true)
    expect(hasMultipleRoleMentions('@Lois Lane 调研', [lois, bob])).toBe(false)
  })
})
