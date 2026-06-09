import { activeAtRefToken } from '../../shared/at-ref-parse'
import { filterUsersForMention, parseCommittedRoleMention } from './role-mention'
import type { UserEntry } from '../types/axecoder'

export type AtPickerContext = {
  relDir: string
  partial: string
  replaceStart: number
  token: string
}

/** 光标处 @ 补全上下文（角色 + 文件共用） */
export const atPickerContext = (
  text: string,
  cursor: number,
  users: UserEntry[],
): AtPickerContext | null => {
  const at = activeAtRefToken(text, cursor)
  if (!at) return null
  const slash = at.token.lastIndexOf('/')
  const relDir = slash >= 0 ? at.token.slice(0, slash + 1) : ''
  const partial = slash >= 0 ? at.token.slice(slash + 1) : at.token
  return { relDir, partial, replaceStart: at.start, token: at.token }
}

/** 当前 @ 下要展示的角色列表 */
export const rolesForAtPicker = (text: string, cursor: number, users: UserEntry[]): UserEntry[] => {
  if (!users.length) return []
  const ctx = atPickerContext(text, cursor, users)
  if (!ctx) return []
  if (ctx.token.includes('/') && !ctx.token.endsWith('/')) return []
  return filterUsersForMention(users, ctx.partial)
}

/** 收集发前应跳过的 @ token（角色名，避免误当文件） */
export const roleMentionSkipTokens = (text: string, users: UserEntry[]): string[] => {
  if (!users.length) return []
  const mention = parseCommittedRoleMention(text, users)
  if (mention) {
    const name = mention.displayName.replace(/\s+/g, ' ').trim()
    const parts = name.split(/\s+/).filter(Boolean)
    return [name, ...parts]
  }
  const out = new Set<string>()
  for (const u of users) {
    out.add(u.displayName.trim())
    if (u.role.trim()) out.add(u.role.trim())
  }
  return [...out].filter(Boolean)
}
