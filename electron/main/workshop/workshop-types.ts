export type WorkshopRoleId = 'manager' | 'backend' | 'frontend' | 'tester' | 'system' | 'user'

export type WorkshopStepStatus = 'pending' | 'running' | 'done' | 'redo'

export type WorkshopStep = {
  id: string
  title: string
  assigneeUserId: string
  status: WorkshopStepStatus
}

export type WorkshopPhase = 'idle' | 'planning' | 'running' | 'waiting_user' | 'done'

export type WorkshopMessageKind = 'chat' | 'reasoning'

export type WorkshopMessage = {
  id: string
  roleId: WorkshopRoleId
  /** 实际发言人（users.json id），用于步骤执行人展示 */
  speakerUserId?: string
  /** SOP / Message Pool：本条消息由哪个 Action 产生 */
  causeBy?: import('../sop/sop-types').SopActionType
  text: string
  relatedFiles?: string[]
  imageRefs?: import('../chat-attachments').ChatImageRef[]
  /** 用户气泡展示用 data URL（与 imageRefs 一一对应） */
  imagePreviews?: string[]
  createdAt: number
  /** 可折叠思考快照，展示在正文 text 下方 */
  reasoningContent?: string
  /** 发往 LLM 的 API 角色填充，不在 UI 展示 */
  hidden?: boolean
  /** @deprecated 读取时合并进 reasoningContent；新写入不再使用 */
  kind?: WorkshopMessageKind
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
  stepPlan?: WorkshopStep[]
  currentStepIndex?: number
  /** 本轮用户消息附带的图片（发往 LLM 后由 orchestrator 清空） */
  pendingUserImages?: import('../models-types').AiChatImagePart[]
  /** software-company SOP 当前阶段 */
  sopPhase?: import('../sop/sop-types').SopPipelinePhase
  /** SOP 交付物 slug（docs/deliverables/{slug}/） */
  sopSlug?: string
  /** 序列化的 Message Pool */
  sopPoolMessages?: import('../sop/sop-types').SopPoolMessage[]
  /** AskUserQuestion 结构化选项（优先于 pendingQuestion 纯文本） */
  pendingAsks?: import('../agent/agent-types').PendingAskUserPublic[]
}

export type WorkshopProgressPayload = {
  workshopId: string
  roleId: WorkshopRoleId
  status: 'thinking' | 'speaking' | 'done'
  /** 实际发言人 users.json id，避免 roleId=backend 时 UI 误匹配到第一个 backend 角色 */
  speakerUserId?: string
}

export type WorkshopProgressHandler = (
  roleId: WorkshopProgressPayload['roleId'],
  status: WorkshopProgressPayload['status'],
  speakerUserId?: string,
) => void

export type RoleSpeakMode = 'member' | 'manager_chat' | 'plan' | 'execute' | 'verify'

export type RoleSpeakInput = {
  roleId: Exclude<WorkshopRoleId, 'system' | 'user'>
  userBrief: string
  priorSummary: string
  speakMode?: RoleSpeakMode
  step?: WorkshopStep
  assigneeUser?: import('../users-types').UserEntry
  stepOutput?: string
  users?: import('../users-types').UserEntry[]
  /** 计划 JSON parse failed时要求模型只Output JSON */
  forcePlanJson?: boolean
  /** Member绑定的 Skill / 命令正文块（由 speaker 层解析后填入） */
  skillPromptBlock?: string
  /** software-company SOP 当前阶段 */
  sopPhase?: import('../sop/sop-types').SopPipelinePhase
  sopAction?: import('../sop/sop-types').SopActionType
  /** Message Pool 订阅上下文 */
  poolContext?: string
}

export type RoleSpeakOutput = {
  summary: string
  /** 供 parseManagerStepPlan 使用，通常为模型完整 report */
  planSource?: string
  /** 可折叠思考；群聊正文仅展示 summary */
  reasoningContent?: string
  needsUser?: boolean
  userQuestion?: string
  pendingAsks?: import('../agent/agent-types').PendingAskUserPublic[]
  relatedFiles?: string[]
}

export type RoleSpeaker = (input: RoleSpeakInput) => Promise<RoleSpeakOutput>

export type WorkshopRunResult =
  | { ok: true; session: WorkshopSession }
  | { ok: false; error: string }
