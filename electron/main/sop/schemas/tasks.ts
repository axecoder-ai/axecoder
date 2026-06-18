export type SopTaskItem = {
  id: string
  title: string
  assignee?: string
  deps?: string[]
}

export type SopTasks = {
  title: string
  tasks: SopTaskItem[]
}

export const parseTasksJson = (
  raw: string,
): { ok: true; tasks: SopTasks } | { ok: false; error: string } => {
  try {
    const data = JSON.parse(raw) as SopTasks
    if (!data || typeof data.title !== 'string') {
      return { ok: false, error: 'Tasks missing title' }
    }
    if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
      return { ok: false, error: 'Tasks list must be non-empty' }
    }
    for (const t of data.tasks) {
      if (!t.id || !t.title) return { ok: false, error: 'Each task needs id and title' }
    }
    return { ok: true, tasks: data }
  } catch {
    return { ok: false, error: 'Tasks invalid JSON' }
  }
}

export const tasksToMarkdown = (doc: SopTasks): string => {
  const lines = [`# ${doc.title}`, '', '## Tasks']
  for (const t of doc.tasks) {
    const deps = t.deps?.length ? ` (deps: ${t.deps.join(', ')})` : ''
    const who = t.assignee ? ` [@${t.assignee}]` : ''
    lines.push(`- [ ] **${t.id}** ${t.title}${who}${deps}`)
  }
  return lines.join('\n')
}
