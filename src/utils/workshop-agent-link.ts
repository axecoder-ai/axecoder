const LINKED_PREFIX = 'ma-'

/** Agent 聊天会话绑定的 Workshop 存储 id（同项目内 1:1） */
export const workshopIdForAgentChat = (agentChatId: string) =>
  `${LINKED_PREFIX}${agentChatId.trim()}`

/** 侧栏不单独展示、随 Agent 会话一并删除 */
export const isAgentLinkedWorkshopId = (workshopId: string) =>
  workshopId.trim().startsWith(LINKED_PREFIX)
