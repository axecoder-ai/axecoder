const BY_EXT: Record<string, { id: string; label: string }> = {
  go: { id: 'go', label: 'Go' },
  ts: { id: 'typescript', label: 'TypeScript' },
  tsx: { id: 'typescript', label: 'TypeScript' },
  js: { id: 'javascript', label: 'JavaScript' },
  jsx: { id: 'javascript', label: 'JavaScript' },
  mjs: { id: 'javascript', label: 'JavaScript' },
  cjs: { id: 'javascript', label: 'JavaScript' },
  vue: { id: 'html', label: 'Vue' },
  json: { id: 'json', label: 'JSON' },
  md: { id: 'markdown', label: 'Markdown' },
  markdown: { id: 'markdown', label: 'Markdown' },
  css: { id: 'css', label: 'CSS' },
  scss: { id: 'scss', label: 'SCSS' },
  html: { id: 'html', label: 'HTML' },
  htm: { id: 'html', label: 'HTML' },
  py: { id: 'python', label: 'Python' },
  rs: { id: 'rust', label: 'Rust' },
  java: { id: 'java', label: 'Java' },
  kt: { id: 'kotlin', label: 'Kotlin' },
  sql: { id: 'sql', label: 'SQL' },
  sh: { id: 'shell', label: 'Shell' },
  bash: { id: 'shell', label: 'Shell' },
  zsh: { id: 'shell', label: 'Shell' },
  yaml: { id: 'yaml', label: 'YAML' },
  yml: { id: 'yaml', label: 'YAML' },
  xml: { id: 'xml', label: 'XML' },
  toml: { id: 'ini', label: 'TOML' },
  ini: { id: 'ini', label: 'INI' },
  cpp: { id: 'cpp', label: 'C++' },
  cc: { id: 'cpp', label: 'C++' },
  cxx: { id: 'cpp', label: 'C++' },
  h: { id: 'cpp', label: 'C' },
  hpp: { id: 'cpp', label: 'C++' },
  c: { id: 'c', label: 'C' },
  cs: { id: 'csharp', label: 'C#' },
  rb: { id: 'ruby', label: 'Ruby' },
  php: { id: 'php', label: 'PHP' },
  swift: { id: 'swift', label: 'Swift' },
  dart: { id: 'dart', label: 'Dart' },
  lua: { id: 'lua', label: 'Lua' },
  r: { id: 'r', label: 'R' },
  txt: { id: 'plaintext', label: 'Plain Text' },
}

const fileExt = (path: string): string => {
  const base = path.split(/[/\\]/).pop() ?? path
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1).toLowerCase()
}

export const monacoLanguageForPath = (path: string | null): string => {
  if (!path) return 'plaintext'
  const ext = fileExt(path)
  return BY_EXT[ext]?.id ?? 'plaintext'
}

export const languageLabelForPath = (path: string | null): string => {
  if (!path) return 'Plain Text'
  const ext = fileExt(path)
  return BY_EXT[ext]?.label ?? 'Plain Text'
}

export const isMarkdownPath = (path: string | null): boolean => {
  if (!path) return false
  const ext = fileExt(path)
  return ext === 'md' || ext === 'markdown'
}

/** Status bar language picker options */
export const BY_EXT_FOR_STATUS: Record<string, { id: string; label: string }> = BY_EXT
