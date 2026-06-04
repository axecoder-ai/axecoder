/** Whether relative path is under a dot-dir segment (.git, .axecoder) */
export const isUnderHiddenPathSegment = (relativePath: string) => {
  const norm = relativePath.replace(/\\/g, '/')
  return norm.split('/').some((seg) => seg.length > 0 && seg.startsWith('.'))
}
