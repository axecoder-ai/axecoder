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

export type SearchOptions = {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
  include?: string
  exclude?: string
}

export type SearchReplaceResult = {
  files: number
  replacements: number
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
  agentPermissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
  agentPermissionAllowRules?: string[]
  agentPermissionAskRules?: string[]
  agentPermissionDenyRules?: string[]
  /** @deprecated */
  agentAllowedTools?: string[]
  /** @deprecated */
  agentDisallowedTools?: string[]
  /** Agent Bash OS 沙箱（macOS Seatbelt + execpolicy） */
  agentOsSandboxEnabled?: boolean
  agentOutputStyle: AgentOutputStyleId
  agentCompletionSoundEnabled?: boolean
  agentCompletionSoundPath?: string
  /** UI only: original filename when picking files */
  agentCompletionSoundDisplayName?: string
  rulesIncludeThirdPartyPlugins?: boolean
  profileDisplayName?: string
  profileAvatarPath?: string
  gitForgeProvider?: 'auto' | 'github' | 'gitee' | 'custom'
  gitForgeApiBase?: string
  gitForgeWebBase?: string
  gitForgeAccessToken?: string
  /** AI 请求遇 524 / 429 限流时的最大重试次数（不含首次请求） */
  aiRequestMaxRetries?: number
  /** 429 限流重试前等待秒数（默认 60，范围 5–300） */
  aiRateLimitRetryDelaySec?: number
  agentAutoPlan?: 'off' | 'on'
  agentAutoPlanClassifierModelId?: string
  agentLoopGuardEnabled?: boolean
  agentLoopGuardStormThreshold?: number
  agentLoopGuardRepeatSuccessThreshold?: number
  agentMaxToolRounds?: number
  /** Serper web search (Settings → Agent) */
  agentFeatureWebSearch?: boolean
  agentWebSearchApiKey?: string
  /** Playwright browser automation WebRun */
  agentFeatureWebRun?: boolean
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

export type PermissionDecision = 'allow' | 'ask' | 'deny'

export type PermissionsPolicy = {
  mode: PermissionDecision
  allow: string[]
  ask: string[]
  deny: string[]
}

export type PermissionsView = {
  global: PermissionsPolicy
  globalPath: string
  project: PermissionsPolicy
  projectPath: string
  agentPermissionMode: 'default' | 'acceptEdits' | 'bypassPermissions'
}

export type ChatModeId =
  | 'agent'
  | 'auto-plan'
  | 'reflection'
  | 'rppit'
  | 'planning'
  | 'planning-only'
  | 'multi-agent'

export type ModelProvider = 'openai' | 'ollama' | 'anthropic' | 'codex'

export type AiProviderCapabilities = {
  requiresApiKey: boolean
  supportsSseStream: boolean
  defaultBaseUrl: string
  displayName: string
  missingApiKeyError?: string
}

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

export type McpPluginView = {
  id: string
  displayName: string
  description: string
  docUrl: string
  enabled: boolean
  authMode: 'oauth' | 'api_key'
  connected: boolean
  hasApiKey: boolean
  managedBy: 'plugin' | 'mcp.json'
}

export type McpPluginsListResult =
  | { ok: true; plugins: McpPluginView[] }
  | { ok: false; error: string }

export type McpPluginMutationResult = { ok: true } | { ok: false; error: string }

export type McpPluginTestResult =
  | { ok: true; tools: string[] }
  | { ok: false; error: string }

export type UserEntry = {
  id: string
  displayName: string
  role: string
  expertise: string
  avatarPath: string
  skillSlugs?: string[]
  isBuiltin?: boolean
  builtinRole?:
    | 'manager'
    | 'product_analyst'
    | 'researcher'
    | 'architect'
    | 'planner'
    | 'developer'
    | 'reviewer'
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

export type SkillScope = 'user' | 'project' | 'builtin'

export type SkillListItem = {
  scope: SkillScope
  folderName: string
  name: string
  description: string
  readOnly: boolean
}

export type SkillDetail = SkillListItem & {
  body: string
}

export type SkillsListResult = {
  skills: SkillListItem[]
  projectRoot: string | null
}

export type SkillSaveInput = {
  scope: 'user' | 'project'
  folderName: string
  name: string
  description: string
  body: string
  projectRoot?: string
  isNew?: boolean
}

export type SkillsMutationResult =
  | { ok: true; data: SkillsListResult }
  | { ok: false; error: string }

export type SkillsReadResult =
  | { ok: true; data: SkillDetail }
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
  description?: string
  runInBackground?: boolean
}

export type AgentPendingPlan = {
  id: string
  name: string
  overview: string
  plan: string
  filePath: string
  todos?: { id: string; content: string }[]
}

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed'

export type PlanBuildTrack = {
  id: string
  plan: AgentPendingPlan
  stepStatuses: PlanStepStatus[]
  building: boolean
  done: boolean
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
      detail?: string
    }
  | {
      sessionId: string
      kind: 'loop_guard'
      text: string
    }
  | {
      sessionId: string
      kind: 'chat_mode'
      chatMode: ChatModeId
      planMode: boolean
    }
  | {
      sessionId: string
      kind: 'delta'
      delta: string
    }
  | {
      sessionId: string
      kind: 'content_delta'
      delta: string
    }
  | {
      sessionId: string
      kind: 'thinking_delta'
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
      speakerUserId?: string
      backgroundTaskIds?: string[]
    }
  | {
      ok: true
      status: 'pending'
      sessionId: string
      pending: AgentPendingWrite[]
      pendingBashes?: AgentPendingBash[]
      pendingAsks?: AgentPendingAskUser[]
      pendingPlans?: AgentPendingPlan[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
      assistantContent?: string
      reasoningContent?: string
      speakerUserId?: string
      backgroundTaskIds?: string[]
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
  imageRefs?: ChatImageRef[]
  imagePreviews?: string[]
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
  /** 待用户 Build 的实施计划 */
  pendingPlans?: AgentPendingPlan[]
  /** Build 后的计划步骤进度（保留卡片） */
  planBuildTracks?: PlanBuildTrack[]
  agentSessionId?: string
  /** Agent @角色：该条 assistant 回复对应的 Users 成员 */
  speakerUserId?: string
  /** 用户消息 @角色 对应的 Users id（展示头像） */
  roleMentionUserId?: string
  /** @角色 触发的内置工作流命令 slug */
  roleMentionCommand?: string
  /** 本条 assistant 启动的后台 Task id */
  backgroundTaskIds?: string[]
}

export type BackgroundTaskSnapshot = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  outputFile?: string
  error?: string
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

export type GitForgeStatusResult =
  | {
      ok: true
      kind: 'github' | 'gitee' | 'custom' | 'unknown'
      repoSlug: string | null
      ghAuth: 'authenticated' | 'not_authenticated' | 'not_installed'
      webBase: string | null
      apiBase: string | null
      defaultBranch: string | null
      remoteUrl: string | null
    }
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
  | 'menu:quickOpen'

export type WindowLayout = {
  fullscreen: boolean
  platform: string
}

export type WorkbenchWindowRole = 'main' | 'companion' | 'metrics' | 'trace'

export type AiTraceEventKind = 'model_call' | 'tool_call' | 'tool_result'

export type AiTraceEvent = {
  id: string
  ts: number
  kind: AiTraceEventKind
  source: string
  sessionId?: string
  turn?: number
  modelId?: string
  modelName?: string
  provider?: string
  toolName?: string
  ok?: boolean
  durationMs?: number
  request?: string
  response?: string
  detail?: string
}

export type AiTraceState = {
  recording: boolean
  events: AiTraceEvent[]
  eventCount: number
}

export type AiMetricsSource = 'chat' | 'agent' | 'workshop' | 'other'

export type AiMetricsTimeRange = 'session' | '1h'

export type AiMetricsFilter = {
  modelId?: string
  source?: AiMetricsSource
  provider?: string
  timeRange?: AiMetricsTimeRange
}

export type AiMetricsModelSummary = {
  modelId: string
  modelName: string
  provider: string
  primarySource: AiMetricsSource
  callCount: number
  ttftP95: number
  e2eP95: number
  tps: number
  errorRate: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  tokensEstimated: boolean
}

export type AiMetricsSeriesPoint = {
  label: string
  ttftP50: number
  ttftP95: number
  e2eP95: number
  tps: number
  qps: number
  errorRate: number
  tokensPerMin: number
  inputTokens: number
  outputTokens: number
  cumulativeTokens: number
  okCount: number
  failCount: number
  sloBreach: boolean
}

export type AiMetricsSourceBreakdown = {
  source: AiMetricsSource
  calls: number
  tokens: number
}

export type AiMetricsHistogramBin = {
  label: string
  count: number
}

export type AiMetricsKpis = {
  ttftP50: number
  ttftP95: number
  e2eP95: number
  tps: number
  qps: number
  errorRate: number
  tokensPerMin: number
  totalCalls: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  tokensEstimated: boolean
}

export type AiMetricsBlock = {
  kpis: AiMetricsKpis
  models: AiMetricsModelSummary[]
}

export type AiMetricsActivityKind = 'model_call' | 'tool_call' | 'tool_result' | 'first_token'

export type AiMetricsActivityLine = {
  id: string
  ts: number
  kind: AiMetricsActivityKind
  ok?: boolean
  text: string
  modelId?: string
  source?: AiMetricsSource
}

export type AiMetricsSnapshot = {
  updatedAt: number
  concurrent: number
  providers: string[]
  sources: AiMetricsSource[]
  sloThresholdMs: number
  sourceBreakdown: AiMetricsSourceBreakdown[]
  inputTokenHistogram: AiMetricsHistogramBin[]
  realtime: AiMetricsBlock
  cumulative: AiMetricsBlock
  series: AiMetricsSeriesPoint[]
  activityLog: AiMetricsActivityLine[]
}

export type CodeGraphPublicStatus = {
  backendAvailable: boolean
  sqliteAvailable: boolean
  engineAvailable: boolean
  initialized: boolean
  indexing: boolean
  distPath: string
}

export type AxeCoderFs = {
  getWindowLayout: () => Promise<WindowLayout>
  onWindowLayout: (callback: (layout: WindowLayout) => void) => () => void
  getWindowRole: () => Promise<WorkbenchWindowRole>
  isCompanionWindowOpen: () => Promise<boolean>
  openCompanionWindow: () => Promise<boolean>
  closeCompanionWindow: () => Promise<boolean>
  onCompanionWindowState: (callback: (open: boolean) => void) => () => void
  isMetricsWindowDetached: () => Promise<boolean>
  openMetricsWindow: () => Promise<boolean>
  closeMetricsWindow: () => Promise<boolean>
  setWindowBackgroundTheme: (theme: AppTheme) => Promise<boolean>
  onMetricsWindowDetached: (callback: (detached: boolean) => void) => () => void
  getAiMetricsSnapshot: (filter?: string | AiMetricsFilter) => Promise<AiMetricsSnapshot>
  onAiMetricsUpdate: (callback: (snapshot: AiMetricsSnapshot) => void) => () => void
  onAiMetricsActivity: (callback: (lines: AiMetricsActivityLine[]) => void) => () => void
  isTraceWindowDetached: () => Promise<boolean>
  openTraceWindow: () => Promise<boolean>
  closeTraceWindow: () => Promise<boolean>
  onTraceWindowDetached: (callback: (detached: boolean) => void) => () => void
  getAiTraceState: () => Promise<AiTraceState>
  setAiTraceRecording: (on: boolean) => Promise<AiTraceState>
  clearAiTrace: () => Promise<AiTraceState>
  saveAiTrace: () => Promise<{ ok: true; path: string } | { ok: false; error: string }>
  onAiTraceUpdate: (callback: (state: AiTraceState) => void) => () => void
  getStartupProjectPath: () => Promise<string | null>
  getLastProject: () => Promise<string | null>
  openProject: (rootPath?: string) => Promise<{ rootPath: string; tree: FileNode } | null>
  openFolder: () => Promise<{ rootPath: string; tree: FileNode } | null>
  codeGraphStatus: (projectRoot: string) => Promise<CodeGraphPublicStatus>
  codeGraphIndex: (projectRoot: string) => Promise<{ ok: true } | { ok: false; error: string }>
  openFile: () => Promise<{ path: string; content: string; binary?: true } | null>
  onOpenProject: (callback: () => void) => () => void
  onOpenProjectAt: (callback: (projectPath: string) => void) => () => void
  onMenuAction: (callback: (channel: MenuChannel) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void
  onFileChanged: (callback: (payload: { kind: string; path: string }) => void) => () => void
  confirmQuit: () => void
  readTree: (rootPath: string) => Promise<{ rootPath: string; tree: FileNode }>
  readFile: (filePath: string) => Promise<{ content: string }>
  readFileBase64: (filePath: string) => Promise<{ base64: string; mimeType: string }>
  previewDocx: (filePath: string) => Promise<{ html: string }>
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
  search: (
    rootPath: string,
    query: string,
    opts?: SearchOptions,
  ) => Promise<{ hits: SearchHit[] }>
  searchReplace: (
    rootPath: string,
    query: string,
    replacement: string,
    opts?: SearchOptions,
  ) => Promise<SearchReplaceResult>
  listProjectFiles: (rootPath: string) => Promise<{ files: string[] }>
  getRecentFiles: () => Promise<{ files: string[] }>
  getRecentProjects: () => Promise<{ projects: string[] }>
  watchStart: (rootPath: string) => Promise<{ ok: true }>
  watchStop: () => Promise<{ ok: true }>
  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  permissionsGet: (projectRoot: string) => Promise<
    { ok: true; data: PermissionsView } | { ok: false; error: string }
  >
  permissionsSetGlobal: (input: {
    agentPermissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
    allow?: string[]
    ask?: string[]
    deny?: string[]
  }) => Promise<{ ok: true } | { ok: false; error: string }>
  permissionsSetProject: (
    projectRoot: string,
    input: Partial<PermissionsPolicy>,
  ) => Promise<{ ok: true; data: PermissionsPolicy } | { ok: false; error: string }>
  permissionsWriteProjectJson: (
    projectRoot: string,
    jsonText: string,
  ) => Promise<{ ok: true; data: PermissionsPolicy } | { ok: false; error: string }>
  permissionsWriteGlobalJson: (jsonText: string) => Promise<{ ok: true } | { ok: false; error: string }>
  onThemeChange: (callback: (theme: AppTheme) => void) => () => void
  pickCompletionSound: () => Promise<PickCompletionSoundResult>
  getCompletionSoundDataUrl: () => Promise<CompletionSoundDataUrlResult>
  pickProfileAvatar: () => Promise<PickProfileAvatarResult>
  listModels: () => Promise<ModelsFile>
  saveModel: (input: ModelSaveInput) => Promise<ModelsMutationResult>
  deleteModel: (id: string) => Promise<ModelsMutationResult>
  toggleModel: (id: string, enabled: boolean) => Promise<ModelsMutationResult>
  setActiveModel: (id: string) => Promise<ModelsMutationResult>
  pingModel: (id: string) => Promise<ModelPingResult>
  getProviderCapabilities: () => Promise<Record<ModelProvider, AiProviderCapabilities>>
  listMcpPlugins: (projectRoot?: string) => Promise<McpPluginsListResult>
  connectMcpPlugin: (id: string, projectRoot?: string) => Promise<McpPluginMutationResult>
  disconnectMcpPlugin: (id: string) => Promise<McpPluginMutationResult>
  setMcpPluginEnabled: (
    id: string,
    enabled: boolean,
    projectRoot?: string,
  ) => Promise<McpPluginMutationResult>
  setMcpPluginApiKey: (id: string, apiKey: string) => Promise<McpPluginMutationResult>
  testMcpPlugin: (id: string) => Promise<McpPluginTestResult>
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
  listSkills: (projectRoot?: string | null) => Promise<SkillsMutationResult>
  readSkill: (scope: SkillScope, folderName: string, projectRoot?: string) => Promise<SkillsReadResult>
  saveSkill: (input: SkillSaveInput) => Promise<SkillsMutationResult>
  deleteSkill: (
    scope: 'user' | 'project',
    folderName: string,
    projectRoot?: string,
  ) => Promise<SkillsMutationResult>
  expandChatUserWithFiles: (
    projectRoot: string,
    text: string,
    filePaths: string[],
  ) => Promise<string>
  expandChatAtRefs: (
    projectRoot: string,
    text: string,
    skipTokens?: string[],
  ) => Promise<{ ok: true; text: string; errors: string[] } | { ok: false; error: string }>
  listAtRefDir: (
    projectRoot: string,
    relDir: string,
  ) => Promise<
    | { ok: true; entries: { name: string; isDir: boolean }[] }
    | { ok: false; error: string }
  >
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
  aiChat: (
    modelId: string,
    messages: AiChatMessage[],
    streamId?: string,
    reasoningEffort?: string,
  ) => Promise<AiChatResult>
  onAiStream: (callback: (payload: AiStreamPayload) => void) => () => void
  agentSend: (
    projectRoot: string,
    modelId: string,
    messages: AiChatMessage[],
    chatMode?: ChatModeId,
    assigneeUserId?: string,
    roleWorkflowInvoke?: boolean,
    reasoningEffort?: string,
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
  agentListMcp: (projectRoot?: string) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  agentProjectMemory: (projectRoot: string) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
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
  agentResolveBackgroundTasks: (
    projectRoot: string,
    taskIds: string[],
  ) => Promise<
    | { ok: true; tasks: BackgroundTaskSnapshot[] }
    | { ok: false; error: string }
  >
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
  agentBuildPlan: (sessionId: string, pendingId: string) => Promise<AgentContinueResult>
  agentDismissPlan: (sessionId: string, pendingId: string) => Promise<AgentContinueResult>
  agentComposePlanBuild: (
    projectRoot: string,
    planPath: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  agentConfirmBash: (sessionId: string, pendingId: string) => Promise<AgentContinueResult>
  agentRejectBash: (
    sessionId: string,
    pendingId: string,
    reason?: string,
  ) => Promise<AgentContinueResult>
  onAgentProgress: (callback: (payload: AgentProgressPayload) => void) => () => void
  gitStatus: (cwd: string) => Promise<GitStatusResult>
  gitForgeStatus: (cwd: string) => Promise<GitForgeStatusResult>
  gitCommitPushPrPrompt: (
    cwd: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  gitOpenUrl: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>
  terminalStart: (cwd: string, cols?: number, rows?: number) => Promise<
    { ok: true } | { ok: false; error: string }
  >
  terminalWrite: (data: string) => Promise<{ ok: boolean }>
  terminalResize: (cols: number, rows: number) => Promise<{ ok: boolean }>
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
  chatBranchTree: (
    projectRoot: string,
    currentId?: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  chatForkBranch: (
    projectRoot: string,
    sourceSessionId: string,
    args?: string,
  ) => Promise<
    | { ok: true; session: ChatSession }
    | { ok: false; error: string }
  >
  chatSwitchBranch: (
    projectRoot: string,
    ref: string,
    currentId?: string,
  ) => Promise<
    | { ok: true; session: ChatSession; tree: string }
    | { ok: false; error: string }
  >
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
    preferredAssigneeUserId?: string,
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
