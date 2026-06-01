import fs from 'node:fs/promises'
import type {
  AgentToolCall,
  AgentToolLogEntry,
  AgentToolName,
  AskUserQuestionItem,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingWritePublic,
} from './agent-types'
import { PATH_OUTSIDE_PROJECT_ERROR, relativeInProject, resolvePathInProject } from './agent-path'
import { applyStringReplace, patchToUnifiedDiff } from './edit-utils'
import { formatBashToolContent, runAgentBash } from './agent-bash'
import {
  deleteProjectPath,
  globProject,
  grepProject,
  moveProjectPath,
  readProjectFile,
  writeProjectFile,
} from './agent-fs'
import { executeExtendedAgentTool } from './agent-ext-executor'
import {
  createBackgroundRunId,
  getBackgroundRun,
  putBackgroundRun,
} from './agent-subagent-tasks'
import { buildSubAgentToolList } from './agent-tool-registry'
import { trackCheckpointFileCtx } from './agent-checkpoint'
export type AgentContext = {
  projectRoot: string
  readCache: Set<string>
  /** 主会话 modelId，供 Agent 工具启动子代理 */
  modelId?: string
  /** ≥1 表示已在子代理内，禁止再调 Agent */
  subAgentDepth?: number
  sessionId?: string
  planMode?: boolean
  scratchpadDir?: string
  /** 本轮将写入 checkpoint 的文件快照（相对路径 → 修改前内容） */
  checkpointFiles?: Record<string, string>
  /** Workshop 角色回合：Write/Bash 自动 apply，与 Chat 开 Auto Run 等价 */
  workshopAutoApply?: boolean
}

export type PendingAskUserInternal = PendingAskUserPublic & {
  toolCallId: string
}

export type PendingBashInternal = PendingBashPublic & {
  toolCallId: string
  apply: () => Promise<
    { ok: true; content: string; logOk: boolean } | { ok: false; error: string }
  >
}

export type ToolRunResult =
  | { kind: 'immediate'; content: string; log: AgentToolLogEntry }
  | { kind: 'pending'; pending: PendingWriteInternal; log: AgentToolLogEntry }
  | { kind: 'bash_pending'; pendingBash: PendingBashInternal; log: AgentToolLogEntry }
  | { kind: 'ask_pending'; pendingAsk: PendingAskUserInternal; log: AgentToolLogEntry }

export type PendingWriteInternal = PendingWritePublic & {
  toolCallId: string
  apply: () => Promise<{ ok: true } | { ok: false; error: string }>
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const bool = (v: unknown) => v === true

export const parseAskUserQuestions = (
  raw: unknown,
): { ok: true; questions: AskUserQuestionItem[] } | { ok: false; error: string } => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'questions must be a non-empty array' }
  }
  const questions: AskUserQuestionItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'each question must be an object' }
    }
    const rec = item as Record<string, unknown>
    const id = str(rec.id).trim()
    const prompt = str(rec.prompt).trim()
    if (!id || !prompt) {
      return { ok: false, error: 'each question needs id and prompt' }
    }
    if (!Array.isArray(rec.options) || rec.options.length < 2) {
      return { ok: false, error: `question "${id}" needs at least 2 options` }
    }
    const options: AskUserQuestionItem['options'] = []
    for (const opt of rec.options) {
      if (!opt || typeof opt !== 'object') {
        return { ok: false, error: `question "${id}" has invalid option` }
      }
      const o = opt as Record<string, unknown>
      const oid = str(o.id).trim()
      const label = str(o.label).trim()
      if (!oid || !label) {
        return { ok: false, error: `question "${id}" options need id and label` }
      }
      options.push({ id: oid, label })
    }
    questions.push({
      id,
      prompt,
      options,
      ...(rec.allow_multiple === true ? { allow_multiple: true } : {}),
    })
  }
  return { ok: true, questions }
}

let pendingSeq = 0
const nextPendingId = () => `pw-${Date.now()}-${pendingSeq++}`

const PLAN_BLOCKED = new Set(['Edit', 'Write', 'Delete', 'Move', 'Bash'])

