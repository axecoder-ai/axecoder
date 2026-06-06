export type DocumentPreviewKind = 'pdf' | 'docx' | 'doc'

const fileExt = (path: string): string => {
  const base = path.split(/[/\\]/).pop() ?? path
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1).toLowerCase()
}

export const isPdfPath = (path: string | null): boolean => {
  if (!path) return false
  return fileExt(path) === 'pdf'
}

export const isDocxPath = (path: string | null): boolean => {
  if (!path) return false
  const ext = fileExt(path)
  return ext === 'docx'
}

export const isDocPath = (path: string | null): boolean => {
  if (!path) return false
  const ext = fileExt(path)
  return ext === 'doc'
}

export const isWordPath = (path: string | null): boolean =>
  isDocxPath(path) || isDocPath(path)

export const documentPreviewKind = (path: string | null): DocumentPreviewKind | null => {
  if (!path) return null
  const ext = fileExt(path)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'doc') return 'doc'
  return null
}

export const isDocumentPreviewPath = (path: string | null): boolean =>
  documentPreviewKind(path) !== null
