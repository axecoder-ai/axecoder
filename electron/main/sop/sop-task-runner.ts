import type { SopTaskItem, SopTasks } from './schemas/tasks'
import { parseTasksJson } from './schemas/tasks'
import type { MessagePool } from './message-pool'
import type { SopPipelinePhase } from './sop-types'
import type { RoleSpeaker, WorkshopProgressHandler, WorkshopSession } from '../workshop/workshop-types'
import type { UserEntry } from '../users-types'
import { inferWorkshopRoleId } from '../workshop/workshop-user-bind'
import { runProjectTests, type TestExecFn } from './sop-test-runner'
import { runQaLoop } from './qa-loop'

export const topoSortTasks = (tasks: SopTaskItem[]): SopTaskItem[] => {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const done = new Set<string>()
  const out: SopTaskItem[] = []
  let guard = 0
  while (out.length < tasks.length && guard++ < tasks.length * tasks.length + 2) {
    let progressed = false
    for (const t of tasks) {
      if (done.has(t.id)) continue
      const deps = t.deps ?? []
      if (deps.every((d) => done.has(d))) {
        out.push(t)
        done.add(t.id)
        progressed = true
      }
    }
    if (!progressed) break
  }
  if (out.length < tasks.length) {
    for (const t of tasks) {
      if (!done.has(t.id)) out.push(t)
    }
  }
  return out
}

export const parseTasksFromBody = (body: string): SopTasks | null => {
  const direct = parseTasksJson(body)
  if (direct.ok) return direct.tasks
  const m = body.match(/```json\s*([\s\S]*?)```/i)
  if (m?.[1]) {
    const inner = parseTasksJson(m[1].trim())
    if (inner.ok) return inner.tasks
  }
  return null
}

export type TaskImplementDeps = {
  session: WorkshopSession
  pool: MessagePool
  developer: UserEntry
  speaker: RoleSpeaker
  tasksDoc: SopTasks
  artifactPaths?: string[]
  projectRoot: string
  onProgress?: WorkshopProgressHandler
  runTests?: () => Promise<{ ok: boolean; output: string }>
  testExec?: TestExecFn
  maxFeedbackRounds?: number
  pushChat: (
    session: WorkshopSession,
    roleId: import('../workshop/workshop-types').WorkshopMessage['roleId'],
    text: string,
    extra?: Partial<import('../workshop/workshop-types').WorkshopMessage>,
  ) => void
}

export type TaskImplementResult =
  | { ok: true; relatedFiles: string[]; summary: string }
  | { ok: true; waiting: true }
  | { ok: false; error: string }

/** MetaGPT 式逐 task 实现 + 每 task 可执行反馈 */
export const runTasksImplementLoop = async (deps: TaskImplementDeps): Promise<TaskImplementResult> => {
  const sorted = topoSortTasks(deps.tasksDoc.tasks)
  const allFiles: string[] = []
  const summaries: string[] = []
  const maxFb = deps.maxFeedbackRounds ?? 2
  const roleId = inferWorkshopRoleId(deps.developer)

  deps.session.sopTaskTotal = sorted.length
  deps.session.sopTaskIndex = 0

  for (let i = 0; i < sorted.length; i++) {
    const task = sorted[i]!
    deps.session.sopTaskIndex = i + 1
    deps.session.sopPhase = 'implement'

    const artifactHint = deps.artifactPaths?.length
      ? `Read upstream artifacts:\n${deps.artifactPaths.map((p) => `- ${p}`).join('\n')}`
      : ''

    const runOne = async (extra: string): Promise<TaskImplementResult> => {
      deps.onProgress?.(roleId, 'thinking', deps.developer.id)
      const inp = {
        roleId,
        userBrief: deps.session.userBrief,
        priorSummary: [
          artifactHint,
          deps.pool.contextForWatch(['WriteTasks', 'WriteDesign', 'WritePRD', 'UserRequirement']),
          `Current task (${i + 1}/${sorted.length}): **${task.id}** ${task.title}`,
          `Completed tasks: ${summaries.join('; ') || 'none'}`,
          extra,
        ]
          .filter(Boolean)
          .join('\n\n'),
        speakMode: 'member' as const,
        assigneeUser: deps.developer,
        sopPhase: 'implement' as SopPipelinePhase,
        sopAction: 'WriteCode' as const,
        poolContext: deps.pool.contextForWatch(['WriteTasks', 'WriteDesign']),
        sopTaskId: task.id,
        sopTaskTitle: task.title,
        reuseImplementSession: true,
      }
      deps.onProgress?.(roleId, 'speaking', deps.developer.id)
      const out = await deps.speaker(inp)
      deps.onProgress?.(roleId, 'done', deps.developer.id)

      if (out.needsUser) {
        deps.pushChat(deps.session, roleId, out.summary.trim(), {
          speakerUserId: deps.developer.id,
          relatedFiles: out.relatedFiles,
          causeBy: 'WriteCode',
        })
        deps.session.phase = 'waiting_user'
        return { ok: true, waiting: true }
      }

      const body = out.planSource?.trim() || out.summary.trim()
      summaries.push(`${task.id}: ${body.slice(0, 80)}`)
      if (out.relatedFiles?.length) allFiles.push(...out.relatedFiles)

      deps.pool.publish({
        causeBy: 'WriteCode',
        phase: 'implement',
        speakerUserId: deps.developer.id,
        content: `Task ${task.id} done: ${body.slice(0, 2000)}`,
      })
      deps.pushChat(deps.session, roleId, `✓ ${task.id}: ${out.summary.trim().slice(0, 200)}`, {
        speakerUserId: deps.developer.id,
        relatedFiles: out.relatedFiles,
        causeBy: 'WriteCode',
      })
      return { ok: true, relatedFiles: allFiles, summary: summaries.join('\n') }
    }

    let last = await runOne('')
    if ('waiting' in last && last.waiting) return last
    if (!last.ok) return last

    if (deps.projectRoot.trim()) {
      const runTests =
        deps.runTests ?? (() => runProjectTests(deps.projectRoot, deps.testExec))
      let waitingDuringFb = false
      const fb = await runQaLoop({
        maxRounds: maxFb,
        runTests,
        fixBug: async (_round, testOutput) => {
          const fix = await runOne(`Test failures after task ${task.id}:\n${testOutput}`)
          if ('waiting' in fix && fix.waiting) {
            waitingDuringFb = true
            return 'waiting user'
          }
          return fix.ok ? fix.summary : fix.error
        },
      })
      if (waitingDuringFb) return { ok: true, waiting: true }
      if (!fb.passed && fb.rounds.length >= maxFb) {
        return { ok: false, error: `Task ${task.id}: tests did not pass after ${maxFb} round(s)` }
      }
    }
  }

  deps.session.sopTaskIndex = sorted.length
  return { ok: true, relatedFiles: [...new Set(allFiles)], summary: summaries.join('\n') }
}
