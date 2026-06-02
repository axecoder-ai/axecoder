export type RuleScope = 'user' | 'project'

export type RuleListItem = {
  scope: RuleScope
  fileName: string
  description: string
  alwaysApply: boolean
  globs?: string
}

export type RuleDetail = RuleListItem & {
  body: string
}

export type RuleSaveInput = {
  scope: RuleScope
  fileName: string
  description: string
  alwaysApply: boolean
  globs?: string
  body: string
  projectRoot?: string
  isNew?: boolean
}

export type RulesListResult = {
  rules: RuleListItem[]
  projectRoot: string | null
}
