export type DrawIoSearchReplaceEdit = { search: string; replace: string }

/** 对 draw.io XML 做 search/replace 编辑（与 next-ai-draw-io edit_diagram 语义一致） */
export const applyDrawIoSearchReplaceEdits = (
  xml: string,
  edits: DrawIoSearchReplaceEdit[],
): { xml: string; errors: string[] } => {
  let out = xml
  const errors: string[] = []
  for (const e of edits) {
    const search = e.search ?? ''
    if (!search) {
      errors.push('empty search pattern')
      continue
    }
    if (!out.includes(search)) {
      errors.push(`pattern not found: ${search.slice(0, 80)}`)
      continue
    }
    out = out.replace(search, e.replace ?? '')
  }
  return { xml: out, errors }
}