export const executeAgentTool = async (
  ctx: AgentContext,
  call: AgentToolCall,
): Promise<ToolRunResult> => {
  const { name, arguments: args } = call

  if (ctx.planMode && PLAN_BLOCKED.has(name)) {
    return {
      kind: 'immediate',
      content: 'Error: Plan mode is active. Use ExitPlanMode before mutating files or running shell.',
      log: { name, summary: `${name} blocked`, ok: false },
    }
  }

  if (name === 'Read') {
    const file_path = str(args.file_path)
    const res = await readProjectFile(ctx.projectRoot, file_path)
    if (!res.ok) {
      const denied = res.error === PATH_OUTSIDE_PROJECT_ERROR
      return {
        kind: 'immediate',
        content: `Error: ${res.error}`,
        log: {
          name,
          summary: denied ? 'Read denied (outside project)' : `Read ${file_path}`,
          ok: false,
        },
      }
    }
    const resolved = resolvePathInProject(ctx.projectRoot, file_path)!
    ctx.readCache.add(resolved)
    return {
      kind: 'immediate',
      content: res.numbered,
      log: { name, summary: `Read ${relativeInProject(ctx.projectRoot, resolved)}`, ok: true },
    }
  }

  if (name === 'Glob') {
    const pattern = str(args.pattern)
    const res = await globProject(ctx.projectRoot, pattern)
    return {
      kind: 'immediate',
      content: res.ok ? res.text : `Error: ${res.error}`,
      log: { name, summary: `Glob ${pattern}`, ok: res.ok },
    }
  }

  if (name === 'Grep') {
    const pattern = str(args.pattern)
    const res = await grepProject(ctx.projectRoot, pattern)
    return {
      kind: 'immediate',
      content: res.ok ? res.text : `Error: ${res.error}`,
      log: { name, summary: `Grep ${pattern}`, ok: res.ok },
    }
  }

  if (name === 'Edit') {
    const file_path = str(args.file_path)
    const old_string = str(args.old_string)
    const new_string = str(args.new_string)
    const replace_all = bool(args.replace_all)
    const resolved = resolvePathInProject(ctx.projectRoot, file_path)
    if (!resolved) {
      return {
        kind: 'immediate',
        content: `Error: ${PATH_OUTSIDE_PROJECT_ERROR}`,
        log: { name, summary: `Edit ${file_path}`, ok: false },
      }
    }
    if (!ctx.readCache.has(resolved)) {
      return {
        kind: 'immediate',
        content: 'Error: You must Read this file before Edit',
        log: { name, summary: `Edit ${resolved}`, ok: false },
      }
    }
    let oldContent = ''
    try {
      oldContent = await fs.readFile(resolved, 'utf-8')
    } catch {
      return {
        kind: 'immediate',
        content: 'Error: File not found',
        log: { name, summary: `Edit ${resolved}`, ok: false },
      }
    }
    const replaced = applyStringReplace(oldContent, old_string, new_string, replace_all)
    if (!replaced.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${replaced.error}`,
        log: { name, summary: `Edit ${resolved}`, ok: false },
      }
    }
    const newContent = replaced.content
    const patchText = patchToUnifiedDiff(resolved, oldContent, newContent)
    const id = nextPendingId()
    return {
      kind: 'pending',
      log: { name, summary: `Edit ${resolved}`, ok: true },
      pending: {
        id,
        toolCallId: call.id,
        tool: 'Edit',
        filePath: resolved,
        summary: `编辑 ${resolved}`,
        patchText,
        apply: async () => {
          const rel = relativeInProject(ctx.projectRoot, resolved)
          if (rel) trackCheckpointFileCtx(ctx, rel, oldContent)
          await writeProjectFile(resolved, newContent)
          return { ok: true as const, content: 'Applied.', logOk: true }
        },
      },
    }
  }

  if (name === 'Write') {
    const file_path = str(args.file_path)
    const content = str(args.content)
    const resolved = resolvePathInProject(ctx.projectRoot, file_path)
    if (!resolved) {
      return {
        kind: 'immediate',
        content: `Error: ${PATH_OUTSIDE_PROJECT_ERROR}`,
        log: { name, summary: `Write ${file_path}`, ok: false },
      }
    }
    let oldContent = ''
    try {
      oldContent = await fs.readFile(resolved, 'utf-8')
    } catch {
      oldContent = ''
    }
    const patchText = patchToUnifiedDiff(resolved, oldContent, content)
    const id = nextPendingId()
    return {
      kind: 'pending',
      log: { name, summary: `Write ${resolved}`, ok: true },
      pending: {
        id,
        toolCallId: call.id,
        tool: 'Write',
        filePath: resolved,
        summary: `写入 ${resolved}`,
        patchText,
        apply: async () => {
          const rel = relativeInProject(ctx.projectRoot, resolved)
          if (rel) trackCheckpointFileCtx(ctx, rel, oldContent)
          await writeProjectFile(resolved, content)
          ctx.readCache.add(resolved)
          return { ok: true as const, content: 'Applied.', logOk: true }
        },
      },
    }
  }

  if (name === 'Delete') {
    const file_path = str(args.file_path)
    const resolved = resolvePathInProject(ctx.projectRoot, file_path)
    if (!resolved) {
      return {
        kind: 'immediate',
        content: `Error: ${PATH_OUTSIDE_PROJECT_ERROR}`,
        log: { name, summary: `Delete ${file_path}`, ok: false },
      }
    }
    const id = nextPendingId()
    return {
      kind: 'pending',
      log: { name, summary: `Delete ${resolved}`, ok: true },
      pending: {
        id,
        toolCallId: call.id,
        tool: 'Delete',
        filePath: resolved,
        summary: `删除 ${resolved}`,
        patchText: `(delete)\n${resolved}`,
        apply: async () => {
          await deleteProjectPath(resolved)
          ctx.readCache.delete(resolved)
          return { ok: true as const }
        },
      },
    }
  }

  if (name === 'Move') {
    const from_path = str(args.from_path)
    const to_path = str(args.to_path)
    const from = resolvePathInProject(ctx.projectRoot, from_path)
    const to = resolvePathInProject(ctx.projectRoot, to_path)
    if (!from || !to) {
      return {
        kind: 'immediate',
        content: `Error: ${PATH_OUTSIDE_PROJECT_ERROR}`,
        log: { name, summary: `Move ${from_path}`, ok: false },
      }
    }
    const id = nextPendingId()
    return {
      kind: 'pending',
      log: { name, summary: `Move ${from} → ${to}`, ok: true },
      pending: {
        id,
        toolCallId: call.id,
        tool: 'Move',
        filePath: to,
        summary: `移动 ${from} → ${to}`,
        patchText: `(move)\n${from}\n→\n${to}`,
        apply: async () => {
          await moveProjectPath(from, to)
          if (ctx.readCache.has(from)) {
            ctx.readCache.delete(from)
            ctx.readCache.add(to)
          }
          return { ok: true as const }
        },
      },
    }
  }

  if (name === 'Bash') {
    const command = str(args.command)
    if (!command) {
      return {
        kind: 'immediate',
        content: 'Error: command is required',
        log: { name, summary: 'Bash', ok: false },
      }
    }
    const timeoutRaw = args.timeout_ms
    const timeoutMs =
      typeof timeoutRaw === 'number' && timeoutRaw > 0 ? Math.min(timeoutRaw, 600_000) : undefined
    const id = nextPendingId()
    return {
      kind: 'bash_pending',
      log: { name, summary: command.slice(0, 80) || 'Bash', ok: true },
      pendingBash: {
        id,
        toolCallId: call.id,
        command,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        apply: async () => {
          const res = await runAgentBash(ctx.projectRoot, command, timeoutMs)
          if (!res.ok) return { ok: false as const, error: res.error }
          return {
            ok: true as const,
            content: formatBashToolContent(res),
            logOk: res.exitCode === 0,
          }
        },
      },
    }
  }

  if (name === 'Agent') {
    if ((ctx.subAgentDepth ?? 0) >= 1) {
      return {
        kind: 'immediate',
        content: 'Error: Sub-agents cannot spawn further sub-agents.',
        log: { name, summary: 'Agent (denied)', ok: false },
      }
    }
    const taskPrompt = str(args.prompt)
    if (!taskPrompt) {
      return {
        kind: 'immediate',
        content: 'Error: prompt is required',
        log: { name, summary: 'Agent', ok: false },
      }
    }
    if (!ctx.modelId?.trim()) {
      return {
        kind: 'immediate',
        content: 'Error: Agent tool requires an active model session',
        log: { name, summary: 'Agent', ok: false },
      }
    }
    const subagentType = str(args.subagent_type) || 'generalPurpose'
    const runInBackground = args.run_in_background === true
    const { runSubAgentTask, formatAgentToolSummary } = await import('./agent-subagent')

    if (runInBackground && ctx.sessionId) {
      const taskId = createBackgroundRunId()
      putBackgroundRun({
        id: taskId,
        description: formatAgentToolSummary(args),
        status: 'running',
        report: '',
        startedAt: Date.now(),
        sessionId: ctx.sessionId,
      })
      void runSubAgentTask(ctx.projectRoot, ctx.modelId, taskPrompt, {
        subagentType,
        tools: buildSubAgentToolList(subagentType),
      }).then((sub) => {
        const run = getBackgroundRun(taskId)
        if (!run) return
        run.status = sub.ok ? 'completed' : 'failed'
        run.report = sub.ok ? sub.report : ''
        run.error = sub.ok ? undefined : sub.error
        putBackgroundRun(run)
      })
      return {
        kind: 'immediate',
        content: `Background sub-agent started. Task id: ${taskId}. Use TaskOutput to read results.`,
        log: { name, summary: formatAgentToolSummary(args), ok: true },
      }
    }

    const sub = await runSubAgentTask(ctx.projectRoot, ctx.modelId, taskPrompt, {
      subagentType,
      tools: buildSubAgentToolList(subagentType),
    })
    if (!sub.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${sub.error}`,
        log: { name, summary: formatAgentToolSummary(args), ok: false },
      }
    }
    return {
      kind: 'immediate',
      content: sub.report,
      log: { name, summary: formatAgentToolSummary(args), ok: true },
    }
  }

  if (name === 'AskUserQuestion') {
    const parsed = parseAskUserQuestions(args.questions)
    if (!parsed.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${parsed.error}`,
        log: { name, summary: 'AskUserQuestion', ok: false },
      }
    }
    const id = nextPendingId()
    return {
      kind: 'ask_pending',
      log: {
        name,
        summary: `Ask ${parsed.questions.length} question(s)`,
        ok: true,
      },
      pendingAsk: {
        id,
        toolCallId: call.id,
        questions: parsed.questions,
      },
    }
  }

  const ext = await executeExtendedAgentTool(ctx, call)
  if (ext) return ext

  return {
    kind: 'immediate',
    content: `Error: Unknown tool ${name as AgentToolName}`,
    log: { name, summary: String(name), ok: false },
  }
}
