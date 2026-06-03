import type { ChatSession, ModelsFile } from '../types/axecoder'

export type SlashCommandDef = {
  name: string
  aliases?: string[]
  description: string
  run: (ctx: SlashContext, args: string) => Promise<SlashRunResult>
}

export type SlashContext = {
  projectRoot: string
  getSession: () => ChatSession | null
  setSession: (s: ChatSession) => void
  persist: () => Promise<void>
  newChat: () => Promise<void>
  getModelsFile: () => ModelsFile
  setModelsFile: (m: ModelsFile) => void
  setActiveModel: (id: string) => Promise<{ ok: boolean; data?: ModelsFile }>
  openModelsSettings: () => void
  /** 当前聊天中最近一次 Agent 运行的 sessionId */
  getAgentSessionId?: () => string | undefined
}

export type SlashRunResult =
  | {
      ok: true
      message: string
      silent?: boolean
      /** Skill 动态命令：注入会话的正文 */
      skillText?: string
      skillName?: string
      /** 自定义命令：展开后作为用户消息发给模型 */
      sendPrompt?: string
    }
  | { ok: false; message: string }
