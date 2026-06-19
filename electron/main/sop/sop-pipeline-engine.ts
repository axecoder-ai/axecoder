import fs from 'node:fs/promises'
import path from 'node:path'
import { listUsers } from '../users-store'
import type { UserEntry } from '../users-types'
import { hydrateMessagePool, MessagePool } from './message-pool'
import { runQaLoop } from './qa-loop'
import { nextRunnablePhase } from './sop-action-graph'
import { classifySopIntent, type SopIntent } from './sop-intent'
import { runProjectTests } from './sop-test-runner'
import { parseTasksFromBody, runTasksImplementLoop } from './sop-task-runner'
import { shouldTriggerSopCodeRecovery, validateImplementOnDisk, validateSopGate, projectHasApplicationSource } from './sop-gates'
import { artifactBodyForGate, extractClarifyQuestion } from './sop-artifact'
import { designToMarkdown } from './schemas/design'
import { prdToMarkdown } from './schemas/prd'
import { tasksToMarkdown } from './schemas/tasks'
import {
  nextSopPhase,
  slugFromBrief,
  sopPhaseDef,
  type SopPipelinePhase,
  type SopPoolMessage,
} from './sop-types'
import type {
  RoleSpeaker,
  WorkshopMessage,
  WorkshopProgressHandler,
  WorkshopRunResult,
  WorkshopSession,
} from '../workshop/workshop-types'
import { inferWorkshopRoleId } from '../workshop/workshop-user-bind'

const resolvePendingQuestion = (
  phase: SopPipelinePhase,
  artifactBody: string,
  userQuestion?: string,
): string => {
  if (userQuestion?.trim()) return userQuestion.trim()
  const q = extractClarifyQuestion(artifactBody)
  if (q) return q
  if (phase === 'prd') {
    return '请在下框补充：积分商城要做哪些功能？必须用到哪些 Redis 数据结构？（Product Analyst 尚未给出具体问题时可先直接描述需求）'
  }
  return `请补充 ${phase} 阶段所需信息。`
}

export type SendSopPipelineOptions = {
  displayText?: string
  projectRoot?: string
  /** QA 跑测注入（真实环境由 speaker 调 shell；单测用 mock） */
  runTests?: () => Promise<{ ok: boolean; output: string }>
}

const findBuiltin = (users: UserEntry[], role: UserEntry['builtinRole']): UserEntry | undefined =>
  users.find((u) => u.isBuiltin && u.builtinRole === role)

const artifactFileName = (kind: string) => `sop-${kind}.json`

const pushChat = (
  session: WorkshopSession,
  roleId: WorkshopMessage['roleId'],
  text: string,
  extra?: Partial<Pick<WorkshopMessage, 'relatedFiles' | 'reasoningContent' | 'speakerUserId' | 'causeBy'>>,
) => {
  session.messages.push({
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roleId,
    text,
    createdAt: Date.now(),
    ...extra,
  })
  session.updatedAt = Date.now()
}

const writeArtifact = async (
  projectRoot: string,
  slug: string,
  kind: string,
  jsonBody: string,
  mdBody: string,
): Promise<string> => {
  const dir = path.join(projectRoot, 'docs', 'deliverables', slug, '_artifacts')
  await fs.mkdir(dir, { recursive: true })
  const base = artifactFileName(kind)
  const jsonPath = path.join(dir, base)
  const mdPath = path.join(dir, base.replace('.json', '.md'))
  await fs.writeFile(jsonPath, jsonBody, 'utf-8')
  await fs.writeFile(mdPath, mdBody, 'utf-8')
  return path.relative(projectRoot, jsonPath)
}

const runRolePhase = async (
  session: WorkshopSession,
  pool: MessagePool,
  user: UserEntry,
  phase: SopPipelinePhase,
  speaker: RoleSpeaker,
  onProgress?: WorkshopProgressHandler,
): Promise<
  | { ok: true; artifactBody: string; relatedFiles?: string[] }
  | { ok: true; waiting: true }
  | { ok: false; error: string }
