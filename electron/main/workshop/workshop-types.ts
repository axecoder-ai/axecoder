export type WorkshopRoleId = 'manager' | 'backend' | 'frontend' | 'tester' | 'system' | 'user'

export type WorkshopPhase =
  | 'idle'
  | 'manager'
  | 'backend'
  | 'frontend'
  | 'tester'
  | 'waiting_user'
  | 'done'

export type WorkshopMessage = {
  id: string
  roleId: WorkshopRoleId
  text: string
  relatedFiles?: string[]
  createdAt: number
}

export type WorkshopSessionMeta = {
  id: string
  title: string
  updatedAt: number
}

export type WorkshopSession = WorkshopSessionMeta & {
  userBrief: string
  modelId: string
  messages: WorkshopMessage[]
  phase: WorkshopPhase
  pendingQuestion?: string
  mountedFiles: string[]
}

export type WorkshopProgressPayload = {
  workshopId: string
  roleId: WorkshopRoleId
  status: 'thinking' | 'speaking' | 'done'
}

export type RoleSpeakInput = {
  roleId: Exclude<WorkshopRoleId, 'system' | 'user'>
  userBrief: string
  priorSummary: string
}

export type RoleSpeakOutput = {
  summary: string
  needsUser?: boolean
  userQuestion?: string
  relatedFiles?: string[]
}

export type RoleSpeaker = (input: RoleSpeakInput) => Promise<RoleSpeakOutput>

export type WorkshopRunResult =
  | { ok: true; session: WorkshopSession }
  | { ok: false; error: string }
