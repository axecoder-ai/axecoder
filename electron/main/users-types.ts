export type BuiltinUserRole = 'manager'

export type UserEntry = {
  id: string
  displayName: string
  role: string
  expertise: string
  avatarPath: string
  /** 绑定的 Skill / 自定义命令 slug 列表 */
  skillSlugs?: string[]
  isBuiltin?: boolean
  builtinRole?: BuiltinUserRole
}

export type UsersFile = {
  schemaVersion: 1
  users: UserEntry[]
}

export type UserSaveInput = {
  id: string
  displayName: string
  role: string
  expertise: string
  avatarPath?: string
  skillSlugs?: string[]
}

export type AvailableSkillItem = {
  slug: string
  label: string
  kind: 'skill' | 'command'
  source: string
}
