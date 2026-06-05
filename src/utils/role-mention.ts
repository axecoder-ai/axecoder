import type { UserEntry } from '../types/axecoder'
import { effectiveUserSkillSlugs } from '../../shared/user-skill-slugs'

export { effectiveUserSkillSlugs } from '../../shared/user-skill-slugs'

export type RoleMentionMatch = {
  userId: string
  displayName: string
  args: string
}

const normMentionKey = (s: string) => s.trim().toLowerCase().replace(/[\s·.・]+/g, ' ')

const expandMentionAlias = (name: string): string[] => {
  const base = name.trim()
  if (!base) return []
  const variants = new Set<string>([base])
  variants.add(base.replace(/[\s·.・]+/g, ' '))
  variants.add(base.replace(/\s+/g, '·'))
  return [...variants]
}

const mentionLabels = (u: UserEntry): string[] => {
  const labels = [u.displayName.trim(), u.role.trim()].filter(Boolean)
  if (u.builtinRole) labels.push(u.builtinRole.replace(/_/g, ' '))
  return [...new Set(labels.map((s) => normMentionKey(s)))]
}

type MentionAlias = { label: string; user: UserEntry }

const mentionAliasesForUser = (u: UserEntry): MentionAlias[] => {
  const out: MentionAlias[] = []
  const seen = new Set<string>()
  for (const raw of [u.displayName, u.role, u.builtinRole?.replace(/_/g, ' ')].filter(Boolean)) {
    for (const label of expandMentionAlias(raw!)) {
      const key = normMentionKey(label)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ label, user: u })
    }
  }
  return out
}

const mentionLabelMatches = (rest: string, label: string): boolean => {
  const r = normMentionKey(rest)
  const l = normMentionKey(label)
  if (!r.startsWith(l)) return false
  if (r.length > l.length && r[l.length] !== ' ') return false
  return true
}

const sliceAfterMentionLabel = (rest: string, label: string): string => {
  const parts = label.trim().split(/[\s·.・]+/).filter(Boolean)
  if (!parts.length) return rest.trimStart()
  let pattern = '^'
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) pattern += '[\\s·.・]+'
    pattern += parts[i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  pattern += '(?=\\s|$)'
  const m = rest.match(new RegExp(pattern, 'i'))
  if (!m) return rest.trimStart()
  return rest.slice(m[0].length).trimStart()
}

/** 按 alias 长度降序，优先匹配长名称 */
const allMentionAliases = (users: UserEntry[]) =>
  users
    .flatMap((u) => mentionAliasesForUser(u))
    .sort((a, b) => b.label.length - a.label.length)

/** 已选定的 @角色（名称后有空格或已结束） */
export const parseCommittedRoleMention = (
  text: string,
  users: UserEntry[],
): RoleMentionMatch | null => {
  const t = text.trimStart()
  if (!t.startsWith('@')) return null
  const rest = t.slice(1)
  for (const { label, user } of allMentionAliases(users)) {
    if (!mentionLabelMatches(rest, label)) continue
    return {
      userId: user.id,
      displayName: user.displayName,
      args: sliceAfterMentionLabel(rest, label),
    }
  }
  return null
}

/** 输入 `@` 后尚未选定角色时的过滤查询 */
export const roleMentionPickerQuery = (text: string, users: UserEntry[]): string | null => {
  const t = text.trimStart()
  if (!t.startsWith('@')) return null
  if (parseCommittedRoleMention(text, users)) return null
  return t.slice(1).toLowerCase()
}

export const filterUsersForMention = (users: UserEntry[], query: string): UserEntry[] => {
  const q = normMentionKey(query)
  if (!q) return users
  return users.filter((u) => mentionLabels(u).some((l) => l.includes(q)))
}

export const formatRoleMentionInput = (displayName: string, args = '') =>
  args.trim() ? `@${displayName} ${args.trim()}` : `@${displayName} `

/** 一条消息里是否 @ 了多个角色（args 里第二个有效 @ 也算） */
export const hasMultipleRoleMentions = (text: string, users: UserEntry[]): boolean => {
  const t = text.trim()
  if (!t) return false
  const mention = parseCommittedRoleMention(text, users)
  if (!mention) return (t.match(/@/g) ?? []).length > 1
  const at = mention.args.indexOf('@')
  if (at < 0) return false
  return parseCommittedRoleMention(mention.args.slice(at), users) !== null
}

/** @选定角色后，正文中不允许再出现 @ */
export const sanitizeRoleMentionArgs = (args: string): string => args.replace(/@/g, '')

/** 内置/绑定命令的角色：解析要执行的斜杠命令 slug */
export const resolveRoleCommandSlug = (user: UserEntry, args: string): string | undefined => {
  const slugs = effectiveUserSkillSlugs(user)
  if (!slugs.length) return undefined
  if (slugs.length === 1) return slugs[0]
  const trimmed = args.trim()
  if (!trimmed) return slugs[0]
  const first = trimmed.split(/\s+/)[0]!.toLowerCase()
  if (slugs.includes(first)) return first
  if (first.startsWith('/') && slugs.includes(first.slice(1))) return first.slice(1)
  return slugs[0]
}

/** 多命令角色时，去掉 args 开头的命令名，保留用户补充说明 */
export const stripRoleCommandPrefix = (args: string, slug: string, allSlugs: string[]): string => {
  let rest = args.trim()
  if (!rest) return ''
  const first = rest.split(/\s+/)[0]!.toLowerCase()
  const slugLower = slug.toLowerCase()
  if (first === slugLower || first === `/${slugLower}`) {
    rest = rest.slice(rest.indexOf(first) + first.length).trimStart()
  }
  return rest
}

export const buildRoleCommandPromptText = (commandText: string, userNotes: string): string => {
  const base = commandText.trim()
  const notes = userNotes.trim()
  return notes ? `${base}\n\n---\n\nUser notes:\n${notes}` : base
}
