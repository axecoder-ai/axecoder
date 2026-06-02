import { listUsers } from '../users-store'
import type { UserEntry } from '../users-types'
import { parseManagerStepPlan, parseManagerVerifyDecision } from './workshop-plan-parse'
import { roleDefById } from './workshop-roles'
import {
  findUserById,
  findUserForWorkshopRole,
  inferWorkshopRoleId,
} from './workshop-user-bind'
import type {
  RoleSpeaker,
  RoleSpeakInput,
  RoleSpeakOutput,
  WorkshopMessage,
  WorkshopPhase,
  WorkshopRoleId,
  WorkshopRunResult,
  WorkshopSession,
  WorkshopStep,
} from './workshop-types'

const msgId = () => `wm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const API_ROLE_PAD_TEXT = 'continue'

const MAX_REDO_PER_STEP = 2

/** Workshop 角色 → LLM API 角色；system 不参与交替 */
export const workshopApiRole = (
  roleId: WorkshopRoleId,
): 'user' | 'assistant' | null => {
  if (roleId === 'user') return 'user'
  if (roleId === 'manager' || roleId === 'backend' || roleId === 'frontend' || roleId === 'tester') {
    return 'assistant'
  }
  return null
}

const lastWorkshopApiRole = (session: WorkshopSession): 'user' | 'assistant' | null => {
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i]
    if (m.hidden || m.kind === 'reasoning') continue
    const r = workshopApiRole(m.roleId)
    if (r) return r
  }
  return null
}

const pushHiddenApiRolePad = (session: WorkshopSession) => {
  session.messages.push({
    id: msgId(),
    roleId: 'user',
    text: API_ROLE_PAD_TEXT,
    createdAt: Date.now(),
    hidden: true,
  })
  session.updatedAt = Date.now()
}

const lastVisibleUserText = (session: WorkshopSession) => {
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i]
    if (!m.hidden && m.roleId === 'user') return m.text
  }
  return null
}

const pushMessage = (
  session: WorkshopSession,
  roleId: WorkshopMessage['roleId'],
  text: string,
  opts?: {
    relatedFiles?: string[]
    hidden?: boolean
    reasoningContent?: string
    speakerUserId?: string
  },
) => {
  const hidden = opts?.hidden
  if (!hidden) {
    const incoming = workshopApiRole(roleId)
    const last = lastWorkshopApiRole(session)
    if (incoming && last && incoming === last) {
      pushHiddenApiRolePad(session)
    }
  }
  session.messages.push({
    id: msgId(),
    roleId,
    text,
    relatedFiles: opts?.relatedFiles,
    createdAt: Date.now(),
    hidden,
    speakerUserId: opts?.speakerUserId,
    ...(opts?.reasoningContent?.trim() ? { reasoningContent: opts.reasoningContent.trim() } : {}),
  })
  session.updatedAt = Date.now()
  if (opts?.relatedFiles?.length) {
    for (const f of opts.relatedFiles) {
      if (!session.mountedFiles.includes(f)) session.mountedFiles.push(f)
    }
  }
}

const priorSummary = (session: WorkshopSession) => {
  const parts: string[] = []
  for (const m of session.messages) {
    if (m.hidden || m.kind === 'reasoning') continue
    if (m.roleId === 'system') continue
    if (m.roleId === 'user') {
      parts.push(`user: ${m.text}`)
      continue
    }
    const who = m.speakerUserId ? `assignee:${m.speakerUserId}` : m.roleId
    parts.push(`${who}: ${m.text}`)
  }
  return parts.join('\n')
}

/** @deprecated 旧固定流水线；单测保留 */
export const nextEmployeePhase = (phase: WorkshopPhase): WorkshopPhase | null => {
  const order: WorkshopPhase[] = ['manager', 'backend', 'frontend', 'tester']
  if (phase === 'idle' || phase === 'waiting_user' || phase === 'done') return 'manager'
  const idx = order.indexOf(phase)
  if (idx < 0) return null
  if (idx >= order.length - 1) return 'done'
  return order[idx + 1]
}

const scriptedPlanJson = (users: UserEntry[]) => {
  const pick = (hint: string) =>
    users.find((u) => !u.isBuiltin && u.role.includes(hint))?.id ?? users.find((u) => !u.isBuiltin)?.id
  const backend = pick('后端') ?? 'u-backend'
  const frontend = pick('前端') ?? 'u-frontend'
  const tester = pick('测试') ?? 'u-tester'
  return JSON.stringify({
    steps: [
      { id: 's1', title: '后端 API 与数据模型', assigneeUserId: backend },
      { id: 's2', title: '前端页面与交互', assigneeUserId: frontend },
      { id: 's3', title: '测试用例与冒烟', assigneeUserId: tester },
    ],
  })
}

export const scriptedRoleSpeaker: RoleSpeaker = async (input: RoleSpeakInput) => {
  const brief = input.userBrief.slice(0, 80)
  if (input.speakMode === 'plan') {
    const users = (input as RoleSpeakInput & { _users?: UserEntry[] })._users
    const json = users?.length ? scriptedPlanJson(users) : scriptedPlanJson([])
    const userLines = input.priorSummary.split('\n').filter((l) => l.startsWith('user:'))
    const block = `\`\`\`json\n${json}\n\`\`\``
    return {
      summary: `已拆分任务。\n${block}`,
      planSource: block,
      needsUser:
        (brief.includes('?') || brief.includes('？')) && userLines.length <= 1,
      userQuestion: '请补充验收标准与优先级？',
      relatedFiles: ['docs/requirements.md'],
    }
  }
  if (input.speakMode === 'verify') {
    if (input.stepOutput?.includes('REDO_ME')) {
      return { summary: 'VERIFY: redo\n产出未达验收，请按评论修改。' }
    }
    return { summary: 'VERIFY: approve\n本步通过，可进入下一步。' }
  }
  if (input.speakMode === 'execute' && input.assigneeUser) {
    const name = input.assigneeUser.displayName
    return {
      summary: `${name} 完成「${input.step?.title ?? '本步'}」：针对「${brief}」的交付说明。`,
      relatedFiles: ['src/api/handler.ts'],
    }
  }
  if (input.roleId === 'manager') {
    return {
      summary: `已分析需求「${brief}」。`,
      needsUser: brief.includes('?') || brief.includes('？'),
      userQuestion: '请补充验收标准与优先级？',
    }
  }
  return { summary: `${input.roleId}：针对「${brief}」的说明。` }
}

