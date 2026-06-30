export type SubagentScope = 'user' | 'project' | 'builtin'

export type SubagentListItem = {
  scope: SubagentScope
  fileName: string
  name: string
  description: string
  readOnly: boolean
  model: string
  isBackground: boolean
}

export type SubagentDetail = SubagentListItem & {
  body: string
}

export type SubagentsListResult = {
  subagents: SubagentListItem[]
  projectRoot: string | null
}

export type SubagentSaveInput = {
  scope: 'user' | 'project'
  fileName: string
  name: string
  description: string
  body: string
  readOnly: boolean
  model: string
  isBackground: boolean
  projectRoot?: string
  isNew?: boolean
}
