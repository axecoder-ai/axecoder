import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { CodeAction, Diagnostic } from 'vscode-languageserver-types'
import {
  ensureLspForProject,
  getInitializationStatus,
  getLspServerManager,
  waitForInitialization,
} from '../lsp/lsp-manager'
import { applyWorkspaceEdit } from '../lsp/lsp-workspace-edit'
import { relativeInProject, resolvePathInProject } from './agent-path'
import {
  executeAgentReadLints,
  fetchFileDiagnostics,
  parseReadLintsInput,
  resolveTargetPaths,
} from './agent-read-lints'

const FIXABLE_KINDS = new Set(['quickfix', 'source.fixAll', 'source.fixAll.ts'])

const isFixAction = (action: CodeAction): boolean => {
  const kind = typeof action.kind === 'string' ? action.kind : ''
  if (FIXABLE_KINDS.has(kind)) return true
  if (kind.startsWith('quickfix')) return true
  if (kind.startsWith('source.fixAll')) return true
  const title = (action.title ?? '').toLowerCase()
  return title.includes('fix') || title.includes('import')
}

const pickActions = (actions: CodeAction[]): CodeAction[] => {
  const fixAll = actions.filter((a) => {
    const k = typeof a.kind === 'string' ? a.kind : ''
    return k.startsWith('source.fixAll') && a.edit
  })
  if (fixAll.length) return [fixAll[0]!]
  return actions.filter((a) => a.edit && isFixAction(a))
}

const fixFileDiagnostics = async (
  projectRoot: string,
  absolutePath: string,
  diagnostics: Diagnostic[],
): Promise<{ applied: number; errors: string[] }> => {
  if (!diagnostics.length) return { applied: 0, errors: [] }

  const manager = getLspServerManager()
  if (!manager) return { applied: 0, errors: ['LSP manager not available'] }

  const uri = pathToFileURL(absolutePath).href
  const range = diagnostics[0]!.range
  let actions: CodeAction[] | null | undefined
  try {
    actions = await manager.sendRequest<CodeAction[] | null>(
      absolutePath,
      'textDocument/codeAction',
      {
        textDocument: { uri },
        range,
        context: { diagnostics, only: ['quickfix', 'source.fixAll'] },
      },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'codeAction failed'
    return { applied: 0, errors: [msg] }
  }

  if (!actions?.length) return { applied: 0, errors: [] }

  const toApply = pickActions(actions)
  let applied = 0
  const errors: string[] = []

  for (const action of toApply) {
    if (!action.edit) continue
    const res = await applyWorkspaceEdit(projectRoot, action.edit)
    if (!res.ok) {
      errors.push(res.error ?? 'applyWorkspaceEdit failed')
      continue
    }
    applied += res.filesChanged.length
    if (res.filesChanged.length) {
      for (const changed of res.filesChanged) {
        try {
          const content = await fs.readFile(changed, 'utf-8')
          await manager.openFile(changed, content)
        } catch {
          /* reopen best-effort */
        }
      }
    }
  }

  return { applied, errors }
}

export const executeAgentFixLints = async (
  projectRoot: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> => {
  const parsed = parseReadLintsInput(args)
  if (!parsed.ok) return { ok: false, text: parsed.error }

  const targets = await resolveTargetPaths(projectRoot, parsed.input.paths)
  if (!targets.ok) return { ok: false, text: targets.error }

  await ensureLspForProject(projectRoot)
  if (getInitializationStatus() === 'pending') await waitForInitialization()

  const lines: string[] = []
  let totalApplied = 0
  const allErrors: string[] = []

  for (const relPath of targets.relPaths) {
    const absolutePath = resolvePathInProject(projectRoot, relPath)!
    const diagRes = await fetchFileDiagnostics(projectRoot, absolutePath)
    if (!diagRes.ok) {
      allErrors.push(`${relPath}: ${diagRes.error ?? 'diagnostics failed'}`)
      continue
    }
    if (!diagRes.diagnostics.length) {
      lines.push(`${relPath}: No issues to fix.`)
      continue
    }

    const fixRes = await fixFileDiagnostics(projectRoot, absolutePath, diagRes.diagnostics)
    totalApplied += fixRes.applied
    if (fixRes.errors.length) allErrors.push(...fixRes.errors.map((e) => `${relPath}: ${e}`))
    if (fixRes.applied) {
      lines.push(`${relPath}: Applied ${fixRes.applied} file change(s) via LSP codeAction.`)
    } else if (!fixRes.errors.length) {
      lines.push(`${relPath}: No auto-fixable code actions (${diagRes.diagnostics.length} diagnostic(s) remain).`)
    }
  }

  const verify = await executeAgentReadLints(projectRoot, { paths: targets.relPaths })
  const summary = [
    `FixLints complete. ${totalApplied} file(s) modified.`,
    lines.length ? `\nPer file:\n${lines.join('\n')}` : '',
    allErrors.length ? `\nErrors:\n${allErrors.join('\n')}` : '',
    `\n--- Remaining diagnostics (ReadLints) ---\n${verify.text}`,
  ]
    .filter(Boolean)
    .join('')

  return { ok: allErrors.length === 0, text: summary }
}
