export type SkillScope = 'user' | 'project' | 'builtin'

export type SkillListItem = {
  scope: SkillScope
  folderName: string
  name: string
  description: string
  readOnly: boolean
}

export type SkillDetail = SkillListItem & {
  body: string
}

export type SkillsListResult = {
  skills: SkillListItem[]
  projectRoot: string | null
}

export type SkillSaveInput = {
  scope: 'user' | 'project'
  folderName: string
  name: string
  description: string
  body: string
  projectRoot?: string
  isNew?: boolean
}
