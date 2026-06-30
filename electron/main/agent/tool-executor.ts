import fs from 'node:fs/promises'
import type {
  AgentToolCall,
  AgentToolLogEntry,
  AgentToolName,
  AskUserQuestionItem,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingPlanPublic,
  PendingWritePublic,
} from './agent-types'
import {
  buildPlanMarkdown,
  parseCreatePlanInput,
  writePlanFile,
} from './agent-create-plan'
import { getSession } from './agent-session-store'
import { PATH_OUTSIDE_PROJECT_ERROR, relativeInProject, resolvePathInProject } from './agent-path'
import { applyStringReplace, patchToUnifiedDiff } from './edit-utils'
import { planUnifiedPatch } from './apply-patch'
import { revertFileWithPatch } from './agent-revert'
import {
  formatBackgroundBashStarted,
  formatBashToolContent,
  parseBashStdin,
  parseBashTimeoutMs,
  runAgentBash,
} from './agent-bash'
import { evaluateExecPolicy } from './agent-execpolicy'
import { startBackgroundBash } from './agent-bash-tasks'
import {
  deleteProjectPath,
  globProject,
  grepProject,
  moveProjectPath,
  readProjectFile,
  writeProjectFile,
} from './agent-fs'
import { executeExtendedAgentTool } from './agent-ext-executor'
import { notifyLspFileRefresh } from '../lsp/lsp-editor-ipc'
import { syncAgentFileToLsp } from '../lsp/lsp-agent-sync'
import { buildPostEditDiagnosticsBlock } from './agent-lsp-post-edit'
import { isAgentWorkerProcess, requestMainProcess } from './main-process-delegate'
import { createSubagentAgentId } from './agent-subagent-store'
import {
  createBackgroundRunId,
  finalizeBackgroundRun,
  getBackgroundRun,
  getBackgroundRunByAgentId,
  interruptBackgroundRun,
  putBackgroundRun,
  registerBackgroundAbort,
  subagentOutputPath,
} from './agent-subagent-tasks'
import { buildSubAgentToolList } from './agent-tool-registry'
import { getAgentRunAbortSignal } from './agent-run-abort'
import { trackCheckpointFileCtx, restoreCheckpointFilesOnly } from './agent-checkpoint'
import { writeScratchpadNote } from './agent-scratchpad'
import { resolveModelIdForTask } from '../ai/model-resolve'
import { getConfig } from '../config-store'
import { buildGitForgeContext, forgeEnvForBash } from '../git-forge/detect-forge'
import {
  runGitDiffForAgent,
  runGitLogForAgent,
  runGitStatusForAgent,
} from '../git-forge/git-agent-read'
import { resolveSubagentForExecution } from './agent-custom-subagents'
import { normalizeAgentToolCall } from './agent-tool-aliases'

const finishAgentFileWrites = async (ctx: AgentContext, absPaths: string[]): Promise<string> => {
  if (!absPaths.length) return ''
  if (isAgentWorkerProcess()) {
    const block = await requestMainProcess('afterAgentFileWrite', {
      projectRoot: ctx.projectRoot,
      absPaths,
    })
    return typeof block === 'string' ? block : ''
  }
  for (const p of absPaths) {
    await syncAgentFileToLsp(ctx.projectRoot, p)
    notifyLspFileRefresh(p)
  }
  return buildPostEditDiagnosticsBlock(ctx.projectRoot, absPaths)
}

export type AgentContext = {
  projectRoot: string
  readCache: Set<string>
  /** 主会话 modelId，供 Agent 工具Start子代理 */
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
  /** Draw.IO 模式：关联的 Workshop 会话 id */
  drawIoWorkshopId?: string
  /** 本轮主 Agent 启动的后台 Task id（assistant 落盘前汇总） */
  backgroundTaskIds?: string[]
  /** Smart Mode 用户已放行的 toolCallId */
  smartReviewBypassIds?: Set<string>
  /** EnterWorktree 前的仓库根（用于 ExitWorktree 恢复） */
  worktreeOriginalRoot?: string
  /** 当前 Agent 会话使用的 worktree 路径 */
  worktreePath?: string
}

export type PendingAskUserInternal = PendingAskUserPublic & {
  toolCallId: string
}