const runSpeaker = async (
  session: WorkshopSession,
  input: RoleSpeakInput,
  speaker: RoleSpeaker,
  onProgress?: (status: 'thinking' | 'speaking' | 'done') => void,
): Promise<RoleSpeakOutput | { error: string }> => {
  onProgress?.('thinking')
  try {
    const out = await speaker(input)
    onProgress?.('speaking')
    onProgress?.('done')
    return out
  } catch (e) {
    return { error: e instanceof Error ? e.message : '角色发言失败' }
  }
}

const runManagerPlan = async (
  session: WorkshopSession,
  users: UserEntry[],
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopRoleId, status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  session.phase = 'planning'
  const basePlanInput: RoleSpeakInput = {
    roleId: 'manager',
    userBrief: session.userBrief,
    priorSummary: priorSummary(session),
    speakMode: 'plan',
    users,
  }
  const wrappedSpeaker =
    speaker === scriptedRoleSpeaker
      ? async (inp: RoleSpeakInput) =>
          scriptedRoleSpeaker({ ...inp, ...({ _users: users } as object) })
      : speaker
  let out = await runSpeaker(session, basePlanInput, wrappedSpeaker, (st) =>
    onProgress?.('manager', st),
  )
  if ('error' in out) return { ok: false, error: out.error }
  let parsed = parseManagerStepPlan(out.planSource ?? out.summary, users)
  if (!parsed.ok && speaker !== scriptedRoleSpeaker) {
    out = await runSpeaker(
      session,
      { ...basePlanInput, forcePlanJson: true, priorSummary: `${basePlanInput.priorSummary}\nuser: 请只输出 JSON 步骤计划`.trim() },
      wrappedSpeaker,
      (st) => onProgress?.('manager', st),
    )
    if ('error' in out) return { ok: false, error: out.error }
    parsed = parseManagerStepPlan(out.planSource ?? out.summary, users)
  }
  pushMessage(session, 'manager', out.summary.trim() || '（无计划）')
  if (out.needsUser && out.userQuestion?.trim()) {
    session.phase = 'waiting_user'
    session.pendingQuestion = out.userQuestion.trim()
    return { ok: true, session }
  }
  if (!parsed.ok) {
    pushMessage(session, 'system', `步骤计划无效：${parsed.error}`)
    session.phase = 'done'
    return { ok: false, error: parsed.error }
  }
  session.stepPlan = parsed.plan.steps
  session.currentStepIndex = 0
  pushMessage(session, 'system', `已确认 ${session.stepPlan.length} 个协作步骤，开始逐步执行。`)
  return runStepLoop(session, users, speaker, onProgress)
}

