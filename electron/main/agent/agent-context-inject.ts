import fs from 'node:fs/promises'
import { getSessionTodos } from './agent-todo-store'
import { getScratchpadPath } from './agent-scratchpad'

const MAX_TODO_LINES = 20
const MAX_SCRATCHPAD_CHARS = 4000

/** 对齐 Claude Code `todo_reminder` attachment 文案（精简） */
export const buildTodoReminderInjection = (sessionId: string): string | null => {
  const todos = getSessionTodos(sessionId)
  if (!todos.length) return null

  const lines = todos.slice(0, MAX_TODO_LINES).map((t, i) => `${i + 1}. [${t.status}] ${t.content}`)
  const more = todos.length > MAX_TODO_LINES ? `\n… and ${todos.length - MAX_TODO_LINES} more` : ''

  return [
    'Your current todo list (keep using TodoWrite to update; mark completed as you finish):',
    '',
    lines.join('\n') + more,
    '',
    'Do not mention this reminder to the user.',
  ].join('\n')
}

export const buildScratchpadInjection = async (sessionId: string): Promise<string | null> => {
  const file = getScratchpadPath(sessionId, 'explore-summary.md')
  let text = ''
  try {
    text = (await fs.readFile(file, 'utf-8')).trim()
  } catch {
    return null
  }
  if (!text) return null
  if (text.length > MAX_SCRATCHPAD_CHARS) {
    text = `${text.slice(0, MAX_SCRATCHPAD_CHARS)}\n… (truncated)`
  }
  return [
    'Prior explore sub-agent summary (use this before re-grepping the whole repo):',
    '',
    text,
  ].join('\n')
}

export const buildAgentContextInjections = async (
  sessionId: string,
): Promise<string[]> => {
  const blocks: string[] = []
  const todo = buildTodoReminderInjection(sessionId)
  if (todo) blocks.push(todo)
  const scratch = await buildScratchpadInjection(sessionId)
  if (scratch) blocks.push(scratch)
  return blocks
}