export type PendingPlanInternal = PendingPlanPublic & {
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
  | { kind: 'plan_pending'; pendingPlan: PendingPlanInternal; log: AgentToolLogEntry }
  | {
      kind: 'smart_pending'
      pendingSmart: import('./agent-smart-review').PendingSmartApprovalInternal
      log: AgentToolLogEntry
    }

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

const PLAN_BLOCKED = new Set(['Edit', 'Write', 'Delete', 'Move', 'Bash', 'ApplyPatch'])

export const executeAgentTool = async (
  ctx: AgentContext,
  call: AgentToolCall,
): Promise<ToolRunResult> => {
  const normalized = normalizeAgentToolCall(call)
  const { name, arguments: args } = normalized

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
        summary: `Edit ${resolved}`,
        patchText,
        apply: async () => {
          const rel = relativeInProject(ctx.projectRoot, resolved)
          if (rel) trackCheckpointFileCtx(ctx, rel, oldContent)
          await writeProjectFile(resolved, newContent)
          const diag = await finishAgentFileWrites(ctx, [resolved])
          return { ok: true as const, content: `Applied.${diag}`, logOk: true }
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
        summary: `Write ${resolved}`,
        patchText,
        apply: async () => {
          const rel = relativeInProject(ctx.projectRoot, resolved)
          if (rel) trackCheckpointFileCtx(ctx, rel, oldContent)
          await writeProjectFile(resolved, content)
          ctx.readCache.add(resolved)
          const diag = await finishAgentFileWrites(ctx, [resolved])
          return { ok: true as const, content: `Applied.${diag}`, logOk: true }
        },
      },
    }
  }

  if (name === 'ApplyPatch') {
    const patch = str(args.patch) || str(args.patchText)
    if (!patch) {
      return {
        kind: 'immediate',
        content: 'Error: patch is required',
        log: { name, summary: 'ApplyPatch', ok: false },
      }
    }
    const planned = await planUnifiedPatch(
      (rel) => resolvePathInProject(ctx.projectRoot, rel),
      patch,
    )
    if (!planned.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${planned.error}`,
        log: { name, summary: 'ApplyPatch', ok: false },
      }
    }
    const batchFiles = planned.files.map((f) => ({
      filePath: f.absPath,
      patchText: f.patchText,
    }))
    const summaryNames = planned.files.map((f) => f.relPath).join(', ')
    const combinedPatch = planned.files.map((f) => f.patchText).join('\n')
    const primaryPath = planned.files[0]!.absPath
    const id = nextPendingId()
    return {
      kind: 'pending',
      log: { name, summary: `ApplyPatch ${summaryNames}`, ok: true },
      pending: {
        id,
        toolCallId: call.id,
        tool: 'ApplyPatch',
        filePath: primaryPath,
        summary: `ApplyPatch ${summaryNames}`,
        patchText: combinedPatch,
        batchFiles,
        apply: async () => {
          for (const f of planned.files) {
            const rel = relativeInProject(ctx.projectRoot, f.absPath)
            if (rel) trackCheckpointFileCtx(ctx, rel, f.oldContent)
            await writeProjectFile(f.absPath, f.newContent)
            ctx.readCache.add(f.absPath)
          }
          const diag = await finishAgentFileWrites(
            ctx,
            planned.files.map((f) => f.absPath),
          )
          return { ok: true as const, content: `Applied.${diag}` }
        },
      },
    }
  }

  if (name === 'RevertTurn') {
    const scope = (str(args.scope) || 'file').toLowerCase()
    if (scope === 'file') {
      const file_path = str(args.file_path)
      const patch = str(args.patch) || str(args.patchText)
      if (!file_path || !patch) {
        return {
          kind: 'immediate',
          content: 'Error: file_path and patch are required when scope=file',
          log: { name, summary: 'RevertTurn', ok: false },
        }
      }
      const res = await revertFileWithPatch(ctx.projectRoot, file_path, patch)
      return {
        kind: 'immediate',
        content: res.ok ? 'Reverted file.' : `Error: ${res.error}`,
        log: { name, summary: `RevertTurn ${file_path}`, ok: res.ok },
      }
    }
    if (scope === 'turn' || scope === 'all') {
      const sid = ctx.sessionId?.trim()
      if (!sid) {
        return {
          kind: 'immediate',
          content: 'Error: no active session for turn revert',
          log: { name, summary: 'RevertTurn', ok: false },
        }
      }
      const cpId = str(args.checkpoint_id) || str(args.checkpointId) || undefined
      const res = await restoreCheckpointFilesOnly(sid, ctx.projectRoot, cpId || undefined)
      return {
        kind: 'immediate',
        content: res.ok
          ? `Restored ${res.restoredFiles} file(s) from checkpoint.`
          : `Error: ${res.error}`,
        log: { name, summary: 'RevertTurn turn', ok: res.ok },
      }
    }
    return {
      kind: 'immediate',
      content: 'Error: scope must be file, turn, or all',
      log: { name, summary: 'RevertTurn', ok: false },
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
        summary: `Delete ${resolved}`,
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
        summary: `Move ${from} → ${to}`,
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

  if (name === 'GitStatus') {
    const res = await runGitStatusForAgent(ctx.projectRoot)
    return {
      kind: 'immediate',
      content: res.ok ? res.text : `Error: ${res.error}`,
      log: { name, summary: 'GitStatus', ok: res.ok },
    }
  }

  if (name === 'GitDiff') {
    const staged = args.staged === true
    const ref = str(args.ref) || undefined
    const res = await runGitDiffForAgent(ctx.projectRoot, { staged, ref })
    return {
      kind: 'immediate',
      content: res.ok ? res.text : `Error: ${res.error}`,
      log: { name, summary: ref ? `GitDiff ${ref}` : staged ? 'GitDiff staged' : 'GitDiff', ok: res.ok },
    }
  }

  if (name === 'GitLog') {
    const limitRaw = args.limit
    const limit = typeof limitRaw === 'number' ? limitRaw : undefined
    const ref = str(args.ref) || undefined
    const res = await runGitLogForAgent(ctx.projectRoot, { limit, ref })
    return {
      kind: 'immediate',
      content: res.ok ? res.text : `Error: ${res.error}`,
      log: { name, summary: 'GitLog', ok: res.ok },
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
    const cfg = await getConfig()
    const sandboxOn = cfg.agentOsSandboxEnabled !== false
    if (sandboxOn) {
      const execPolicy = evaluateExecPolicy(command)
      if (execPolicy.kind === 'deny') {
        return {
          kind: 'immediate',
          content: `BLOCKED: ${execPolicy.reason}`,
          log: { name, summary: 'Bash blocked (execpolicy)', ok: false },
        }
      }
    }

    const timeoutMs = parseBashTimeoutMs(args)
    const description = str(args.description) || undefined
    const runInBackground = args.run_in_background === true
    const stdinInput = parseBashStdin(args)
    const summary = description?.slice(0, 80) || command.slice(0, 80) || 'Bash'
    const id = nextPendingId()
    return {
      kind: 'bash_pending',
      log: { name, summary, ok: true },
      pendingBash: {
        id,
        toolCallId: call.id,
        command,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(description ? { description } : {}),
        ...(runInBackground ? { runInBackground: true } : {}),
        apply: async () => {
          const applyCfg = await getConfig()
          const forgeCtx = await buildGitForgeContext(ctx.projectRoot, applyCfg)
          const bashEnv = forgeEnvForBash(applyCfg, forgeCtx)
          const sandboxOn = applyCfg.agentOsSandboxEnabled !== false
          if (runInBackground) {
            const bg = await startBackgroundBash(ctx.projectRoot, command, {
              timeoutMs,
              description,
              sandboxEnabled: sandboxOn,
              sessionId: ctx.sessionId,
              ...(stdinInput !== undefined ? { stdin: stdinInput } : {}),
            })
            if (!bg.ok) return { ok: false as const, error: bg.error }
            return {
              ok: true as const,
              content: formatBackgroundBashStarted(bg.taskId, description),
              logOk: true,
            }
          }
          const res = await runAgentBash(ctx.projectRoot, command, timeoutMs, bashEnv, stdinInput)
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

  if (name === 'Task') {
    if ((ctx.subAgentDepth ?? 0) >= 1) {
      return {
        kind: 'immediate',
        content: 'Error: Sub-agents cannot spawn further sub-agents.',
        log: { name, summary: 'Task (denied)', ok: false },
      }
    }
    const { runSubAgentTask, formatAgentToolSummary } = await import('./agent-subagent')
    const summary = formatAgentToolSummary(args)

    if (args.interrupt === true) {
      const resumeId = str(args.resume)
      const run = resumeId ? getBackgroundRunByAgentId(resumeId) : undefined
      if (run) interruptBackgroundRun(run.id)
      return {
        kind: 'immediate',
        content: run ?
            `Interrupted background task ${run.id} (agent ${resumeId}).`
          : 'Error: no running background task for resume id',
        log: { name, summary: 'Task interrupt', ok: !!run },
      }
    }

    const taskPrompt = str(args.prompt)
    if (!taskPrompt) {
      return {
        kind: 'immediate',
        content: 'Error: prompt is required',
        log: { name, summary: 'Task', ok: false },
      }
    }
    if (!ctx.modelId?.trim()) {
      return {
        kind: 'immediate',
        content: 'Error: Task tool requires an active model session',
        log: { name, summary: 'Task', ok: false },
      }
    }

    const rawSubagentType = str(args.subagent_type) || 'generalPurpose'
    const resolved = await resolveSubagentForExecution(
      ctx.projectRoot,
      rawSubagentType,
      args.readonly === true,
    )
    const subagentType =
      resolved.kind === 'builtin' ? resolved.type : resolved.name
    const typeCfg =
      resolved.kind === 'builtin' ?
        resolved.cfg
      : {
          readOnly: resolved.readOnly,
          shellOnly: false,
          maxTurns: resolved.maxTurns,
          modelTaskKind: resolved.modelTaskKind,
          promptPrefix: resolved.promptPrefix,
        }
    const modelOverride = str(args.model)
    const customModel =
      resolved.kind === 'custom' ? resolved.model?.trim() : undefined
    const subModelId =
      modelOverride ||
      customModel ||
      (await resolveModelIdForTask(typeCfg.modelTaskKind))
    const readonly = args.readonly === true || typeCfg.readOnly
    const runInBackground =
      args.run_in_background === true ||
      (args.run_in_background === undefined &&
        resolved.kind === 'custom' &&
        resolved.isBackground)
    const resumeAgentId = str(args.resume)
    const fileAttachments = Array.isArray(args.file_attachments) ?
        args.file_attachments.filter((p): p is string => typeof p === 'string' && p.trim())
      : []

    const runOpts = {
      subagentType: rawSubagentType,
      tools: buildSubAgentToolList(
        resolved.kind === 'builtin' ? resolved.type : 'generalPurpose',
        readonly,
      ),
      readonly,
      modelIdOverride: modelOverride || undefined,
      sessionId: ctx.sessionId,
      resumeAgentId: resumeAgentId || undefined,
      fileAttachments,
    }

    if (runInBackground && ctx.sessionId) {
      const taskId = createBackgroundRunId()
      const agentId = resumeAgentId || createSubagentAgentId()
      const controller = new AbortController()
      const run = {
        id: taskId,
        description: summary,
        status: 'running' as const,
        report: '',
        startedAt: Date.now(),
        sessionId: ctx.sessionId,
        agentId,
        outputFile: subagentOutputPath(ctx.projectRoot, taskId),
      }
      putBackgroundRun(run)
      if (!ctx.backgroundTaskIds) ctx.backgroundTaskIds = []
      ctx.backgroundTaskIds.push(taskId)
      registerBackgroundAbort(taskId, controller)
      void runSubAgentTask(ctx.projectRoot, subModelId, taskPrompt, {
        ...runOpts,
        abortSignal: controller.signal,
      }).then(async (sub) => {
        const current = getBackgroundRun(taskId)
        if (!current) return
        current.status = sub.ok ? 'completed' : 'failed'
        current.report = sub.ok ? sub.report : ''
        current.error = sub.ok ? undefined : sub.error
        if (sub.ok) current.agentId = sub.agentId
        await finalizeBackgroundRun(ctx.projectRoot, current)
      })
      return {
        kind: 'immediate',
        content: [
          `Background sub-agent started.`,
          `Task id: ${taskId}`,
          `Agent id: ${agentId}`,
          `Output file (when done): ${run.outputFile}`,
          `Use TaskOutput with block:true to wait for results.`,
        ].join('\n'),
        log: { name, summary, ok: true },
      }
    }

    const sub = await runSubAgentTask(ctx.projectRoot, subModelId, taskPrompt, {
      ...runOpts,
      abortSignal: ctx.sessionId ? getAgentRunAbortSignal(ctx.sessionId) : undefined,
    })
    if (!sub.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${sub.error}`,
        log: { name, summary, ok: false },
      }
    }
    if (subagentType === 'explore' && ctx.sessionId?.trim()) {
      await writeScratchpadNote(ctx.sessionId, 'explore-summary.md', sub.report)
    }
    return {
      kind: 'immediate',
      content: `Agent id: ${sub.agentId}\n\n${sub.report}`,
      log: { name, summary, ok: true },
    }
  }

  if (name === 'Coordinator') {
    if ((ctx.subAgentDepth ?? 0) >= 1) {
      return {
        kind: 'immediate',
        content: 'Error: Sub-agents cannot use Coordinator.',
        log: { name, summary: 'Coordinator (denied)', ok: false },
      }
    }
    if (!ctx.modelId?.trim()) {
      return {
        kind: 'immediate',
        content: 'Error: Coordinator requires an active model session',
        log: { name, summary: 'Coordinator', ok: false },
      }
    }
    const { parseCoordinatorTasks, runCoordinatorTasks } = await import('../coordinator/coordinator-agent')
    const parsed = parseCoordinatorTasks(args.tasks)
    if ('error' in parsed) {
      return {
        kind: 'immediate',
        content: `Error: ${parsed.error}`,
        log: { name, summary: 'Coordinator', ok: false },
      }
    }
    const parallel = args.parallel !== false
    const result = await runCoordinatorTasks({
      projectRoot: ctx.projectRoot,
      modelId: ctx.modelId,
      sessionId: ctx.sessionId,
      tasks: parsed,
      parallel,
    })
    return {
      kind: 'immediate',
      content: result.summary,
      log: { name, summary: `Coordinator ${result.results.length} task(s)`, ok: result.ok },
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

  if (name === 'CreatePlan') {
    ctx.planMode = true
    if (ctx.sessionId) {
      const live = getSession(ctx.sessionId)
      if (live) {
        live.planMode = true
        live.ctx.planMode = true
      }
    }
    const parsed = parseCreatePlanInput(args)
    if (!parsed.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${parsed.error}`,
        log: { name, summary: 'CreatePlan', ok: false },
      }
    }
    const markdown = buildPlanMarkdown(parsed.input)
    const written = await writePlanFile(ctx.projectRoot, parsed.relPath, markdown)
    if (!written.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${written.error}`,
        log: { name, summary: 'CreatePlan write', ok: false },
      }
    }
    const id = nextPendingId()
    return {
      kind: 'plan_pending',
      log: { name, summary: `Plan ${parsed.input.name}`, ok: true },
      pendingPlan: {
        id,
        toolCallId: call.id,
        name: parsed.input.name,
        overview: parsed.input.overview,
        plan: parsed.input.plan,
        filePath: written.relPath,
        todos: parsed.input.todos,
      },
    }
  }

  if (name === 'Brief') {
    const cfg = await getConfig()
    if (!cfg.agentFeatureBrief) {
      return {
        kind: 'immediate',
        content: 'Error: Brief disabled. Enable agentFeatureBrief.',
        log: { name, summary: 'Brief', ok: false },
      }
    }
    const message = str(args.message).trim() || '请简要说明你需要用户确认或补充的内容'
    const id = nextPendingId()
    return {
      kind: 'ask_pending',
      log: { name, summary: 'Brief', ok: true },
      pendingAsk: {
        id,
        toolCallId: call.id,
        questions: [
          {
            id: 'brief',
            prompt: message,
            options: [
              { id: 'skip', label: '暂无补充，请继续' },
              { id: 'will_reply', label: '我将在「其他」中填写简要说明' },
            ],
          },
        ],
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

