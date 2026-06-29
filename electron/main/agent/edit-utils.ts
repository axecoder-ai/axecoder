import { createPatch, structuredPatch } from 'diff'

export const MAX_AGENT_FILE_BYTES = 1024 * 1024

export const countOccurrences = (haystack: string, needle: string): number => {
  if (!needle) return 0
  let count = 0
  let pos = 0
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++
    pos += needle.length
  }
  return count
}

export const applyStringReplace = (
  content: string,
  old_string: string,
  new_string: string,
  replace_all: boolean,
): { ok: true; content: string } | { ok: false; error: string } => {
  if (old_string === new_string) {
    return { ok: false, error: 'old_string and new_string are the same' }
  }
  const n = countOccurrences(content, old_string)
  if (n === 0) {
    return { ok: false, error: 'old_string not found in file' }
  }
  if (!replace_all && n > 1) {
    return {
      ok: false,
      error: `old_string is not unique (${n} occurrences); use replace_all or more context`,
    }
  }
  const next = replace_all
    ? content.split(old_string).join(new_string)
    : content.replace(old_string, new_string)
  return { ok: true, content: next }
}

export const formatNumberedContent = (content: string): string => {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  return lines.map((line, i) => `${i + 1}|${line}`).join('\n')
}

export const buildStructuredPatch = (
  filePath: string,
  oldContent: string,
  newContent: string,
) => {
  return structuredPatch(filePath, filePath, oldContent, newContent, '', '', { context: 3 })
}

export const patchToUnifiedDiff = (filePath: string, oldContent: string, newContent: string): string => {
  const base = filePath.split(/[/\\]/).pop() ?? filePath
  return createPatch(base, oldContent, newContent, `a/${base}`, `b/${base}`)
}

export const countPatchLineStats = (patchText: string) => {
  let additions = 0
  let deletions = 0
  for (const line of patchText.split(/\r?\n/)) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) continue
    if (line.startsWith('+')) additions++
    else if (line.startsWith('-')) deletions++
  }
  return { additions, deletions }
}
