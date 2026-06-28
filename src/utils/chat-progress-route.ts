/** 将 agent progress 路由到 chatId；禁止猜绑队列 */
export const resolveProgressChatId = (
  payload: { sessionId: string; clientChatId?: string },
  agentToChat: Readonly<Record<string, string>>,
): string | undefined => {
  const client = payload.clientChatId?.trim()
  if (client) return client
  return agentToChat[payload.sessionId]
}
