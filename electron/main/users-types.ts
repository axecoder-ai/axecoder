export type BuiltinUserRole = 'manager'

export type UserEntry = {
  id: string
  displayName: string
  role: string
  expertise: string
  avatarPath: string
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
}
