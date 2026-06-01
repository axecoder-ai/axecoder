import { employeeRoleOrder, systemAckForRole } from './workshop-roles'
import type {
  RoleSpeaker,
  RoleSpeakInput,
  RoleSpeakOutput,
  WorkshopMessage,
  WorkshopPhase,
  WorkshopRunResult,
  WorkshopSession,
} from './workshop-types'

const msgId = () => `wm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const pushMessage = (
  session: WorkshopSession,
  roleId: WorkshopMessage['roleId'],
  text: string,
  relatedFiles?: string[],
) => {
  session.messages.push({
    id: msgId(),
    roleId,
    text,
    relatedFiles,
    createdAt: Date.now(),
  })
  session.updatedAt = Date.now()
  if (relatedFiles?.length) {
    for (const f of relatedFiles) {
      if (!session.mountedFiles.includes(f)) session.mountedFiles.push(f)
    }
  }
}

const priorSummary = (session: WorkshopSession) => {
  const parts: string[] = []
  for (const m of session.messages) {
    if (m.roleId === 'user' || m.roleId === 'system') continue
    parts.push(`${m.roleId}: ${m.text}`)
  }
  return parts.join('\n')
}

export const nextEmployeePhase = (phase: WorkshopPhase): WorkshopPhase | null => {
  if (phase === 'idle' || phase === 'waiting_user' || phase === 'done') return 'manager'
  const idx = employeeRoleOrder.indexOf(phase as (typeof employeeRoleOrder)[number])
  if (idx < 0) return null
  if (idx >= employeeRoleOrder.length - 1) return 'done'
  return employeeRoleOrder[idx + 1]
}

export const scriptedRoleSpeaker: RoleSpeaker = async (input: RoleSpeakInput) => {
  const brief = input.userBrief.slice(0, 80)
  if (input.roleId === 'manager') {
    return {
      summary: `已分析需求「${brief}」，拆分为后端 API、前端页面与测试用例三条线。`,
      needsUser: brief.includes('?') || brief.includes('？'),
      userQuestion: '请补充验收标准与优先级？',
      relatedFiles: ['docs/requirements.md'],
    }
  }
  if (input.roleId === 'backend') {
    return { summary: `后端：为「${brief}」设计 REST API 与数据模型草案。`, relatedFiles: ['src/api/handler.ts'] }
  }
  if (input.roleId === 'frontend') {
    return { summary: `前端：基于 API 契约搭建列表页与表单交互。`, relatedFiles: ['src/components/Feature.vue'] }
  }
  return { summary: `测试：覆盖主流程与边界用例，建议先跑冒烟再回归。`, relatedFiles: ['tests/feature.test.ts'] }
}

const runOneRole = async (
  session: WorkshopSession,
  roleId: (typeof employeeRoleOrder)[number],
  speaker: RoleSpeaker,
  onProgress?: (status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  onProgress?.('thinking')
  session.phase = roleId
  onProgress?.('speaking')
  let out: RoleSpeakOutput
  try {
    out = await speaker({
      roleId,
      userBrief: session.userBrief,
      priorSummary: priorSummary(session),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '角色发言失败'
    return { ok: false, error: msg }
  }
  pushMessage(session, roleId, out.summary.trim() || '（无结论）', out.relatedFiles)
  if (out.needsUser && out.userQuestion?.trim()) {
    session.phase = 'waiting_user'
    session.pendingQuestion = out.userQuestion.trim()
    onProgress?.('done')
    return { ok: true, session }
  }
  pushMessage(session, 'system', systemAckForRole(roleId))
  const next = nextEmployeePhase(roleId)
  session.phase = next === 'done' || next === null ? 'done' : next
  session.pendingQuestion = undefined
  onProgress?.('done')
  return { ok: true, session }
}

export const runWorkshopFromPhase = async (
  session: WorkshopSession,
  speaker: RoleSpeaker,
  onProgress?: (roleId: (typeof employeeRoleOrder)[number], status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  let phase = session.phase
  if (phase === 'idle') phase = 'manager'
  if (phase === 'waiting_user') {
    return { ok: true, session }
  }
  if (phase === 'done') {
    return { ok: true, session }
  }

  const startIdx = employeeRoleOrder.indexOf(phase as (typeof employeeRoleOrder)[number])
  if (startIdx < 0) {
    session.phase = 'manager'
  }

  const from = startIdx >= 0 ? startIdx : 0
  for (let i = from; i < employeeRoleOrder.length; i++) {
    const roleId = employeeRoleOrder[i]
    const res = await runOneRole(session, roleId, speaker, (st) => onProgress?.(roleId, st))
    if (!res.ok) return res
    if (session.phase === 'waiting_user' || session.phase === 'done') {
      return res
    }
  }
  session.phase = 'done'
  return { ok: true, session }
}

export const startWorkshopRun = async (
  session: WorkshopSession,
  userBrief: string,
  speaker: RoleSpeaker,
  onProgress?: (roleId: (typeof employeeRoleOrder)[number], status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  session.userBrief = userBrief.trim()
  if (!session.userBrief) return { ok: false, error: '请输入任务描述' }
  pushMessage(session, 'user', session.userBrief)
  session.phase = 'manager'
  session.pendingQuestion = undefined
  return runWorkshopFromPhase(session, speaker, onProgress)
}

export const answerWorkshopQuestion = async (
  session: WorkshopSession,
  answer: string,
  speaker: RoleSpeaker,
  onProgress?: (roleId: (typeof employeeRoleOrder)[number], status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  const text = answer.trim()
  if (!text) return { ok: false, error: '请输入回答' }
  if (session.phase !== 'waiting_user') {
    return { ok: false, error: '当前无需回答' }
  }
  pushMessage(session, 'user', text)
  session.pendingQuestion = undefined
  let pausedRole: (typeof employeeRoleOrder)[number] = 'manager'
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i]
    if (employeeRoleOrder.includes(m.roleId as (typeof employeeRoleOrder)[number])) {
      pausedRole = m.roleId as (typeof employeeRoleOrder)[number]
      break
    }
  }
  pushMessage(session, 'system', '已收到你的澄清，继续协作。')
  pushMessage(session, 'system', systemAckForRole(pausedRole))
  const next = nextEmployeePhase(pausedRole)
  session.phase = next === 'done' || next === null ? 'done' : next
  if (session.phase === 'done') {
    return { ok: true, session }
  }
  return runWorkshopFromPhase(session, speaker, onProgress)
}
