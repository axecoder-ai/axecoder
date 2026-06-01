export type AgentTodoItem = {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

export type AgentTaskItem = {
  id: string
  subject: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

const todosBySession = new Map<string, AgentTodoItem[]>()
const tasksBySession = new Map<string, AgentTaskItem[]>()
let todoSeq = 0
let taskSeq = 0

const nextTodoId = () => `todo-${Date.now()}-${todoSeq++}`
const nextTaskId = () => `task-${Date.now()}-${taskSeq++}`

export const getSessionTodos = (sessionId: string) => {
  if (!todosBySession.has(sessionId)) todosBySession.set(sessionId, [])
  return todosBySession.get(sessionId)!
}

export const getSessionTasks = (sessionId: string) => {
  if (!tasksBySession.has(sessionId)) tasksBySession.set(sessionId, [])
  return tasksBySession.get(sessionId)!
}

export const mergeTodos = (sessionId: string, items: AgentTodoItem[]) => {
  const list = getSessionTodos(sessionId)
  for (const item of items) {
    const idx = list.findIndex((t) => t.id === item.id)
    if (idx >= 0) list[idx] = item
    else list.push(item)
  }
  return [...list]
}

export const createTask = (
  sessionId: string,
  subject: string,
  description: string,
): AgentTaskItem => {
  const task: AgentTaskItem = {
    id: nextTaskId(),
    subject,
    description,
    status: 'pending',
  }
  getSessionTasks(sessionId).push(task)
  return task
}

export const getTask = (sessionId: string, taskId: string) =>
  getSessionTasks(sessionId).find((t) => t.id === taskId)

export const updateTask = (
  sessionId: string,
  taskId: string,
  patch: Partial<Pick<AgentTaskItem, 'subject' | 'description' | 'status'>>,
) => {
  const task = getTask(sessionId, taskId)
  if (!task) return null
  if (patch.subject !== undefined) task.subject = patch.subject
  if (patch.description !== undefined) task.description = patch.description
  if (patch.status !== undefined) task.status = patch.status
  return task
}

export const listTasks = (sessionId: string) => [...getSessionTasks(sessionId)]