> => {
  const def = sopPhaseDef(phase)
  if (!def) return { ok: false, error: `Unknown SOP phase: ${phase}` }

  const roleId = inferWorkshopRoleId(user)
  onProgress?.(roleId, 'thinking', user.id)
  const poolContext = pool.contextForWatch(def.watch)
  const inp = {
    roleId,
    userBrief: session.userBrief,
    priorSummary: poolContext || session.userBrief,
    speakMode: 'member' as const,
    assigneeUser: user,
    sopPhase: phase,
    sopAction: def.action,
    poolContext,
  }
  onProgress?.(roleId, 'speaking', user.id)
  const out = await speaker(inp)
  onProgress?.(roleId, 'done', user.id)

  const body = artifactBodyForGate(out.summary, out.reasoningContent, out.planSource)

  if (out.needsUser && (out.pendingAsks?.length || out.userQuestion?.trim())) {
    pool.publish({
      causeBy: def.action,
      phase,
      speakerUserId: user.id,
      content: out.summary.trim() || body,
    })
    pushChat(session, roleId, out.summary.trim() || body, {
      speakerUserId: user.id,
      reasoningContent: out.reasoningContent,
      relatedFiles: out.relatedFiles,
      causeBy: def.action,
    })
    session.phase = 'waiting_user'
    session.pendingAsks = out.pendingAsks?.length ? out.pendingAsks : undefined
    session.pendingQuestion = session.pendingAsks
      ? undefined
      : resolvePendingQuestion(phase, body, out.userQuestion)
    session.sopPhase = phase
    session.sopPoolMessages = pool.toJSON()
    return { ok: true, waiting: true }
  }

  pool.publish({
    causeBy: def.action,
    phase,
    speakerUserId: user.id,
    content: out.summary.trim() || body,
  })

  pushChat(session, roleId, out.summary.trim() || body, {
    speakerUserId: user.id,
    reasoningContent: out.reasoningContent,
    relatedFiles: out.relatedFiles,
    causeBy: def.action,
  })

  return { ok: true, artifactBody: body, relatedFiles: out.relatedFiles }
}

const artifactRelPath = (slug: string, kind: string) =>
  path.join('docs', 'deliverables', slug, '_artifacts', artifactFileName(kind))

const loadTasksBody = async (
  projectRoot: string,
  slug: string,
  pool: MessagePool,
): Promise<string | null> => {
  const last = pool.subscribe(['WriteTasks']).slice(-1)[0]
  if (last?.artifactPath && projectRoot) {
    try {
      return await fs.readFile(path.join(projectRoot, last.artifactPath), 'utf-8')
    } catch {
      /* fall through */
    }
  }
  if (last?.content?.trim()) return last.content
  if (projectRoot) {
    try {
      return await fs.readFile(path.join(projectRoot, artifactRelPath(slug, 'tasks')), 'utf-8')
    } catch {
      /* missing */
    }
  }
  return null
}

const collectArtifactPaths = (slug: string): string[] => [
  artifactRelPath(slug, 'prd'),
  artifactRelPath(slug, 'design'),
  artifactRelPath(slug, 'tasks'),
]

