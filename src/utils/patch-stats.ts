/** patch 行数统计与 diff 反推（供聊天栏 Review） */
// diff 包无官方 @types，与 electron/main/agent/edit-utils 一致
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { applyPatch, parsePatch, reversePatch } from 'diff'

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

/** Review diff：左侧旧内容，右侧新内容（旧 → 新） */
export const contentsForReviewDiff = (
  patchText: string,
  modifiedOnDisk: string,
): { original: string; modified: string } => {
  const trimmed = patchText.trim()
  if (!trimmed) {
    return { original: '', modified: modifiedOnDisk }
  }
  const parsed = parsePatch(trimmed)
  if (!parsed.length) {
    return { original: '', modified: modifiedOnDisk }
  }

  const reversed = reversePatch(parsed)
  const originalFromDisk = applyPatch(modifiedOnDisk, reversed)
  if (typeof originalFromDisk === 'string') {
    return { original: originalFromDisk, modified: modifiedOnDisk }
  }

  const modifiedFromPatch = applyPatch('', parsed)
  if (typeof modifiedFromPatch === 'string') {
    const original = applyPatch(modifiedFromPatch, reversed)
    return {
      original: typeof original === 'string' ? original : '',
      modified: modifiedFromPatch,
    }
  }

  return { original: '', modified: modifiedOnDisk }
}

/** @deprecated 用 contentsForReviewDiff */
export const originalContentFromPatch = (patchText: string, modified: string): string =>
  contentsForReviewDiff(patchText, modified).original
