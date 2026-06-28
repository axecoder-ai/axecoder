export type DocumentPreviewKind = 'pdf' | 'docx' | 'doc' | 'image'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])

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

export const isImagePath = (path: string | null): boolean => {
  if (!path) return false
  return IMAGE_EXTS.has(fileExt(path))
}

export const imageMimeForPath = (path: string): string => {
  const ext = fileExt(path)
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'bmp') return 'image/bmp'
  if (ext === 'ico') return 'image/x-icon'
  return 'image/jpeg'
}

export const documentPreviewKind = (path: string | null): DocumentPreviewKind | null => {
  if (!path) return null
  const ext = fileExt(path)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'doc') return 'doc'
  if (IMAGE_EXTS.has(ext)) return 'image'
  return null
}

export const isDocumentPreviewPath = (path: string | null): boolean =>
  documentPreviewKind(path) !== null
