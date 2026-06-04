import type { UserEntry } from '../users-types'
import type { WorkshopStep } from './workshop-types'

export type ParsedStepPlan = { steps: WorkshopStep[] }

const extractJsonBlock = (text: string): string | null => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return null
}

export const parseManagerStepPlan = (
  text: string,
  users: UserEntry[],
): { ok: true; plan: ParsedStepPlan } | { ok: false; error: string } => {
  const raw = extractJsonBlock(text.trim())
  if (!raw) return { ok: false, error: 'Manager did not output JSON step plan' }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Could not parse step plan JSON' }
  }
  const stepsRaw = (data as { steps?: unknown })?.steps
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) {
    return { ok: false, error: 'Step plan missing steps array' }
  }
  const allowed = new Set(users.map((u) => u.id))
  const steps: WorkshopStep[] = []
  for (let i = 0; i < stepsRaw.length; i++) {
    const row = stepsRaw[i] as Record<string, unknown>
    const id = String(row.id ?? `step-${i + 1}`).trim()
    const title = String(row.title ?? '').trim()
    const assigneeUserId = String(row.assigneeUserId ?? '').trim()
    if (!title) return { ok: false, error: `Step ${id} missing title` }
    if (!assigneeUserId) return { ok: false, error: `Step ${id} missing assigneeUserId` }
    if (!allowed.has(assigneeUserId)) {
      return { ok: false, error: `Step ${id}  assigneeUserId not in users.json` }
    }
    const u = users.find((x) => x.id === assigneeUserId)
    if (u?.isBuiltin && u.builtinRole === 'manager') {
      return { ok: false, error: `Step ${id} cannot assign Tech Lead to execute` }
    }
    steps.push({ id, title, assigneeUserId, status: 'pending' })
  }
  return { ok: true, plan: { steps } }
}

export type ManagerVerifyAction = 'approve' | 'redo' | 'abort'

export const parseManagerVerifyDecision = (
  text: string,
): { action: ManagerVerifyAction; comment: string } => {
  const t = text.trim()
  const m = t.match(/VERIFY\s*:\s*(approve|redo|abort)/i)
  const action = (m?.[1]?.toLowerCase() ?? 'approve') as ManagerVerifyAction
  if (action !== 'approve' && action !== 'redo' && action !== 'abort') {
    return { action: 'approve', comment: t }
  }
  return { action, comment: t }
}
