import fs from 'node:fs/promises'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { applyPatch, parsePatch, reversePatch } from 'diff'
import { resolvePathInProject } from './agent-path'
import { writeProjectFile } from './agent-fs'

export const revertFileWithPatch = async (
  projectRoot: string,
  filePath: string,
  patchText: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const resolved = resolvePathInProject(projectRoot, filePath)
  if (!resolved) return { ok: false, error: 'path outside project' }

  const trimmed = patchText.trim()
  if (!trimmed) return { ok: false, error: 'patch is empty' }

  let parsed: ReturnType<typeof parsePatch>
  try {
    parsed = parsePatch(trimmed)
  } catch (e) {
    return { ok: false, error: `invalid patch: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (!parsed.length) return { ok: false, error: 'invalid patch: no hunks' }

  let current = ''
  try {
    current = await fs.readFile(resolved, 'utf-8')
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') return { ok: false, error: err.message ?? String(e) }
  }

  const reversed = reversePatch(parsed)
  const restored = applyPatch(current, reversed)
  if (typeof restored !== 'string') {
    return { ok: false, error: 'revert failed: file on disk does not match expected post-patch state' }
  }

  try {
    if (!restored) {
      await fs.unlink(resolved).catch(() => {})
    } else {
      await writeProjectFile(resolved, restored)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
