import { runSubAgentTask } from '../agent/agent-subagent'
import { normalizeSubagentType } from '../agent/agent-subagent-types'
import type { SubagentType } from '../agent/agent-types'

export type CoordinatorSubtask = {
  description: string
  prompt: string
  subagent_type?: string
  readonly?: boolean
}

export type CoordinatorSubtaskResult = {
  description: string
  ok: boolean
  agentId?: string
  report?: string
  error?: string
}

export type RunCoordinatorInput = {
  projectRoot: string
  modelId: string
  sessionId?: string
  tasks: CoordinatorSubtask[]
  parallel?: boolean
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export const parseCoordinatorTasks = (raw: unknown): CoordinatorSubtask[] | { error: string } => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'tasks must be a non-empty array' }
  }
  const tasks: CoordinatorSubtask[] = []
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i]
    if (!item || typeof item !== 'object') {
      return { error: `tasks[${i}] must be an object` }
    }
    const o = item as Record<string, unknown>
    const description = str(o.description)
    const prompt = str(o.prompt)
    if (!description) return { error: `tasks[${i}].description is required` }
    if (!prompt) return { error: `tasks[${i}].prompt is required` }
    tasks.push({
      description,
      prompt,
      subagent_type: str(o.subagent_type) || undefined,
      readonly: o.readonly === true,
    })
  }
  return tasks
}

const runOne = async (
  input: RunCoordinatorInput,
  task: CoordinatorSubtask,
): Promise<CoordinatorSubtaskResult> => {
  const subagentType = normalizeSubagentType(task.subagent_type || 'generalPurpose') as SubagentType
  const sub = await runSubAgentTask(input.projectRoot, input.modelId, task.prompt, {
    subagentType,
    readonly: task.readonly,
    sessionId: input.sessionId,
  })
  if (!sub.ok) {
    return { description: task.description, ok: false, error: sub.error }
  }
  return {
    description: task.description,
    ok: true,
    agentId: sub.agentId,
    report: sub.report,
  }
}

export const runCoordinatorTasks = async (
  input: RunCoordinatorInput,
): Promise<{ ok: boolean; results: CoordinatorSubtaskResult[]; summary: string }> => {
  const parallel = input.parallel !== false
  let results: CoordinatorSubtaskResult[]
  if (parallel) {
    results = await Promise.all(input.tasks.map((task) => runOne(input, task)))
  } else {
    results = []
    for (const task of input.tasks) {
      results.push(await runOne(input, task))
    }
  }
  const failed = results.filter((r) => !r.ok).length
  const ok = failed === 0
  const lines = results.map((r) => {
    if (!r.ok) return `- ${r.description}: FAILED — ${r.error}`
    const head = r.report?.slice(0, 500) ?? ''
    const tail = (r.report?.length ?? 0) > 500 ? '…' : ''
    return `- ${r.description} (agent ${r.agentId}): ${head}${tail}`
  })
  const summary = [
    `Coordinator: ${results.length} subtask(s), ${results.length - failed} succeeded, ${failed} failed.`,
    '',
    ...lines,
  ].join('\n')
  return { ok, results, summary }
}