const runPipelineFromPhase = async (
  session: WorkshopSession,
  pool: MessagePool,
  users: UserEntry[],
  speaker: RoleSpeaker,
  projectRoot: string,
  startPhase: SopPipelinePhase,
  onProgress?: WorkshopProgressHandler,
  options?: SendSopPipelineOptions,
): Promise<WorkshopRunResult> => {
  let phase: SopPipelinePhase | null = startPhase
  const slug = session.sopSlug || slugFromBrief(session.userBrief)
  const intent: SopIntent = session.sopIntent ?? 'greenfield'

  while (phase && phase !== 'done') {
    session.sopPhase = phase

    if (phase === 'qa') {
      const qaUser = findBuiltin(users, 'qa_engineer')
      if (!qaUser) {
        pushChat(session, 'system', 'QA Engineer role missing')
        session.phase = 'done'
        session.sopPhase = 'done'
        return { ok: true, session }
      }

      const runTests =
        options?.runTests ??
        (async () => {
          if (projectRoot.trim()) {
            const shell = await runProjectTests(projectRoot)
            if (!shell.command.startsWith('echo')) {
              return { ok: shell.ok, output: `${shell.command}\n${shell.output}` }
            }
          }
          const r = await runRolePhase(session, pool, qaUser, 'qa', speaker, onProgress)
          if (!r.ok) return { ok: false, output: r.error }
          const passed = validateSopGate('qa', r.artifactBody).ok
          return { ok: passed, output: r.artifactBody }
        })

      const dev = findBuiltin(users, 'developer')
      const qaResult = await runQaLoop({
        maxRounds: 3,
        runTests,
        fixBug: async (round, testOutput) => {
          if (!dev) return 'no developer'
          pushChat(session, 'system', `QA round ${round} failed, developer fixing…`, { hidden: true })
          const fixSpeaker: RoleSpeaker = async (inp) =>
            speaker({
              ...inp,
              priorSummary: `Test failures:\n${testOutput}`,
              sopPhase: 'implement',
            })
          const fix = await runRolePhase(session, pool, dev, 'implement', fixSpeaker, onProgress)
          return fix.ok ? fix.artifactBody : fix.error
        },
      })

      const report = JSON.stringify(
        { passed: qaResult.passed, rounds: qaResult.rounds },
        null,
        2,
      )
      if (projectRoot) {
        const rel = await writeArtifact(
          projectRoot,
          slug,
          'qa-report',
          report,
          qaResult.passed ? 'All tests passed.' : `QA failed after ${qaResult.rounds.length} round(s).`,
        )
        pool.publish({
          causeBy: 'RunQA',
          phase: 'qa',
          content: qaResult.passed ? 'QA passed' : 'QA failed',
          artifactPath: rel,
        })
      }

      if (!qaResult.passed) {
        pushChat(session, 'system', 'QA loop did not pass; pipeline halted.')
        session.phase = 'done'
        session.sopPhase = 'done'
        return { ok: true, session }
      }

      phase = 'done'
      continue
    }

    if (phase === 'implement') {
      const dev = findBuiltin(users, 'developer')
      if (!dev) {
        pushChat(session, 'system', 'Developer role missing')
        session.phase = 'done'
        session.sopPhase = 'done'
        return { ok: true, session }
      }
      const tasksBody = await loadTasksBody(projectRoot, slug, pool)
      const tasksDoc = tasksBody ? parseTasksFromBody(tasksBody) : null
      if (!tasksDoc) {
        const ran = await runRolePhase(session, pool, dev, 'implement', speaker, onProgress)
        if ('waiting' in ran && ran.waiting) {
          session.sopPoolMessages = pool.toJSON()
          return { ok: true, session }
        }
        if (!ran.ok) return { ok: false, error: ran.error }
        const gate = validateSopGate('implement', ran.artifactBody)
        const implGate =
          gate.ok && projectRoot
            ? await validateImplementOnDisk(ran.relatedFiles, projectRoot)
            : gate
        if (!implGate.ok) {
          session.phase = 'waiting_user'
          session.pendingQuestion = implGate.error || resolvePendingQuestion('implement', ran.artifactBody)
          session.sopPhase = 'implement'
          session.sopPoolMessages = pool.toJSON()
          return { ok: true, session }
        }
        pool.publish({
          causeBy: 'WriteCode',
          phase: 'implement',
          speakerUserId: dev.id,
          content: ran.artifactBody.slice(0, 4000),
        })
        phase = nextRunnablePhase('implement', pool, intent)
        continue
      }

      const impl = await runTasksImplementLoop({
        session,
        pool,
        developer: dev,
        speaker,
        tasksDoc,
        artifactPaths: projectRoot ? collectArtifactPaths(slug) : undefined,
        projectRoot,
        onProgress,
        runTests: options?.runTests,
        pushChat,
      })
      if ('waiting' in impl && impl.waiting) {
        session.sopPoolMessages = pool.toJSON()
        return { ok: true, session }
      }
      if (!impl.ok) return { ok: false, error: impl.error }

      const implGate = projectRoot
        ? await validateImplementOnDisk(impl.relatedFiles, projectRoot)
        : { ok: true as const }
      if (!implGate.ok) {
        session.phase = 'waiting_user'
        session.pendingQuestion = implGate.error || resolvePendingQuestion('implement', impl.summary)
        session.sopPhase = 'implement'
        pushChat(session, 'system', `SOP 暂停（implement）：${implGate.error}`, { hidden: true })
        session.sopPoolMessages = pool.toJSON()
        return { ok: true, session }
      }

      pool.publish({
        causeBy: 'WriteCode',
        phase: 'implement',
        speakerUserId: dev.id,
        content: impl.summary.slice(0, 4000),
      })
      session.sopTaskIndex = session.sopTaskTotal
      phase = nextRunnablePhase('implement', pool, intent)
      continue
    }

    const def = sopPhaseDef(phase)
    if (!def) break

    const assignee = findBuiltin(users, def.builtinRole)
    if (!assignee) {
      pushChat(session, 'system', `Missing builtin role: ${def.builtinRole}`)
      session.phase = 'done'
      session.sopPhase = 'done'
      return { ok: true, session }
    }

    const ran = await runRolePhase(session, pool, assignee, phase, speaker, onProgress)
    if ('waiting' in ran && ran.waiting) return { ok: true, session }
    if (!ran.ok) return { ok: false, error: ran.error }

    const gate = validateSopGate(phase, ran.artifactBody)
    const implGate =
      gate.ok && phase === 'implement' && projectRoot
        ? await validateImplementOnDisk(ran.relatedFiles, projectRoot)
        : gate
    if (!implGate.ok) {
      session.phase = 'waiting_user'
      session.pendingAsks = undefined
      session.pendingQuestion = implGate.error || resolvePendingQuestion(phase, ran.artifactBody)
      session.sopPhase = phase
      pushChat(session, 'system', `SOP 暂停（${phase}）：${implGate.error}`, { hidden: true })
      session.sopPoolMessages = pool.toJSON()
      return { ok: true, session }
    }

    if (def.artifact && projectRoot) {
      let jsonBody = ran.artifactBody
      let mdBody = ran.artifactBody
      if (phase === 'prd') {
        try {
          const p = JSON.parse(ran.artifactBody)
          mdBody = prdToMarkdown(p)
        } catch {
          mdBody = ran.artifactBody
          jsonBody = JSON.stringify({ title: session.title, userStories: [ran.artifactBody] })
        }
      } else if (phase === 'design') {
        try {
          const d = JSON.parse(ran.artifactBody)
          mdBody = designToMarkdown(d)
        } catch {
          mdBody = ran.artifactBody
        }
      } else if (phase === 'tasks') {
        try {
          const t = JSON.parse(ran.artifactBody)
          mdBody = tasksToMarkdown(t)
        } catch {
          mdBody = ran.artifactBody
        }
      }
      const rel = await writeArtifact(projectRoot, slug, def.artifact, jsonBody, mdBody)
      const last = pool.all().slice(-1)[0]
      if (last) last.artifactPath = rel
    }

    phase = nextRunnablePhase(phase, pool, intent)
  }

  const manager = findBuiltin(users, 'manager')
  if (manager) {
    const roleId = inferWorkshopRoleId(manager)
    onProgress?.(roleId, 'thinking', manager.id)
    onProgress?.(roleId, 'speaking', manager.id)
    const out = await speaker({
      roleId,
      userBrief: session.userBrief,
      priorSummary: pool.summaryForWatch(['RunQA', 'WriteCode', 'WriteTasks']),
      speakMode: 'member',
      assigneeUser: manager,
      sopPhase: 'done',
      sopAction: 'DeliverSummary',
    })
    onProgress?.(roleId, 'done', manager.id)
    pool.publish({
      causeBy: 'DeliverSummary',
      phase: 'done',
      speakerUserId: manager.id,
      content: out.summary,
    })
    pushChat(session, 'manager', out.summary.trim() || 'Pipeline complete.', {
      speakerUserId: manager.id,
      causeBy: 'DeliverSummary',
      relatedFiles: out.relatedFiles,
      reasoningContent: out.reasoningContent,
    })
  }

  session.sopPhase = 'done'
  session.phase = 'done'
  session.sopPoolMessages = pool.toJSON()
  return { ok: true, session }
}

