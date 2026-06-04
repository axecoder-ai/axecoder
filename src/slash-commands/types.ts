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
  /** sessionId of most recent Agent run in chat */
  getAgentSessionId?: () => string | undefined
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
    }
  | { ok: false; message: string }
