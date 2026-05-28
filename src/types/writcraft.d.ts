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
  reasoningContent?: string
}

export type AiChatResult =
  | { ok: true; text: string; content: string; reasoningContent?: string }
  | { ok: false; error: string }

export type AgentPendingWrite = {
  id: string
  tool: 'Edit' | 'Write' | 'Delete' | 'Move'
  filePath: string
  summary: string
  patchText: string
}

export type AgentToolLogEntry = {
  name: string
  summary: string
  ok: boolean
}

export type AgentProgressPayload = {
  sessionId: string
  turn: number
  kind: 'model' | 'tool'
  status: 'start' | 'done'
  toolName?: string
  summary?: string
  ok?: boolean
}

export type AgentSendResult =
  | {
      ok: true
      status: 'done'
      assistantText: string
      toolLog: AgentToolLogEntry[]
      assistantContent?: string
      reasoningContent?: string
    }
  | {
      ok: true
      status: 'pending'
      sessionId: string
      pending: AgentPendingWrite[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
      assistantContent?: string
      reasoningContent?: string
    }
  | { ok: false; error: string }

export type AgentContinueResult = AgentSendResult

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  thought?: string
  /** 发送时引用的项目文件（相对路径展示用绝对 path 存） */
  filePaths?: string[]
  /** 已展开文件内容后的 API 文本，避免每轮重复读盘 */
  apiContent?: string
  /** API 原始 assistant content（可与 reasoning 分离） */
  assistantContent?: string
  /** DeepSeek 思考模式：下一轮须回传 */
  reasoningContent?: string
  /** Agent 工具执行摘要 */
  toolLog?: AgentToolLogEntry[]
  /** 待用户确认的写盘操作 */
  pendingWrites?: AgentPendingWrite[]
  agentSessionId?: string
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

export type WindowLayout = {
  fullscreen: boolean
  platform: string
}

export type WritcraftFs = {
  getWindowLayout: () => Promise<WindowLayout>
  onWindowLayout: (callback: (layout: WindowLayout) => void) => () => void
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
  expandChatUserWithFiles: (
    projectRoot: string,
    text: string,
    filePaths: string[],
  ) => Promise<string>
  aiChat: (modelId: string, messages: AiChatMessage[]) => Promise<AiChatResult>
  agentSend: (
    projectRoot: string,
    modelId: string,
    messages: AiChatMessage[],
  ) => Promise<AgentSendResult>
  agentConfirmWrite: (sessionId: string, pendingId: string) => Promise<AgentContinueResult>
  agentRejectWrite: (
    sessionId: string,
    pendingId: string,
    reason?: string,
  ) => Promise<AgentContinueResult>
  onAgentProgress: (callback: (payload: AgentProgressPayload) => void) => () => void
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
