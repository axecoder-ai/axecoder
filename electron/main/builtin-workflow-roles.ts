import type { BuiltinUserRole, UserEntry } from './users-types'

export type BuiltinWorkflowRoleDef = {
  id: string
  builtinRole: BuiltinUserRole
  displayName: string
  role: string
  expertise: string
  /** 该角色在 Workshop 中仅能使用的工作流斜杠命令 */
  skillSlugs: string[]
}

export const BUILTIN_MANAGER_ID = 'builtin-manager'

/** 内置工作流角色：每人绑定一个或几个斜杠命令，与 Tech Lead 同级不可删 */
export const BUILTIN_WORKFLOW_ROLES: BuiltinWorkflowRoleDef[] = [
  {
    id: BUILTIN_MANAGER_ID,
    builtinRole: 'manager',
    displayName: 'Tech Lead',
    role: 'Tech Lead',
    expertise: 'Requirements breakdown, coordination, technical review',
    skillSlugs: [],
  },
  {
    id: 'builtin-product-analyst',
    builtinRole: 'product_analyst',
    displayName: 'Product Analyst',
    role: 'Product Analyst',
    expertise: 'Requirement clarification, PRD',
    skillSlugs: ['clarify'],
  },
  {
    id: 'builtin-researcher',
    builtinRole: 'researcher',
    displayName: 'Researcher',
    role: 'Researcher',
    expertise: 'Codebase research, as-is documentation',
    skillSlugs: ['research-codebase'],
  },
  {
    id: 'builtin-architect',
    builtinRole: 'architect',
    displayName: 'Architect',
    role: 'Architect',
    expertise: 'Solution proposals, trade-off analysis',
    skillSlugs: ['make-proposals', 'create-proposals'],
  },
  {
    id: 'builtin-planner',
    builtinRole: 'planner',
    displayName: 'Planner',
    role: 'Planner',
    expertise: 'Design docs, executable task breakdown',
    skillSlugs: ['make-plan', 'create-plan'],
  },
  {
    id: 'builtin-developer',
    builtinRole: 'developer',
    displayName: 'Developer',
    role: 'Developer',
    expertise: 'TDD implementation, unit tests',
    skillSlugs: ['implement'],
  },
  {
    id: 'builtin-qa-engineer',
    builtinRole: 'qa_engineer',
    displayName: 'QA Engineer',
    role: 'QA Engineer',
    expertise: 'Unit tests, regression, bug fixes',
    skillSlugs: ['code-review'],
  },
  {
    id: 'builtin-reviewer',
    builtinRole: 'reviewer',
    displayName: 'Reviewer',
    role: 'Reviewer',
    expertise: 'Code review, quality and security',
    skillSlugs: ['code-review'],
  },
]

const defByRole = new Map(BUILTIN_WORKFLOW_ROLES.map((d) => [d.builtinRole, d]))
const defById = new Map(BUILTIN_WORKFLOW_ROLES.map((d) => [d.id, d]))

export const getBuiltinWorkflowRoleDef = (
  key: BuiltinUserRole | string | undefined,
): BuiltinWorkflowRoleDef | undefined => {
  if (!key) return undefined
  return defByRole.get(key as BuiltinUserRole) ?? defById.get(key)
}

export const isBuiltinWorkflowUser = (u: UserEntry | undefined): boolean =>
  Boolean(u?.isBuiltin && u.builtinRole && getBuiltinWorkflowRoleDef(u.builtinRole))

export const seedBuiltinWorkflowUser = (def: BuiltinWorkflowRoleDef): UserEntry => ({
  id: def.id,
  displayName: def.displayName,
  role: def.role,
  expertise: def.expertise,
  avatarPath: '',
  skillSlugs: [...def.skillSlugs],
  isBuiltin: true,
  builtinRole: def.builtinRole,
})