/** 流水线 done 后：Researcher 审计 → Developer 从 implement 补写 */
const runSopCodeRecovery = async (
  session: WorkshopSession,
  userText: string,
  pool: MessagePool,
  users: UserEntry[],
  speaker: RoleSpeaker,
  projectRoot: string,
  onProgress?: WorkshopProgressHandler,
  options?: SendSopPipelineOptions,
): Promise<WorkshopRunResult> => {
  const developer = findBuiltin(users, 'developer')
  if (!developer) {
    session.phase = 'done'
    session.sopPhase = 'done'
    session.sopPoolMessages = pool.toJSON()
    return { ok: true, session }
  }

  const researcher = findBuiltin(users, 'researcher')
  if (researcher) {
    const researchRoleId = inferWorkshopRoleId(researcher)
    onProgress?.(researchRoleId, 'thinking', researcher.id)
    onProgress?.(researchRoleId, 'speaking', researcher.id)
    const researchOut = await speaker({
      roleId: researchRoleId,
      userBrief: userText,
      priorSummary: pool.summaryForWatch(['WriteCode', 'WriteTasks', 'WriteDesign', 'WritePRD']),
      speakMode: 'member',
      assigneeUser: researcher,
      sopPhase: 'done',
    })
    onProgress?.(researchRoleId, 'done', researcher.id)
    const researchBody = artifactBodyForGate(
      researchOut.summary,
      researchOut.reasoningContent,
      researchOut.planSource,
    )
    pushChat(session, researchRoleId, researchOut.summary.trim() || researchBody, {
      speakerUserId: researcher.id,
      reasoningContent: researchOut.reasoningContent,
      relatedFiles: researchOut.relatedFiles,
      causeBy: 'UserRequirement',
    })
    pool.publish({
      causeBy: 'UserRequirement',
      phase: 'done',
      speakerUserId: researcher.id,
      content: researchOut.summary.trim() || researchBody,
    })
  }

  pushChat(session, 'system', '应用源码缺失，Developer 从 implement 阶段补写…', { hidden: true })
  session.phase = 'running'
  session.sopPhase = 'implement'
  session.sopPoolMessages = pool.toJSON()
  return runPipelineFromPhase(
    session,
    pool,
    users,
    speaker,
    projectRoot,
    'implement',
    onProgress,
    options,
  )
}

