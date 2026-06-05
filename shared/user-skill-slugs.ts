/** 与 builtin-workflow-roles 中岗位标题 / builtinRole 对齐 */
export const ROLE_TITLE_SKILL_SLUGS: Record<string, string[]> = {
  'tech lead': [],
  'product analyst': ['clarify'],
  researcher: ['research-codebase'],
  architect: ['make-proposals', 'create-proposals'],
  planner: ['make-plan', 'create-plan'],
  developer: ['implement'],
  reviewer: ['code-review'],
}

export const BUILTIN_ROLE_SKILL_SLUGS: Record<string, string[]> = {
  manager: [],
  product_analyst: ['clarify'],
  researcher: ['research-codebase'],
  architect: ['make-proposals', 'create-proposals'],
  planner: ['make-plan', 'create-plan'],
  developer: ['implement'],
  reviewer: ['code-review'],
}

export type SkillSlugUser = {
  skillSlugs?: string[]
  role?: string
  builtinRole?: string
}

/** 显式 skillSlugs 优先；否则按 builtinRole / 岗位名继承内置工作流命令 */
export const effectiveUserSkillSlugs = (user: SkillSlugUser): string[] => {
  const own = (user.skillSlugs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (own.length) return own
  const br = user.builtinRole?.trim()
  if (br && BUILTIN_ROLE_SKILL_SLUGS[br]?.length) return [...BUILTIN_ROLE_SKILL_SLUGS[br]]
  const roleKey = (user.role ?? '').trim().toLowerCase()
  if (roleKey && ROLE_TITLE_SKILL_SLUGS[roleKey]?.length) return [...ROLE_TITLE_SKILL_SLUGS[roleKey]]
  return []
}
