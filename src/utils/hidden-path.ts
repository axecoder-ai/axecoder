/** 相对路径是否落在以 . 开头的目录段下（如 .git、.axecoder） */
export const isUnderHiddenPathSegment = (relativePath: string) => {
  const norm = relativePath.replace(/\\/g, '/')
  return norm.split('/').some((seg) => seg.length > 0 && seg.startsWith('.'))
}
