import fs from 'node:fs/promises'
import { resolvePathInProject } from './agent-path'

export const editNotebookCell = async (
  projectRoot: string,
  file_path: string,
  cell_idx: number,
  is_new_cell: boolean,
  cell_language: string,
  old_string: string,
  new_string: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> => {
  const resolved = resolvePathInProject(projectRoot, file_path)
  if (!resolved) return { ok: false, error: 'Path outside project' }
  if (!resolved.endsWith('.ipynb')) return { ok: false, error: 'NotebookEdit only supports .ipynb files' }

  let raw = ''
  try {
    raw = await fs.readFile(resolved, 'utf-8')
  } catch {
    return { ok: false, error: 'Notebook not found' }
  }

  let nb: { cells?: { cell_type?: string; source?: string | string[]; metadata?: Record<string, unknown> }[] }
  try {
    nb = JSON.parse(raw) as typeof nb
  } catch {
    return { ok: false, error: 'Invalid notebook JSON' }
  }

  if (!Array.isArray(nb.cells)) nb.cells = []

  if (is_new_cell) {
    const cell = {
      cell_type: cell_language === 'markdown' ? 'markdown' : 'code',
      metadata: {},
      source: new_string.split('\n').map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line)),
    }
    nb.cells.splice(cell_idx, 0, cell)
    await fs.writeFile(resolved, JSON.stringify(nb, null, 1), 'utf-8')
    return { ok: true, message: `Created cell at index ${cell_idx}` }
  }

  const cell = nb.cells[cell_idx]
  if (!cell) return { ok: false, error: `Cell index ${cell_idx} out of range` }

  const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source ?? '')
  if (old_string && !src.includes(old_string)) {
    return { ok: false, error: 'old_string not found in cell' }
  }
  const updated = old_string ? src.replace(old_string, new_string) : new_string
  cell.source = updated.split('\n').map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line))
  await fs.writeFile(resolved, JSON.stringify(nb, null, 1), 'utf-8')
  return { ok: true, message: `Updated cell ${cell_idx}` }
}
