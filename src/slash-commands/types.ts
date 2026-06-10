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
  openPermissionsSettings: () => void
  /** sessionId of most recent Agent run in chat */
  getAgentSessionId?: () => string | undefined
  /** 切换到已保存的 chat session */
  selectSession?: (id: string) => Promise<boolean>
  /** 切换聊天模式（左下角模式选择器） */
  setChatMode?: (id: import('../types/axecoder').ChatModeId) => void
  getChatEffort?: () => import('../../shared/reasoning-effort').ReasoningEffortLevel
  setChatEffort?: (level: import('../../shared/reasoning-effort').ReasoningEffortLevel) => void
}

export type SlashRunResult =
  | {
      ok: true
      message: string
      silent?: boolean
      /** Skill dynamic command: body injected into session */
      skillText?: string
      skillName?: string
      /** Custom command: expanded text sent as user message */
      sendPrompt?: string
      /** 内置工作流：等同 @角色 执行 playbook，自动落盘 */
      roleWorkflowInvoke?: boolean
    }
  | { ok: false; message: string }