/** 流水线 done 后用户追问：缺码则 Researcher+Developer 补写，否则 Tech Lead 直接答 */
const runSopUserFollowUp = async (
  session: WorkshopSession,
  userText: string,
  pool: MessagePool,
  users: UserEntry[],
  speaker: RoleSpeaker,
  onProgress?: WorkshopProgressHandler,
  options?: SendSopPipelineOptions,
): Promise<WorkshopRunResult> => {
  pushChat(session, 'user', options?.displayText?.trim() || userText)
  pool.publish({
    causeBy: 'UserRequirement',
    phase: 'done',
    content: userText,
  })

  const projectRoot = options?.projectRoot?.trim() ?? ''
  if (projectRoot && (await shouldTriggerSopCodeRecovery(userText, projectRoot))) {
    return runSopCodeRecovery(
      session,
      userText,
      pool,
      users,
      speaker,
      projectRoot,
      onProgress,
      options,
    )
  }

  const manager = findBuiltin(users, 'manager')
  if (!manager) {
    session.phase = 'done'
    session.sopPhase = 'done'
    session.sopPoolMessages = pool.toJSON()
    return { ok: true, session }
  }

  const roleId = inferWorkshopRoleId(manager)
  onProgress?.(roleId, 'thinking', manager.id)
  const prior = [
    pool.summaryForWatch(['RunQA', 'WriteCode', 'WriteTasks', 'WritePRD']),
    ...session.messages
      .slice(-8)
      .map((m) => `${m.roleId}: ${m.text.slice(0, 240)}`)
      .filter(Boolean),
  ]
    .filter(Boolean)
    .join('\n')

  onProgress?.(roleId, 'speaking', manager.id)
  const out = await speaker({
    roleId,
    userBrief: userText,
    priorSummary: prior,
    speakMode: 'member',
    assigneeUser: manager,
    sopPhase: 'done',
  })
  onProgress?.(roleId, 'done', manager.id)

  const body = artifactBodyForGate(out.summary, out.reasoningContent, out.planSource)
  pushChat(session, roleId, out.summary.trim() || body, {
    speakerUserId: manager.id,
    reasoningContent: out.reasoningContent,
    relatedFiles: out.relatedFiles,
    causeBy: 'UserRequirement',
  })
  pool.publish({
    causeBy: 'UserRequirement',
    phase: 'done',
    speakerUserId: manager.id,
    content: out.summary.trim() || body,
  })

  session.phase = 'done'
  session.sopPhase = 'done'
  session.sopPoolMessages = pool.toJSON()
  return { ok: true, session }
}

