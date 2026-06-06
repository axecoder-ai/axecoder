import type { DocumentPreviewKind } from '../utils/document-preview'

export type OpenFile = {
  path: string
  name: string
  content: string
  dirty: boolean
  previewKind?: DocumentPreviewKind
  previewBase64?: string
  previewHtml?: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const fileNameFromPath = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

export const upsertOpenFile = (files: OpenFile[], file: OpenFile): OpenFile[] => {
  const idx = files.findIndex((f) => f.path === file.path)
  if (idx >= 0) {
    const next = [...files]
    next[idx] = file
    return next
  }
  return [...files, file]
}

export const closeOpenFile = (files: OpenFile[], filePath: string): OpenFile[] =>
  files.filter((f) => f.path !== filePath)

export const updateOpenFilePath = (
  files: OpenFile[],
  oldPath: string,
  newPath: string,
  newName: string,
): OpenFile[] =>
  files.map((f) =>
    f.path === oldPath ? { ...f, path: newPath, name: newName } : f,
  )

export const removeOpenFilesByPath = (files: OpenFile[], filePath: string): OpenFile[] =>
  files.filter((f) => f.path !== filePath)

export const anyDirty = (files: OpenFile[]): boolean => files.some((f) => f.dirty)

export const activeFile = (files: OpenFile[], activePath: string | null): OpenFile | null =>
  activePath ? files.find((f) => f.path === activePath) ?? null : null

export const nextActiveAfterClose = (
  files: OpenFile[],
  closedPath: string,
  currentActive: string | null,
): string | null => {
  if (currentActive !== closedPath) return currentActive
  const idx = files.findIndex((f) => f.path === closedPath)
  const remaining = files.filter((f) => f.path !== closedPath)
  if (!remaining.length) return null
  const pick = remaining[Math.min(idx, remaining.length - 1)]
  return pick?.path ?? null
}
