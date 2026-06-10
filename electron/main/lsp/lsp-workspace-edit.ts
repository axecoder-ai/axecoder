import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { TextEdit, WorkspaceEdit } from 'vscode-languageserver-types'
import { resolvePathInProject } from '../agent/agent-path'

export const applyTextEdits = (content: string, edits: TextEdit[]): string => {
  if (!edits.length) return content
  const sorted = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line
    }
    return b.range.start.character - a.range.start.character
  })
  const lines = content.split('\n')
  for (const edit of sorted) {
    const { start, end } = edit.range
    const newText = edit.newText ?? ''
    const before = lines.slice(0, start.line)
    const startLine = lines[start.line] ?? ''
    const endLine = lines[end.line] ?? ''
    const prefix = startLine.slice(0, start.character)
    const suffix = endLine.slice(end.character)
    const inserted = newText.split('\n')
    const merged =
      inserted.length === 1
        ? [...before, prefix + inserted[0]! + suffix, ...lines.slice(end.line + 1)]
        : [
            ...before,
            prefix + inserted[0]!,
            ...inserted.slice(1, -1),
            inserted[inserted.length - 1]! + suffix,
            ...lines.slice(end.line + 1),
          ]
    lines.length = 0
    lines.push(...merged)
  }
  return lines.join('\n')
}

const uriToAbsolutePath = (uri: string, projectRoot: string): string | null => {
  try {
    const decoded = decodeURIComponent(fileURLToPath(uri))
    return resolvePathInProject(projectRoot, decoded) ?? decoded
  } catch {
    return resolvePathInProject(projectRoot, uri.replace(/^file:\/\//, ''))
  }
}

export type ApplyWorkspaceEditResult = {
  ok: boolean
  filesChanged: string[]
  error?: string
}

export const applyWorkspaceEdit = async (
  projectRoot: string,
  edit: WorkspaceEdit,
): Promise<ApplyWorkspaceEditResult> => {
  const filesChanged: string[] = []
  const changesByUri = new Map<string, TextEdit[]>()

  if (edit.changes) {
    for (const [uri, textEdits] of Object.entries(edit.changes)) {
      const existing = changesByUri.get(uri) ?? []
      changesByUri.set(uri, [...existing, ...textEdits])
    }
  }

  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      if (!change || typeof change !== 'object') continue
      if (!('textDocument' in change) || !('edits' in change)) continue
      const docEdit = change as { textDocument: { uri: string }; edits: TextEdit[] }
      const uri = docEdit.textDocument?.uri
      if (!uri) continue
      const existing = changesByUri.get(uri) ?? []
      changesByUri.set(uri, [...existing, ...(docEdit.edits ?? [])])
    }
  }

  if (!changesByUri.size) {
    return { ok: true, filesChanged: [] }
  }

  for (const [uri, textEdits] of changesByUri) {
    const abs = uriToAbsolutePath(uri, projectRoot)
    if (!abs) return { ok: false, filesChanged, error: `Path outside project: ${uri}` }
    let content = ''
    try {
      content = await fs.readFile(abs, 'utf-8')
    } catch {
      return { ok: false, filesChanged, error: `File not found: ${uri}` }
    }
    const next = applyTextEdits(content, textEdits)
    if (next !== content) {
      await fs.writeFile(abs, next, 'utf-8')
      filesChanged.push(abs)
    }
  }

  return { ok: true, filesChanged }
}
