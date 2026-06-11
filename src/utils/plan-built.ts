export const isPlanEditorPath = (filePath: string | null | undefined, content = ''): boolean => {
  if (!filePath) return false
  const norm = filePath.replace(/\\/g, '/')
  if (/docs\/plans\/plan-[^/]+\.md$/i.test(norm)) return true
  return /^---\s*\n[\s\S]*?axecoder-plan:\s*true/m.test(content)
}

/** plan 文件 frontmatter 是否已标记为 Build 过 */
export const isPlanBuiltContent = (content: string): boolean =>
  /^---\s*\n[\s\S]*?axecoder-plan-built:\s*true/m.test(content)

export const markPlanBuiltFrontmatter = (markdown: string): string => {
  if (isPlanBuiltContent(markdown)) return markdown
  const stamp = new Date().toISOString().slice(0, 19)
  if (/^---\s*\n[\s\S]*?---\s*\n/.test(markdown)) {
    return markdown.replace(
      /^(---\s*\n)/,
      `$1axecoder-plan-built: true\naxecoder-plan-built-at: ${JSON.stringify(stamp)}\n`,
    )
  }
  return `---\naxecoder-plan-built: true\naxecoder-plan-built-at: ${JSON.stringify(stamp)}\n---\n\n${markdown}`
}

export const markPlanFileBuilt = async (absolutePath: string): Promise<boolean> => {
  const { content } = await window.axecoder.readFile(absolutePath)
  const next = markPlanBuiltFrontmatter(content)
  if (next === content) return false
  await window.axecoder.writeFile(absolutePath, next)
  return true
}

export const planAbsolutePath = (projectRoot: string, relOrAbs: string): string => {
  const norm = relOrAbs.replace(/\\/g, '/')
  if (norm.startsWith('/') || /^[a-zA-Z]:\//.test(norm)) return relOrAbs
  const sep = projectRoot.includes('\\') ? '\\' : '/'
  return `${projectRoot.replace(/[/\\]+$/, '')}${sep}${relOrAbs.replace(/^[/\\]+/, '')}`
}
