export type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export type ConflictAction = 'skip' | 'rename' | 'replace'

export type SearchHit = {
  file: string
  line: number
  col: number
  text: string
}

export type AppTheme = 'vscode' | 'aura-light' | 'aura-dark'

export type AppSettings = {
  schemaVersion: 1
  autoSave: boolean
  autoSaveDelay: number
  fontSize: number
  theme: AppTheme
}

export type ModelProvider = 'openai' | 'ollama' | 'anthropic'

export type ModelEntry = {
  id: string
  name: string
  provider: ModelProvider
  modelId: string
  baseUrl: string
  enabled: boolean
}

export type ModelsFile = {
  schemaVersion: 1
  activeModelId: string
  models: ModelEntry[]
}

export type ModelSaveInput = ModelEntry & { apiKey?: string }

export type ModelsMutationResult =
  | { ok: true; data: ModelsFile }
  | { ok: false; error: string }

export type AiChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AiChatResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  thought?: string
  /** 发送时引用的项目文件（相对路径展示用绝对 path 存） */
  filePaths?: string[]
}

export type ChatSessionMeta = {
  id: string
  title: string
  updatedAt: number
}

export type ChatSession = ChatSessionMeta & {
  messages: ChatMessage[]
}

export type GitStatusResult =
  | { ok: true; branch: string; changes: { code: string; file: string }[] }
  | { ok: false; error: string }

export type MenuChannel =
  | 'menu:save'
  | 'menu:saveAs'
  | 'menu:closeTab'
  | 'menu:newFile'
  | 'menu:openFile'
  | 'menu:find'
  | 'menu:findInFiles'
  | 'menu:toggleChat'
  | 'menu:toggleAgents'
  | 'menu:toggleTerminal'
  | 'menu:commandPalette'

export type WritcraftFs = {
  getLastProject: () => Promise<string | null>
  openProject: (rootPath?: string) => Promise<{ rootPath: string; tree: FileNode } | null>
  openFolder: () => Promise<{ rootPath: string; tree: FileNode } | null>
  openFile: () => Promise<{ path: string; content: string } | null>
  onOpenProject: (callback: () => void) => () => void
  onMenuAction: (callback: (channel: MenuChannel) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void
  onFileChanged: (callback: (payload: { kind: string; path: string }) => void) => () => void
  confirmQuit: () => void
  readTree: (rootPath: string) => Promise<{ rootPath: string; tree: FileNode }>
  readFile: (filePath: string) => Promise<{ content: string }>
  writeFile: (filePath: string, content: string) => Promise<{ ok: true }>
  saveAs: (content: string, defaultPath?: string) => Promise<{ path: string } | null>
  createFile: (parentPath: string, name: string) => Promise<{ path: string }>
  createDir: (parentPath: string, name: string) => Promise<{ path: string }>
  delete: (targetPath: string) => Promise<{ ok: true }>
  rename: (oldPath: string, newPath: string) => Promise<{ path: string }>
  copy: (
    srcPath: string,
    destPath: string,
    onConflict?: ConflictAction,
  ) => Promise<{ path: string; skipped?: true }>
  move: (
    srcPath: string,
    destPath: string,
    onConflict?: ConflictAction,
  ) => Promise<{ path: string; skipped?: true }>
  revealInFinder: (targetPath: string) => Promise<{ ok: true }>
  search: (rootPath: string, query: string) => Promise<{ hits: SearchHit[] }>
  getRecentFiles: () => Promise<{ files: string[] }>
  watchStart: (rootPath: string) => Promise<{ ok: true }>
  watchStop: () => Promise<{ ok: true }>
  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  listModels: () => Promise<ModelsFile>
  saveModel: (input: ModelSaveInput) => Promise<ModelsMutationResult>
  deleteModel: (id: string) => Promise<ModelsMutationResult>
  toggleModel: (id: string, enabled: boolean) => Promise<ModelsMutationResult>
  setActiveModel: (id: string) => Promise<ModelsMutationResult>
  aiChat: (modelId: string, messages: AiChatMessage[]) => Promise<AiChatResult>
  gitStatus: (cwd: string) => Promise<GitStatusResult>
  terminalStart: (cwd: string) => Promise<{ ok: true }>
  terminalWrite: (data: string) => Promise<{ ok: boolean }>
  terminalStop: () => Promise<{ ok: true }>
  onTerminalData: (callback: (text: string) => void) => () => void
  getChatSessions: (projectRoot: string) => Promise<{ sessions: ChatSessionMeta[] }>
  getChatSession: (
    projectRoot: string,
    sessionId: string,
  ) => Promise<{ session: ChatSession | null }>
  saveChatSession: (
    projectRoot: string,
    session: ChatSession,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  deleteChatSession: (
    projectRoot: string,
    sessionId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
}

declare global {
  interface Window {
    writcraft: WritcraftFs
  }
}

export {}
