import { listUsers } from '../users-store'
import { resolveUserSkillPromptBlock } from '../workshop/workshop-user-skills'
import type { AgentLoopMessage } from './agent-types'
import type { UserEntry } from '../users-types'

export const findUserById = (users: UserEntry[], id: string): UserEntry | undefined =>
  users.find((u) => u.id === id)

/** 将 Users 角色 persona + 绑定 Skill/命令注入 Agent system prompt */
export const buildAgentRolePersonaAddon = async (
  projectRoot: string,
  assigneeUserId: string | undefined,
  opts?: { roleWorkflowInvoke?: boolean },
): Promise<{ addon: string; user?: UserEntry }> => {
  const id = assigneeUserId?.trim()
  if (!id) return { addon: '' }
  const users = (await listUsers()).users
  const user = findUserById(users, id)
  if (!user) return { addon: '' }
  const workflowInvoke = opts?.roleWorkflowInvoke === true
  const skillBlock = workflowInvoke ? '' : await resolveUserSkillPromptBlock(user, projectRoot)
  const lines = [
    `[Agent role persona · ${user.displayName} (${user.role})]`,
    workflowInvoke
      ? 'The latest user message IS the workflow playbook. Execute it step by step immediately. Do NOT greet, introduce yourself, or ask what to work on.'
      : 'Respond as this configured team member, not a generic assistant.',
    user.expertise?.trim() && !workflowInvoke ? `Expertise: ${user.expertise.trim()}` : '',
    skillBlock,
  ].filter(Boolean)
  return { addon: lines.join('\n\n'), user }
}

export const applyAgentRolePersonaToMessages = async (
  projectRoot: string,
  assigneeUserId: string | undefined,
  messages: AgentLoopMessage[],
  roleWorkflowInvoke?: boolean,
): Promise<string | undefined> => {
  const id = assigneeUserId?.trim()
  if (!id) return undefined
  const users = (await listUsers()).users
  const user = findUserById(users, id)
  if (!user) return undefined
  // 内置工作流角色：只保留回复头像 speaker，不注入 persona（@ 时等同 /slash 执行命令）
  if (user.isBuiltin) return user.id

  const { addon } = await buildAgentRolePersonaAddon(projectRoot, assigneeUserId, {
    roleWorkflowInvoke,
  })
  if (!addon || !messages[0] || messages[0].role !== 'system') return user.id
  messages[0] = { ...messages[0], content: `${messages[0].content}\n\n${addon}` }
  return user.id
}
