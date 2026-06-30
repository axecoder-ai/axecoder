import fs from 'node:fs/promises'
// diff 包无官方 @types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { applyPatch, createPatch, parsePatch } from 'diff'
import { MAX_AGENT_FILE_BYTES } from './edit-utils'

export type PlannedPatchFile = {
  relPath: string
  absPath: string
  oldContent: string
  newContent: string
  patchText: string
}

const headerToRelPath = (oldFile: string, newFile: string): string => {
  const pick = (name: string) => {
    const t = name.trim()
    if (!t || t === '/dev/null') return ''
    return t.replace(/^(a|b)\//, '')
  }
  const fromNew = pick(newFile)
  if (fromNew) return fromNew
  return pick(oldFile)
}

export const planUnifiedPatch = async (
  resolvePath: (rel: string) => string | null,
  patchText: string,
): Promise<{ ok: true; files: PlannedPatchFile[] } | { ok: false; error: string }> => {
  const trimmed = patchText.trim()
  if (!trimmed) return { ok: false, error: 'patch is empty' }

  let parsed: ReturnType<typeof parsePatch>
  try {
    parsed = parsePatch(trimmed)
  } catch (e) {
    return { ok: false, error: `parse failed: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (!parsed?.length) return { ok: false, error: 'no hunks in patch' }

  const files: PlannedPatchFile[] = []
  for (const part of parsed) {
    const rel = headerToRelPath(part.oldFileName ?? '', part.newFileName ?? '')
    if (!rel) return { ok: false, error: 'invalid file path in patch header' }
    const abs = resolvePath(rel)
    if (!abs) return { ok: false, error: `path outside project: ${rel}` }

    let oldContent = ''
    try {
      oldContent = await fs.readFile(abs, 'utf-8')
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') {
        return { ok: false, error: `read ${rel}: ${err.message ?? String(e)}` }
      }
    }
    if (Buffer.byteLength(oldContent, 'utf-8') > MAX_AGENT_FILE_BYTES) {
      return { ok: false, error: `file too large: ${rel}` }
    }

    const newContent = applyPatch(oldContent, part)
    if (typeof newContent !== 'string') {
      return { ok: false, error: `apply_patch failed for ${rel}: hunk mismatch` }
    }
    if (Buffer.byteLength(newContent, 'utf-8') > MAX_AGENT_FILE_BYTES) {
      return { ok: false, error: `result too large: ${rel}` }
    }

    const base = rel.split(/[/\\]/).pop() ?? rel
    const singlePatchText = createPatch(base, oldContent, newContent, `a/${base}`, `b/${base}`)
    files.push({ relPath: rel, absPath: abs, oldContent, newContent, patchText: singlePatchText })
  }

  if (!files.length) return { ok: false, error: 'no file changes in patch' }
  return { ok: true, files }
}
