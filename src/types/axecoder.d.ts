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

export type AgentOutputStyleId = 'default' | 'Explanatory' | 'Learning'

export type AppLocale = 'en' | 'zh-CN'

export type AppSettings = {
  schemaVersion: 1
  locale?: AppLocale
  autoSave: boolean
  autoSaveDelay: number
  fontSize: number
  theme: AppTheme
  agentAutoApplyWrites: boolean
  agentOutputStyle: AgentOutputStyleId
  agentCompletionSoundEnabled?: boolean
  agentCompletionSoundPath?: string
  /** UI only: original filename when picking files */
  agentCompletionSoundDisplayName?: string
  rulesIncludeThirdPartyPlugins?: boolean
  profileDisplayName?: string
  profileAvatarPath?: string
}

export type PickProfileAvatarResult =
  | { ok: true; cancelled: true }
  | { ok: true; cancelled: false; avatarPath: string; dataUrl: string }
  | { ok: false; error: string }

export type PickCompletionSoundResult =
  | { ok: true; cancelled: true }
  | { ok: true; cancelled: false; path: string; displayName: string }
  | { ok: false; error: string }

export type CompletionSoundDataUrlResult =
  | { ok: true; dataUrl: string | null }
  | { ok: false; error: string }

export type ChatModeId =
  | 'agent'
  | 'reflection'
  | 'rppit'
  | 'planning'
  | 'planning-only'
  | 'multi-agent'

export type ModelProvider = 'openai' | 'ollama' | 'anthropic'

export type ModelEntry = {
  id: string
  name: string
  provider: ModelProvider
  modelId: string
  fastApiModelId?: string
  baseUrl: string
  enabled: boolean
  supportsVision?: boolean
}

export type ChatImageRef = {
  id: string
  mimeType: string
  storagePath: string
}

export type AiChatImagePart = {
  mimeType: string
  data: string
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

export type ModelPingResult =
  | { ok: true; preview: string }
  | { ok: false; error: string }

export type UserEntry = {
  id: string
  displayName: string
  role: string
  expertise: string
  avatarPath: string
  skillSlugs?: string[]
  isBuiltin?: boolean
  builtinRole?: 'manager'
}

export type AvailableSkillItem = {
  slug: string
  label: string
  kind: 'skill' | 'command'
  source: string
}

export type UsersFile = {
  schemaVersion: 1
  users: UserEntry[]
}

export type UserSaveInput = {
  id: string
  displayName: string
  role: string
  expertise: string
  avatarPath?: string
  skillSlugs?: string[]
}

export type UsersAvailableSkillsResult =
  | { ok: true; data: AvailableSkillItem[] }
  | { ok: false; error: string }

export type UsersMutationResult =
  | { ok: true; data: UsersFile }
  | { ok: false; error: string }

export type UsersPickAvatarResult =
  | { ok: true; cancelled: true }
  | { ok: true; cancelled: false; avatarPath: string; dataUrl: string }
  | { ok: false; error: string }

export type UsersAvatarDataUrlResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string }

export type RuleScope = 'user' | 'project'

export type RuleListItem = {
  scope: RuleScope
  fileName: string
  description: string
  alwaysApply: boolean
  globs?: string
}

export type RuleDetail = RuleListItem & {
  body: string
}

export type RulesListResult = {
  rules: RuleListItem[]
  projectRoot: string | null
}

export type RuleSaveInput = {
  scope: RuleScope
  fileName: string
  description: string
  alwaysApply: boolean
  globs?: string
  body: string
  projectRoot?: string
  isNew?: boolean
}

export type RulesMutationResult =
  | { ok: true; data: RulesListResult }
  | { ok: false; error: string }

export type RulesReadResult =
  | { ok: true; data: RuleDetail }
  | { ok: false; error: string }

export type AiChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: AiChatImagePart[]
  reasoningContent?: string
}

export type AiChatResult =
  | { ok: true; text: string; content: string; reasoningContent?: string }
  | { ok: false; error: string }

export type AiStreamPayload = {
  streamId: string
  delta: string
}

export type AgentPendingWrite = {
  id: string
  tool: 'Edit' | 'Write' | 'Delete' | 'Move'
  filePath: string
  summary: string
  patchText: string
}

export type AgentAskUserOption = { id: string; label: string }

export type AgentAskUserQuestion = {
  id: string
  prompt: string
  options: AgentAskUserOption[]
  allow_multiple?: boolean
}

export type AgentPendingAskUser = {
  id: string
  questions: AgentAskUserQuestion[]
}

export type AgentPendingBash = {
  id: string
  command: string
  timeoutMs?: number
}