export const sendSopPipelineMessage = async (
  session: WorkshopSession,
  text: string,
  speaker: RoleSpeaker,
  onProgress?: WorkshopProgressHandler,
  options?: SendSopPipelineOptions,
): Promise<WorkshopRunResult> => {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Message cannot be empty' }

  const projectRoot = options?.projectRoot?.trim() ?? ''
  const usersFile = await listUsers()
  const users = usersFile.users

  const pool = hydrateMessagePool(session.sopPoolMessages)

  if (session.phase === 'waiting_user') {
    pushChat(session, 'user', options?.displayText?.trim() || trimmed)
    pool.publish({
      causeBy: 'UserRequirement',
      phase: session.sopPhase ?? 'requirement',
      content: trimmed,
    })
    session.pendingQuestion = undefined
    session.pendingAsks = undefined
    session.phase = 'running'
    session.sopPoolMessages = pool.toJSON()
    const resume = session.sopPhase && session.sopPhase !== 'idle' ? session.sopPhase : 'prd'
    return runPipelineFromPhase(
      session,
      pool,
      users,
      speaker,
      projectRoot,
      resume,
      onProgress,
      options,
    )
  }

  if (session.sopPhase === 'done' || session.phase === 'done') {
    return runSopUserFollowUp(session, trimmed, pool, users, speaker, onProgress, options)
  }

  if (!session.userBrief.trim()) {
    session.userBrief = trimmed
    session.sopSlug = slugFromBrief(trimmed)
    const title = trimmed.slice(0, 24) + (trimmed.length > 24 ? '…' : '')
    if (title) session.title = title
    pushChat(session, 'user', options?.displayText?.trim() || trimmed)
    pool.publish({
      causeBy: 'UserRequirement',
      phase: 'requirement',
      content: trimmed,
    })
    const hasSource = projectRoot ? await projectHasApplicationSource(projectRoot) : false
    session.sopIntent = classifySopIntent(trimmed, hasSource)
  const start =
    session.sopIntent === 'incremental'
      ? 'tasks'
      : 'prd'
    session.sopPhase = start
    session.phase = 'running'
    session.sopPoolMessages = pool.toJSON()
    return runPipelineFromPhase(session, pool, users, speaker, projectRoot, start, onProgress, options)
  }

  pushChat(session, 'user', options?.displayText?.trim() || trimmed)
  const resume = session.sopPhase && session.sopPhase !== 'idle' ? session.sopPhase : 'prd'
  return runPipelineFromPhase(session, pool, users, speaker, projectRoot, resume, onProgress, options)
}

/** 单测用：固定各阶段 JSON 产出 */
export const scriptedSopSpeaker =
  (overrides?: Partial<Record<SopPipelinePhase, string>>): RoleSpeaker =>
  async (inp) => {
    const sample: Record<string, string> = {
      prd: JSON.stringify({
        title: 'Todo',
        userStories: ['As a user I can add todos'],
      }),
      design: JSON.stringify({
        title: 'Todo Design',
        fileList: ['src/todo.ts'],
        apis: [{ name: 'addTodo', description: 'add item' }],
      }),
      tasks: JSON.stringify({
        title: 'Todo Tasks',
        tasks: [
          { id: 't1', title: 'Implement todo store', deps: [] },
          { id: 't2', title: 'Wire API', deps: ['t1'] },
        ],
      }),
      implement: 'Implemented todo module with tests.',
      qa: 'All tests pass.\ngo test ./... ok  4 passed',
      done: 'Delivery complete.',
      ...overrides,
    }
    const key = inp.sopPhase || 'implement'
    const body = sample[key] || 'ok'
    if (inp.assigneeUser?.builtinRole === 'researcher') {
      return {
        summary: '缺源码：仅有 tests/ 与 docs/，无 cmd/ 或 internal/ 应用代码。',
        planSource: body,
      }
    }
    const taskId = inp.sopTaskId
    const relatedFiles =
      key === 'implement'
        ? taskId === 't2'
          ? ['src/todo-api.ts']
          : ['src/todo.ts']
        : undefined
    return { summary: body.slice(0, 120), planSource: body, relatedFiles }
  }
