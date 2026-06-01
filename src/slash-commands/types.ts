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
}

export type SlashRunResult =
  | { ok: true; message: string; silent?: boolean }
  | { ok: false; message: string }