const runOneStepExecute = async (
  session: WorkshopSession,
  step: WorkshopStep,
  assignee: UserEntry,
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopRoleId, status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult & { output?: string }> => {
  const roleId = inferWorkshopRoleId(assignee)
  session.phase = 'step_running'
  step.status = 'running'
  const speakInput: RoleSpeakInput = {
    roleId,
    userBrief: session.userBrief,
    priorSummary: priorSummary(session),
    speakMode: 'execute',
    step,
    assigneeUser: assignee,
  }
  const out = await runSpeaker(session, speakInput, speaker, (st) => onProgress?.(roleId, st))
  if ('error' in out) return { ok: false, error: out.error }
  const summary = out.summary.trim() || '（无结论）'
  pushMessage(session, roleId, summary, {
    relatedFiles: out.relatedFiles,
    reasoningContent: out.reasoningContent,
    speakerUserId: assignee.id,
  })
  if (out.needsUser && out.userQuestion?.trim()) {
    session.phase = 'waiting_user'
    session.pendingQuestion = out.userQuestion.trim()
    return { ok: true, session, output: summary }
  }
  step.status = 'done'
  return { ok: true, session, output: summary }
}

const runManagerVerify = async (
  session: WorkshopSession,
  step: WorkshopStep,
  stepOutput: string,
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopRoleId, status: 'thinking' | 'speaking' | 'done') => void,
): Promise<{ ok: true; action: 'approve' | 'redo' | 'abort' } | { ok: false; error: string }> => {
  session.phase = 'step_verify'
  const speakInput: RoleSpeakInput = {
    roleId: 'manager',
    userBrief: session.userBrief,
    priorSummary: priorSummary(session),
    speakMode: 'verify',
    step,
    stepOutput,
  }
  const out = await runSpeaker(session, speakInput, speaker, (st) => onProgress?.('manager', st))
  if ('error' in out) return { ok: false, error: out.error }
  pushMessage(session, 'manager', out.summary.trim() || 'VERIFY: approve')
  const decision = parseManagerVerifyDecision(out.summary)
  return { ok: true, action: decision.action }
}

const runStepLoop = async (
  session: WorkshopSession,
  users: UserEntry[],
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopRoleId, status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  const plan = session.stepPlan
  if (!plan?.length) {
    session.phase = 'done'
    return { ok: true, session }
  }
  let idx = session.currentStepIndex ?? 0
  while (idx < plan.length) {
    session.currentStepIndex = idx
    const step = plan[idx]
    const assignee = findUserById(users, step.assigneeUserId)
    if (!assignee) {
      pushMessage(session, 'system', `步骤「${step.title}」执行人不存在，已跳过。`)
      step.status = 'done'
      idx++
      continue
    }
    let redoCount = 0
    let stepOutput = ''
    for (;;) {
      const exec = await runOneStepExecute(session, step, assignee, speaker, onProgress)
      if (!exec.ok) return exec
      if (session.phase === 'waiting_user') return { ok: true, session }
      stepOutput = exec.output ?? ''
      const verify = await runManagerVerify(session, step, stepOutput, speaker, onProgress)
      if (!verify.ok) return { ok: false, error: verify.error }
      if (verify.action === 'abort') {
        pushMessage(session, 'system', '技术经理终止本轮协作。')
        session.phase = 'done'
        return { ok: true, session }
      }
      if (verify.action === 'redo') {
        redoCount++
        if (redoCount > MAX_REDO_PER_STEP) {
          pushMessage(session, 'system', `步骤「${step.title}」重做次数已达上限，强制通过。`)
          break
        }
        step.status = 'redo'
        pushMessage(session, 'system', `技术经理要求重做步骤「${step.title}」。`)
        continue
      }
      break
    }
    step.status = 'done'
    const name = assignee.displayName.trim() || assignee.role
    pushMessage(session, 'system', `步骤「${step.title}」已由 ${name} 完成并通过验收。`)
    idx++
  }
  session.currentStepIndex = plan.length
  session.phase = 'done'
  session.pendingQuestion = undefined
  pushMessage(session, 'system', '全部协作步骤已完成。')
  return { ok: true, session }
}