export type AgentToolLogEntry = {
  name: string
  summary: string
  ok: boolean
}

export type AgentProgressPayload =
  | {
      sessionId: string
      turn: number
      kind: 'model' | 'tool'
      status: 'start' | 'done'
      toolName?: string
      summary?: string
      ok?: boolean
    }
  | {
      sessionId: string
      kind: 'delta'
      delta: string
    }
  | {
      sessionId: string
      kind: 'subagent'
      taskId: string
      status: 'running' | 'completed' | 'failed' | 'stopped'
      description: string
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
      pendingBashes?: AgentPendingBash[]
      pendingAsks?: AgentPendingAskUser[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
      assistantContent?: string
      reasoningContent?: string
    }
  | { ok: false; error: string }

export type AgentContinueResult = AgentSendResult

export type WorkshopRoleId = 'manager' | 'backend' | 'frontend' | 'tester' | 'system' | 'user'

export type WorkshopStepStatus = 'pending' | 'running' | 'done' | 'redo'

export type WorkshopStep = {
  id: string
  title: string
  assigneeUserId: string
  status: WorkshopStepStatus
}

export type WorkshopPhase = 'idle' | 'planning' | 'running' | 'waiting_user' | 'done'

export type WorkshopMessageKind = 'chat' | 'reasoning'

export type WorkshopMessage = {
  id: string
  roleId: WorkshopRoleId
  speakerUserId?: string
  text: string
  relatedFiles?: string[]
  createdAt: number
  reasoningContent?: string
  hidden?: boolean
  /** @deprecated merged into reasoningContent on read */
  kind?: WorkshopMessageKind
}

export type WorkshopSessionMeta = {
  id: string
  title: string
  updatedAt: number
}

export type WorkshopSession = WorkshopSessionMeta & {
  userBrief: string
  modelId: string
  messages: WorkshopMessage[]
  phase: WorkshopPhase
  pendingQuestion?: string
  mountedFiles: string[]
  stepPlan?: WorkshopStep[]
  currentStepIndex?: number
}

export type WorkshopProgressPayload = {
  workshopId: string
  roleId: WorkshopRoleId
  status: 'thinking' | 'speaking' | 'done'
}

export type WorkshopRunResult =
  | { ok: true; session: WorkshopSession }
  | { ok: false; error: string }

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  /** Slash command line (/foo bar); UI command pill only */
  slashInvoke?: string
  /** Command pill only; body via apiContent or next user message */
  slashOnly?: boolean
  thought?: string
  /** Project files referenced on send (relative display, absolute path stored) */
  filePaths?: string[]
  /** 粘贴图片引用（~/.axecoder/chat-attachments） */
  imageRefs?: ChatImageRef[]
  /** 用户气泡展示用 data URL（与 imageRefs 一一对应） */
  imagePreviews?: string[]
  /** 已Expand文件内容后的 API Text，避免每轮重复读盘 */
  apiContent?: string
  /** @deprecated 仅存 imageRefs，Send时由 buildApiMessages 解析 */
  apiImages?: AiChatImagePart[]
  /** API 原始 assistant content（可与 reasoning 分离） */
  assistantContent?: string
  /** DeepSeek 思考模式：下一轮须回传 */
  reasoningContent?: string
  /** Agent 工具执行摘要 */
  toolLog?: AgentToolLogEntry[]
  /** 待用户confirm的写盘操作 */
  pendingWrites?: AgentPendingWrite[]
  /** 待用户回答的结构化Problems */
  pendingAsks?: AgentPendingAskUser[]
  /** 待用户confirm执行的 Bash 命令 */
  pendingBashes?: AgentPendingBash[]
  agentSessionId?: string
}

export type SessionKind = 'agent' | 'workshop'

