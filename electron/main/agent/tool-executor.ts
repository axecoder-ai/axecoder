import fs from 'node:fs/promises'
import type { AgentToolCall, AgentToolLogEntry, AgentToolName, PendingWritePublic } from './agent-types'
import { PATH_OUTSIDE_PROJECT_ERROR, relativeInProject, resolvePathInProject } from './agent-path'
import { applyStringReplace, patchToUnifiedDiff } from './edit-utils'
import {
  deleteProjectPath,
  globProject,
  grepProject,
  moveProjectPath,
  readProjectFile,
  writeProjectFile,
} from './agent-fs'
import { executeComplexAgentTool } from './tools-complex/executor'

export type AgentContext = {
  projectRoot: string
  readCache: Set<string>
}

export type ToolRunResult =
  | { kind: 'immediate'; content: string; log: AgentToolLogEntry }
  | { kind: 'pending'; pending: PendingWriteInternal; log: AgentToolLogEntry }

export type PendingWriteInternal = PendingWritePublic & {
  toolCallId: string
  apply: () => Promise<{ ok: true } | { ok: false; error: string }>
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const bool = (v: unknown) => v === true

let pendingSeq = 0
const nextPendingId = () => `pw-${Date.now()}-${pendingSeq++}`

export const executeAgentTool = async (
  ctx: AgentContext,
  call: AgentToolCall,
): Promise<ToolRunResult> => {
  const { name, arguments: args } = call

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
          await writeProjectFile(resolved, newContent)
          return { ok: true as const }
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
          await writeProjectFile(resolved, content)
          ctx.readCache.add(resolved)
          return { ok: true as const }
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

  const complex = await executeComplexAgentTool(ctx, call)
  if (complex) return complex

  return {
    kind: 'immediate',
    content: `Error: Unknown tool ${name as AgentToolName}`,
    log: { name, summary: String(name), ok: false },
  }
}