export const startWorkshopRun = async (
  session: WorkshopSession,
  userBrief: string,
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopRoleId, status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  session.userBrief = userBrief.trim()
  if (!session.userBrief) return { ok: false, error: '请输入任务描述' }
  if (lastVisibleUserText(session) !== session.userBrief) {
    pushMessage(session, 'user', session.userBrief)
  }
  session.pendingQuestion = undefined
  session.stepPlan = undefined
  session.currentStepIndex = 0
  const usersFile = await listUsers()
  return runManagerPlan(session, usersFile.users, speaker, onProgress)
}

export const answerWorkshopQuestion = async (
  session: WorkshopSession,
  answer: string,
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopRoleId, status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  const text = answer.trim()
  if (!text) return { ok: false, error: '请输入回答' }
  if (session.phase !== 'waiting_user') {
    return { ok: false, error: '当前无需回答' }
  }
  if (lastVisibleUserText(session) !== text) {
    pushMessage(session, 'user', text)
  }
  session.pendingQuestion = undefined
  const usersFile = await listUsers()
  const users = usersFile.users
  if (!session.stepPlan?.length) {
    return runManagerPlan(session, users, speaker, onProgress)
  }
  const idx = session.currentStepIndex ?? 0
  const step = session.stepPlan[idx]
  if (step) {
    const assignee = findUserById(users, step.assigneeUserId)
    if (assignee) {
      pushMessage(session, 'system', '已收到澄清，继续当前步骤。')
      const exec = await runOneStepExecute(session, step, assignee, speaker, onProgress)
      if (!exec.ok) return exec
      if (session.phase === 'waiting_user') return { ok: true, session }
      const verify = await runManagerVerify(session, step, exec.output ?? '', speaker, onProgress)
      if (!verify.ok) return { ok: false, error: verify.error }
      if (verify.action === 'abort') {
        session.phase = 'done'
        return { ok: true, session }
      }
      if (verify.action === 'redo') {
        pushMessage(session, 'system', `技术经理要求重做步骤「${step.title}」。`)
        const again = await runOneStepExecute(session, step, assignee, speaker, onProgress)
        if (!again.ok) return again
      }
      step.status = 'done'
      session.currentStepIndex = idx + 1
    }
  }
  return runStepLoop(session, users, speaker, onProgress)
}

/** 旧版：未绑定角色跳过（兼容引用） */
export const runOneRole = async (
  session: WorkshopSession,
  roleId: 'manager' | 'backend' | 'frontend' | 'tester',
  speaker: RoleSpeaker,
  onProgress?: (status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  const usersFile = await listUsers()
  const bound = findUserForWorkshopRole(usersFile.users, roleId)
  if (!bound) {
    const name = roleDefById(roleId)?.name ?? roleId
    pushMessage(session, 'system', `${name} 未在 users.json 绑定，已跳过。`)
    return { ok: true, session }
  }
  const res = await runOneStepExecute(
    session,
    { id: roleId, title: roleId, assigneeUserId: bound.id, status: 'pending' },
    bound,
    speaker,
    (st) => onProgress?.(st),
  )
  return res.ok ? { ok: true, session } : res
}
