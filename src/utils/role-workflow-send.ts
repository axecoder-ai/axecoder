import type { UserEntry } from '../types/axecoder'
import { findUserById } from './workshop-user-bind'
import {
  buildRoleCommandPromptText,
  effectiveUserSkillSlugs,
  hasMultipleRoleMentions,
  parseCommittedRoleMention,
  resolveRoleCommandSlug,
  stripRoleCommandPrefix,
  type RoleMentionMatch,
} from './role-mention'

export const ROLE_MENTION_SINGLE_ERROR = '每条消息只能 @ 一个角色。'

export type RoleWorkflowSendPlan =
  | { kind: 'none' }
  | {
      kind: 'workflow'
      slug: string
      prompt: string
      userId: string
      displayName: string
    }
  | { kind: 'error'; message: string }

export const validateRoleMentionText = (
  text: string,
  users: UserEntry[],
): { ok: true } | { ok: false; error: string } => {
  if (hasMultipleRoleMentions(text, users)) {
    return { ok: false, error: ROLE_MENTION_SINGLE_ERROR }
  }
  return { ok: true }
}

/** 与 workshop-user-skills 相同优先级：项目 skill → 内置命令 → 自定义命令 → 内置 skill */
export const loadWorkflowSlugPrompt = async (
  projectRoot: string,
  slug: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const key = slug.trim().toLowerCase()
  if (!key) return { ok: false, error: '空命令名' }

  const root = projectRoot.trim()
  if (root) {
    const skill = await window.axecoder.agentLoadSkill(root, key)
    if (skill.ok && skill.text?.trim()) return { ok: true, text: skill.text }

    const custom = await window.axecoder.agentLoadCustomCommand(root, key)
    if (custom.ok && custom.text?.trim()) return { ok: true, text: custom.text }
  }

  const builtinCmd = await window.axecoder.agentLoadBuiltinCommand(key)
  if (builtinCmd.ok && builtinCmd.text?.trim()) return { ok: true, text: builtinCmd.text }

  const builtinSkill = await window.axecoder.agentLoadBuiltinSkill(key)
  if (builtinSkill.ok && builtinSkill.text?.trim()) return { ok: true, text: builtinSkill.text }

  return { ok: false, error: `无法加载 /${key}` }
}

export const RESEARCH_CODEBASE_WHOLE_REPO_NOTES =
  'Research the entire codebase comprehensively. Cover architecture, main modules, data flows, key dependencies, and the current implementation state. Proceed without asking for a narrower scope.'

/** 工作流无用户补充说明时的默认任务（如 /research-codebase 不带参数） */
export const defaultWorkflowUserNotes = (slug: string, userNotes: string): string => {
  const notes = userNotes.trim()
  if (notes) return notes
  if (slug.trim().toLowerCase() === 'research-codebase') return RESEARCH_CODEBASE_WHOLE_REPO_NOTES
  return ''
}

export const buildWorkflowSendPrompt = (playbookText: string, userNotes: string) =>
  buildRoleCommandPromptText(playbookText, userNotes)

export const prepareRoleWorkflowFromMention = async (
  mention: RoleMentionMatch,
  users: UserEntry[],
  projectRoot: string,
): Promise<RoleWorkflowSendPlan> => {
  const user = findUserById(users, mention.userId)
  if (!user || !effectiveUserSkillSlugs(user).length) return { kind: 'none' }

  const slug = resolveRoleCommandSlug(user, mention.args)
  if (!slug) return { kind: 'none' }

  const loaded = await loadWorkflowSlugPrompt(projectRoot, slug)
  if (!loaded.ok) return { kind: 'error', message: loaded.error }

  const slugs = effectiveUserSkillSlugs(user)
  const userNotes = defaultWorkflowUserNotes(
    slug,
    stripRoleCommandPrefix(mention.args, slug, slugs),
  )
  return {
    kind: 'workflow',
    slug,
    prompt: buildWorkflowSendPrompt(loaded.text, userNotes),
    userId: mention.userId,
    displayName: mention.displayName,
  }
}

export const prepareRoleWorkflowSendPlan = async (
  text: string,
  users: UserEntry[],
  projectRoot: string,
): Promise<RoleWorkflowSendPlan> => {
  const v = validateRoleMentionText(text, users)
  if (!v.ok) return { kind: 'error', message: v.error }

  const mention = parseCommittedRoleMention(text, users)
  if (!mention) return { kind: 'none' }

  return prepareRoleWorkflowFromMention(mention, users, projectRoot)
}