/** Unified session list项（Agents 侧栏） */
export type SessionListItem = {
  id: string
  title: string
  updatedAt: number
  kind: SessionKind
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

export type AxeCoderFs = {
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
  exportMarkdownPdf: (
    filePath: string,
  ) => Promise<{ ok: true; path: string } | { cancelled: true }>
  exportMarkdownDocx: (
    filePath: string,
  ) => Promise<{ ok: true; path: string } | { cancelled: true }>
  search: (rootPath: string, query: string) => Promise<{ hits: SearchHit[] }>
  getRecentFiles: () => Promise<{ files: string[] }>
  getRecentProjects: () => Promise<{ projects: string[] }>
  watchStart: (rootPath: string) => Promise<{ ok: true }>
  watchStop: () => Promise<{ ok: true }>
  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  pickCompletionSound: () => Promise<PickCompletionSoundResult>
  getCompletionSoundDataUrl: () => Promise<CompletionSoundDataUrlResult>
  pickProfileAvatar: () => Promise<PickProfileAvatarResult>
  listModels: () => Promise<ModelsFile>
  saveModel: (input: ModelSaveInput) => Promise<ModelsMutationResult>
  deleteModel: (id: string) => Promise<ModelsMutationResult>
  toggleModel: (id: string, enabled: boolean) => Promise<ModelsMutationResult>
  setActiveModel: (id: string) => Promise<ModelsMutationResult>
  pingModel: (id: string) => Promise<ModelPingResult>
  listUsers: () => Promise<UsersFile>
  saveUser: (input: UserSaveInput) => Promise<UsersMutationResult>
  deleteUser: (id: string) => Promise<UsersMutationResult>
  getUserAvatarDataUrl: (avatarPath: string) => Promise<UsersAvatarDataUrlResult>
  pickUserAvatar: (userId: string) => Promise<UsersPickAvatarResult>
  listAvailableSkills: (projectRoot?: string | null) => Promise<UsersAvailableSkillsResult>
  listRules: (projectRoot?: string | null) => Promise<RulesMutationResult>
  readRule: (scope: RuleScope, fileName: string, projectRoot?: string) => Promise<RulesReadResult>
  saveRule: (input: RuleSaveInput) => Promise<RulesMutationResult>
  deleteRule: (scope: RuleScope, fileName: string, projectRoot?: string) => Promise<RulesMutationResult>
  getRulesThirdPartyImport: () => Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }>
  setRulesThirdPartyImport: (enabled: boolean) => Promise<{ ok: true } | { ok: false; error: string }>
  expandChatUserWithFiles: (
    projectRoot: string,
    text: string,
    filePaths: string[],
  ) => Promise<string>
  saveChatPastedImage: (
    sessionId: string,
    base64: string,
    mimeType: string,
  ) => Promise<
    | { ok: true; ref: ChatImageRef; dataUrl: string }
    | { ok: false; error: string }
  >
  resolveChatImageRefs: (
    refs: ChatImageRef[],
  ) => Promise<
    | { ok: true; images: AiChatImagePart[] }
    | { ok: false; error: string }
  >
  getChatImagePreview: (
    ref: ChatImageRef,
  ) => Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }>
  aiChat: (modelId: string, messages: AiChatMessage[], streamId?: string) => Promise<AiChatResult>
  onAiStream: (callback: (payload: AiStreamPayload) => void) => () => void
  agentSend: (
    projectRoot: string,
    modelId: string,
    messages: AiChatMessage[],
    chatMode?: ChatModeId,
  ) => Promise<AgentSendResult>
  agentStop: (sessionId: string) => Promise<{ ok: true } | { ok: false; error: string }>
  agentRunUserShell: (
    projectRoot: string,
    command: string,
  ) => Promise<{ ok: true; text: string; exitCode: number | null } | { ok: false; error: string }>
  chatCompact: (
    messages: AiChatMessage[],
  ) => Promise<{ ok: true; messages: AiChatMessage[]; summary: string } | { ok: false; error: string }>
  agentHooksHelp: () => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  agentListMcp: () => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  agentListSkills: (
    projectRoot: string,
  ) => Promise<
    | { ok: true; skills: { name: string; path: string; source: string }[] }
    | { ok: false; error: string }
  >
  agentLoadSkill: (
    projectRoot: string,
    skillName: string,
  ) => Promise<
    | { ok: true; name: string; text: string; path: string }
    | { ok: false; error: string }
  >
  agentListCustomCommands: (
    projectRoot: string,
  ) => Promise<
    | {
        ok: true
        commands: { name: string; path: string; description: string; source: string }[]
        dirs: string[]
      }
    | { ok: false; error: string }
  >
  agentLoadCustomCommand: (
    projectRoot: string,
    commandName: string,
  ) => Promise<
    | { ok: true; name: string; text: string; path: string }
    | { ok: false; error: string }
  >
  agentListBuiltinCommands: () => Promise<
    | {
        ok: true
        commands: { name: string; path: string; description: string; source: string }[]
        dir: string
      }
    | { ok: false; error: string }
  >
  agentLoadBuiltinCommand: (
    commandName: string,
  ) => Promise<
    | { ok: true; name: string; text: string; path: string }
    | { ok: false; error: string }
  >
  agentListBuiltinSkills: () => Promise<
    | {
        ok: true
        skills: { name: string; path: string; description: string; source: string }[]
        dir: string
      }
    | { ok: false; error: string }
  >
  agentLoadBuiltinSkill: (
    skillName: string,
  ) => Promise<
    | { ok: true; name: string; text: string; path: string }
    | { ok: false; error: string }
  >
  agentListOutputStyles: (projectRoot?: string) => Promise<
    | {
        ok: true
        activeId: string
        styles: { id: string; name: string; description: string; source: string }[]
        dirs: string[]
      }
    | { ok: false; error: string }
  >
  agentSetOutputStyle: (
    styleId: string,
  ) => Promise<{ ok: true; activeId: string } | { ok: false; error: string }>
  agentPlanModeHelp: () => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  agentRewindHelp: (
    projectRoot: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  agentListSessions: () => Promise<{
    ok: true
    sessions: {
      id: string
      turn: number
      projectRoot: string
      modelId: string
      messageCount: number
    }[]
  }>
  agentListCheckpoints: (sessionId: string) => Promise<
    | {
        ok: true
        checkpoints: {
          id: string
          turn: number
          label: string
          createdAt: number
          fileCount: number
        }[]
      }
    | { ok: false; error: string }
  >
  agentRewind: (
    sessionId: string,
    checkpointId?: string,
  ) => Promise<
    | { ok: true; label: string; restoredFiles: number }
    | { ok: false; error: string }
  >
  agentListBackgroundTasks: (sessionId?: string) => Promise<{
    ok: true
    tasks: {
      id: string
      description: string
      status: 'running' | 'completed' | 'failed' | 'stopped'
      startedAt: number
    }[]
  }>
  agentReadMemory: () => Promise<
    { ok: true; path: string; text: string } | { ok: false; error: string }
  >
  agentWriteMemory: (text: string) => Promise<
    { ok: true; path: string } | { ok: false; error: string }
  >
  agentInitAgentsMd: (
    projectRoot: string,
  ) => Promise<
    { ok: true; path: string; created: boolean } | { ok: false; error: string }
  >
  agentConfirmWrite: (sessionId: string, pendingId: string) => Promise<AgentContinueResult>
  agentConfirmAllWrites: (sessionId: string) => Promise<AgentContinueResult>
  agentRejectWrite: (
    sessionId: string,
    pendingId: string,
    reason?: string,
  ) => Promise<AgentContinueResult>
  agentRejectAllWrites: (sessionId: string, reason?: string) => Promise<AgentContinueResult>
  agentAnswerQuestions: (
    sessionId: string,
    pendingId: string,
    answers: Record<string, string | string[]>,
  ) => Promise<AgentContinueResult>
  agentConfirmBash: (sessionId: string, pendingId: string) => Promise<AgentContinueResult>
  agentRejectBash: (
    sessionId: string,
    pendingId: string,
    reason?: string,
  ) => Promise<AgentContinueResult>
  onAgentProgress: (callback: (payload: AgentProgressPayload) => void) => () => void
  gitStatus: (cwd: string) => Promise<GitStatusResult>
  terminalStart: (cwd: string) => Promise<{ ok: true }>
  terminalWrite: (data: string) => Promise<{ ok: boolean }>
  terminalInterrupt: () => Promise<{ ok: boolean }>
  terminalStop: () => Promise<{ ok: true }>
  onTerminalData: (callback: (text: string) => void) => () => void
  listAllSessions: (projectRoot: string) => Promise<{ sessions: SessionListItem[] }>
  suggestChatSessionTitle: (
    modelId: string,
    messages: { role: 'user' | 'assistant'; text: string }[],
    currentTitle: string,
  ) => Promise<{ ok: true; title: string } | { ok: false; error: string }>
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
  getWorkshopSessions: (projectRoot: string) => Promise<{ sessions: WorkshopSessionMeta[] }>
  getWorkshopSession: (
    projectRoot: string,
    workshopId: string,
  ) => Promise<{ session: WorkshopSession | null }>
  saveWorkshopSession: (
    projectRoot: string,
    session: WorkshopSession,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  deleteWorkshopSession: (
    projectRoot: string,
    workshopId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  workshopStartRun: (
    projectRoot: string,
    workshopId: string,
    userBrief: string,
    modelId: string,
  ) => Promise<WorkshopRunResult>
  workshopSendMessage: (
    projectRoot: string,
    workshopId: string,
    text: string,
    modelId: string,
    displayText?: string,
    imageRefs?: ChatImageRef[],
  ) => Promise<WorkshopRunResult>
  workshopSendUserAnswer: (
    projectRoot: string,
    workshopId: string,
    answer: string,
  ) => Promise<WorkshopRunResult>
  onWorkshopProgress: (callback: (payload: WorkshopProgressPayload) => void) => () => void
}

declare global {
  interface Window {
    axecoder: AxeCoderFs
  }
}

export {}
