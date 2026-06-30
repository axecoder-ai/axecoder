import type { Diagnostic } from 'vscode-languageserver-types'
import { formatDiagnosticsResult } from '../lsp/lsp-formatters'
import { getConfig } from '../config-store'
import { relativeInProject } from './agent-path'
import { fetchFileDiagnostics } from './agent-read-lints'

const isErrorOrWarning = (d: Diagnostic) => d.severity === 1 || d.severity === 2

const filterActionable = (items: Diagnostic[]) => items.filter(isErrorOrWarning)

/** Write/Edit/ApplyPatch 成功后追加的 LSP 诊断块；无问题或功能关闭时返回空串。 */
export const buildPostEditDiagnosticsBlock = async (
  projectRoot: string,
  absPaths: string[],
): Promise<string> => {
  const cfg = await getConfig()
  if (!cfg.agentFeatureLsp || cfg.agentLspAutoDiagnostics === false) return ''

  const unique = [...new Set(absPaths.map((p) => p.trim()).filter(Boolean))]
  if (!unique.length) return ''

  const chunks: string[] = []
  for (const abs of unique) {
    const res = await fetchFileDiagnostics(projectRoot, abs)
    if (!res.ok || res.noServer || !res.diagnostics.length) continue
    const filtered = filterActionable(res.diagnostics)
    if (!filtered.length) continue
    const rel = relativeInProject(projectRoot, abs) || abs
    chunks.push(formatDiagnosticsResult(rel, filtered, projectRoot))
  }

  if (!chunks.length) return ''
  return `\n\n--- LSP diagnostics ---\n${chunks.join('\n\n')}`
}
