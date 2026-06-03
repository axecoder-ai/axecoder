<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import type {
  AgentContinueResult,
  AgentSendResult,
  AgentToolLogEntry,
  AiChatMessage,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  ModelEntry,
  ModelsFile,
  WorkshopSessionMeta,
} from '../../types/axecoder'
import ModelPickerDropdown from './ModelPickerDropdown.vue'
import SlashCommandPicker from './SlashCommandPicker.vue'
import ChatDiffCard from './ChatDiffCard.vue'
import ChatAskUserCard from './ChatAskUserCard.vue'
import ChatBashCard from './ChatBashCard.vue'
import AgentProgressStream from './AgentProgressStream.vue'
import { isUnderProject, relativeToProject, type ChatFileRef } from '../../utils/chat-file-context'
import {
  applyProgressPayload,
  CHAT_IDLE_HINTS,
  type AgentProgressStep,
} from '../../utils/agent-progress'
import { runSlashCommand } from '../../slash-commands/run'
import { refreshSlashCommandRegistry, findCommand } from '../../slash-commands/registry'
import type { SlashContext } from '../../slash-commands/types'
import { playAgentCompletionSound } from '../../utils/play-completion-sound'
import SwitchToggle from './SwitchToggle.vue'
import WorkshopChatSection from './WorkshopChatSection.vue'
import type { SessionKind } from '../../types/axecoder'

const md = new MarkdownIt()

const workshopSectionRef = ref<InstanceType<typeof WorkshopChatSection> | null>(null)

const props = defineProps<{
  projectRoot: string
  /** Agent / Workshop 会话类型（侧栏切换时由 App 传入，Tab 切换以 ChatPane 内 activeTabKind 为准） */
  sessionKind?: SessionKind
  contextFilePath?: string | null
  agentsSidebarVisible: boolean
  agentAutoApplyWrites: boolean
  agentCompletionSoundEnabled?: boolean
  agentCompletionSoundPath?: string
  profileDisplayName?: string
  profileAvatarPath?: string
}>()

const emit = defineEmits<{
  close: []
  showAgentsSidebar: []
  openModelsSettings: []
  activeChange: [id: string]
  kindChange: [kind: SessionKind]
  sessionsChanged: []
  filesChanged: []
  openFile: [path: string]
  'update:agentAutoApplyWrites': [value: boolean]
}>()

type OpenChatTab = { id: string; kind: SessionKind }

const openTabsList = ref<OpenChatTab[]>([])
const activeTabKind = ref<SessionKind>('agent')
const activeTabId = ref('')

const sessionMetas = ref<ChatSessionMeta[]>([])
const activeSession = ref<ChatSession | null>(null)
const activeId = ref('')
const sessionCache = ref<Record<string, ChatSession>>({})

const isWorkshopMode = computed(() => activeTabKind.value === 'workshop')

const wsMetas = ref<WorkshopSessionMeta[]>([])
const wsTitleById = ref<Record<string, string>>({})

const tabKey = (t: OpenChatTab) => `${t.kind}:${t.id}`

const isActiveTab = (t: OpenChatTab) => t.id === activeTabId.value && t.kind === activeTabKind.value

const emitActiveTab = () => {
  emit('activeChange', activeTabId.value)
  emit('kindChange', activeTabKind.value)
}

const setActiveTab = (id: string, kind: SessionKind) => {
  activeTabId.value = id
  activeTabKind.value = kind
  emitActiveTab()
}

const addUnifiedTab = (id: string, kind: SessionKind) => {
  if (!id) return
  if (openTabsList.value.some((t) => t.id === id && t.kind === kind)) return
  openTabsList.value = [...openTabsList.value, { id, kind }]
}

const wsTabTitleFor = (id: string) => {
  const liveId = workshopSectionRef.value?.activeId
  if (id === liveId) return workshopSectionRef.value?.activeTitle ?? 'Workshop'
  return wsTitleById.value[id] ?? wsMetas.value.find((m) => m.id === id)?.title ?? 'Workshop'
}

const agentTabTitleFor = (id: string) => {
  if (id === activeId.value && activeSession.value) return activeSession.value.title
  const cached = sessionCache.value[id]
  if (cached) return cached.title
  return sessionMetas.value.find((m) => m.id === id)?.title ?? 'Chat'
}

const unifiedOpenTabs = computed(() =>
  openTabsList.value.map((t) => ({
    ...t,
    key: tabKey(t),
    title: t.kind === 'workshop' ? wsTabTitleFor(t.id) : agentTabTitleFor(t.id),
  })),
)

const loadWsMetas = async () => {
  if (!hasProject.value) {
    wsMetas.value = []
    return
  }
  const res = await window.axecoder.getWorkshopSessions(props.projectRoot)
  wsMetas.value = res.sessions
  const titles = { ...wsTitleById.value }
  for (const s of res.sessions) titles[s.id] = s.title
  wsTitleById.value = titles
}

const removeUnifiedTab = (id: string, kind: SessionKind) => {
  openTabsList.value = openTabsList.value.filter((t) => !(t.id === id && t.kind === kind))
  if (kind === 'agent') {
    const next = { ...sessionCache.value }
    delete next[id]
    sessionCache.value = next
  } else {
    const nextTitles = { ...wsTitleById.value }
    delete nextTitles[id]
    wsTitleById.value = nextTitles
  }
}

const switchUnifiedTab = async (t: OpenChatTab) => {
  if (isActiveTab(t)) return
  if (activeTabKind.value === 'agent' && activeSession.value && activeId.value) {
    cacheSession(activeSession.value)
    await persist()
  }
  setActiveTab(t.id, t.kind)
  if (t.kind === 'workshop') {
    await workshopSectionRef.value?.selectSession(t.id)
    return
  }
  await selectSession(t.id)
}

const closeUnifiedTab = async (t: OpenChatTab) => {
  const wasActive = isActiveTab(t)
  removeUnifiedTab(t.id, t.kind)
  if (!wasActive) return
  const remaining = openTabsList.value
  if (remaining.length) {
    await switchUnifiedTab(remaining[remaining.length - 1])
    return
  }
  activeTabId.value = ''
  activeTabKind.value = 'agent'
  activeSession.value = null
  activeId.value = ''
  emitActiveTab()
}

const onWorkshopActiveChange = (id: string) => {
  if (id) {
    addUnifiedTab(id, 'workshop')
    setActiveTab(id, 'workshop')
    const title = workshopSectionRef.value?.activeTitle
    if (title) wsTitleById.value = { ...wsTitleById.value, [id]: title }
  } else if (activeTabKind.value === 'workshop') {
    activeTabId.value = ''
    emit('activeChange', '')
  }
}

const onWorkshopSessionsChanged = async () => {
  await loadWsMetas()
  const id = workshopSectionRef.value?.activeId
  if (id) {
    const title = workshopSectionRef.value?.activeTitle
    if (title) wsTitleById.value = { ...wsTitleById.value, [id]: title }
  }
  emit('sessionsChanged')
}

const profileAvatarUrl = ref('')

const profileHeaderVisible = computed(() => {
  const name = props.profileDisplayName?.trim() ?? ''
  const path = props.profileAvatarPath?.trim() ?? ''
  return !!name && !!path
})

const profileNickname = computed(() => props.profileDisplayName?.trim() ?? '')

const loadProfileAvatar = async () => {
  if (!profileHeaderVisible.value) {
    profileAvatarUrl.value = ''
    return
  }
  const res = await window.axecoder.getUserAvatarDataUrl(props.profileAvatarPath!.trim())
  profileAvatarUrl.value = res.ok && res.dataUrl ? res.dataUrl : ''
}

watch(
  () => [props.profileDisplayName, props.profileAvatarPath] as const,
  () => {
    void loadProfileAvatar()
  },
  { immediate: true },
)

const input = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const inputBoxEl = ref<HTMLElement | null>(null)
const slashPickerRef = ref<InstanceType<typeof SlashCommandPicker> | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
const loading = ref(false)
const modelsFile = ref<ModelsFile>({ schemaVersion: 1, activeModelId: '', models: [] })
const attachedFiles = ref<ChatFileRef[]>([])
const includeContextFile = ref(false)
const dropActive = ref(false)
const pendingBusy = ref(false)
const progressSteps = ref<AgentProgressStep[]>([])
type SubagentTaskView = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
}
const subagentTasks = ref<Map<string, SubagentTaskView>>(new Map())
const subagentTaskList = computed(() => [...subagentTasks.value.values()])
const streamText = ref('')
const idleHintIdx = ref(0)
let idleHintTimer: ReturnType<typeof setInterval> | null = null
let progressUnsub: (() => void) | null = null
let aiStreamUnsub: (() => void) | null = null
const agentProgressActive = ref(false)
const runningAgentSessionId = ref('')

const agentMode = computed(() => {
  const m = activeModel.value
  return !!m && m.provider !== 'ollama'
})

const messages = computed(() => activeSession.value?.messages ?? [])
const hasProject = computed(() => !!props.projectRoot.trim())

const enabledModels = computed(() => modelsFile.value.models.filter((m) => m.enabled))

const activeModel = computed(
  () => modelsFile.value.models.find((m) => m.id === modelsFile.value.activeModelId) ?? null,
)

const newId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const cacheSession = (s: ChatSession) => {
  sessionCache.value = { ...sessionCache.value, [s.id]: s }
}


const syncMetaFromActive = () => {
  if (!activeSession.value) return
  const m: ChatSessionMeta = {
    id: activeSession.value.id,
    title: activeSession.value.title,
    updatedAt: activeSession.value.updatedAt,
  }
  sessionMetas.value = [m, ...sessionMetas.value.filter((s) => s.id !== m.id)].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )
}

let titleSuggestInFlight = false

const maybeRefreshSessionTitle = async () => {
  if (titleSuggestInFlight || !hasProject.value || !activeSession.value) return
  const modelId = modelsFile.value.activeModelId
  if (!modelId) return
  const s = activeSession.value
  const payload = s.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text }))
  titleSuggestInFlight = true
  try {
    const res = await window.axecoder.suggestChatSessionTitle(modelId, payload, s.title)
    if (!res.ok || !res.title || res.title === s.title) return
    s.title = res.title
    s.updatedAt = Date.now()
    await persist({ skipTitleSuggest: true })
  } finally {
    titleSuggestInFlight = false
  }
}

const persist = async (opts?: { skipTitleSuggest?: boolean }) => {
  if (!hasProject.value || !activeSession.value) return
  const s = activeSession.value
  const res = await window.axecoder.saveChatSession(props.projectRoot, {
    id: s.id,
    title: s.title,
    updatedAt: s.updatedAt,
    messages: s.messages.map((m) => ({
      role: m.role,
      text: m.text,
      ...(m.filePaths?.length ? { filePaths: [...m.filePaths] } : {}),
      ...(m.apiContent ? { apiContent: m.apiContent } : {}),
      ...(m.slashInvoke ? { slashInvoke: m.slashInvoke } : {}),
      ...(m.slashOnly ? { slashOnly: true } : {}),
      ...(m.assistantContent !== undefined ? { assistantContent: m.assistantContent } : {}),
      ...(m.reasoningContent ? { reasoningContent: m.reasoningContent } : {}),
    })),
  })
  if (!res.ok) return
  if (activeSession.value) cacheSession(activeSession.value)
  syncMetaFromActive()
  emit('sessionsChanged')
  if (!opts?.skipTitleSuggest) void maybeRefreshSessionTitle()
}

const reset = () => {
  sessionMetas.value = []
  activeSession.value = null
  activeId.value = ''
  openTabsList.value = []
  activeTabId.value = ''
  activeTabKind.value = 'agent'
  sessionCache.value = {}
}

const resizeInput = () => {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

const inputSlash = computed(() => {
  const t = input.value
  if (!t.startsWith('/')) return null
  const sp = t.indexOf(' ', 1)
  if (sp < 0) return null
  const cmdPart = t.slice(1, sp)
  if (!cmdPart) return null
  const cmd = findCommand(cmdPart)
  if (!cmd) return null
  return { name: cmd.name, args: t.slice(sp + 1) }
})

const inputFieldValue = computed(() => (inputSlash.value ? inputSlash.value.args : input.value))

const onInputField = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value
  if (inputSlash.value) {
    input.value = `/${inputSlash.value.name} ${val}`
  } else {
    input.value = val
  }
  resizeInput()
}

const clearInputSlash = () => {
  input.value = ''
  void nextTick(() => {
    resizeInput()
    inputEl.value?.focus()
  })
}

const scrollMessages = async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

const renderMarkdown = (text: string) => md.render(text)

const selectSession = async (id: string): Promise<boolean> => {
  if (!hasProject.value) return false
  if (activeId.value === id) return true
  if (activeSession.value && activeId.value) {
    cacheSession(activeSession.value)
    await persist()
  }
  let session = sessionCache.value[id]
  if (!session) {
    const res = await window.axecoder.getChatSession(props.projectRoot, id)
    if (!res.session) return false
    session = res.session
  }
  cacheSession(session)
  addUnifiedTab(id, 'agent')
  activeSession.value = session
  activeId.value = id
  setActiveTab(id, 'agent')
  input.value = ''
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = session.messages.length
      ? messagesEl.value.scrollHeight
      : 0
  }
  return true
}


const loadModels = async () => {
  modelsFile.value = await window.axecoder.listModels()
}

const load = async () => {
  if (!hasProject.value) {
    reset()
    return
  }
  const res = await window.axecoder.getChatSessions(props.projectRoot)
  sessionMetas.value = res.sessions
  const wsTabs = openTabsList.value.filter((t) => t.kind === 'workshop')
  if (!sessionMetas.value.length) {
    activeSession.value = null
    activeId.value = ''
    openTabsList.value = wsTabs
    sessionCache.value = {}
    if (!wsTabs.length) return
    if (activeTabKind.value === 'agent') {
      const pick = wsTabs[wsTabs.length - 1]
      await switchUnifiedTab(pick)
    }
    return
  }
  const keptAgent = openTabsList.value
    .filter((t) => t.kind === 'agent')
    .filter((t) => sessionMetas.value.some((s) => s.id === t.id))
  openTabsList.value = [...keptAgent, ...wsTabs]
  if (!keptAgent.length) {
    activeSession.value = null
    activeId.value = ''
    if (activeTabKind.value === 'agent' && wsTabs.length) {
      await switchUnifiedTab(wsTabs[wsTabs.length - 1])
    }
    return
  }
  const pickId =
    activeTabKind.value === 'agent' &&
    activeId.value &&
    keptAgent.some((t) => t.id === activeId.value)
      ? activeId.value
      : keptAgent[keptAgent.length - 1].id
  await selectSession(pickId)
}

const newChat = async () => {
  if (!hasProject.value) return
  const s: ChatSession = {
    id: newId(),
    title: 'New Agent',
    updatedAt: Date.now(),
    messages: [],
  }
  const res = await window.axecoder.saveChatSession(props.projectRoot, s)
  if (!res.ok) return
  sessionMetas.value = [
    { id: s.id, title: s.title, updatedAt: s.updatedAt },
    ...sessionMetas.value.filter((m) => m.id !== s.id),
  ]
  cacheSession(s)
  addUnifiedTab(s.id, 'agent')
  activeSession.value = s
  activeId.value = s.id
  setActiveTab(s.id, 'agent')
  emit('sessionsChanged')
}

const deleteSession = async (id: string) => {
  if (!hasProject.value || !id) return
  const wasActive = activeId.value === id
  if (wasActive) {
    activeSession.value = null
    activeId.value = ''
  }
  removeUnifiedTab(id, 'agent')
  await window.axecoder.deleteChatSession(props.projectRoot, id)
  sessionMetas.value = sessionMetas.value.filter((s) => s.id !== id)
  if (!sessionMetas.value.length) {
    reset()
    emit('sessionsChanged')
    return
  }
  if (wasActive) {
    const remaining = openTabsList.value
    if (remaining.length) {
      await switchUnifiedTab(remaining[remaining.length - 1])
    }
  }
  emit('sessionsChanged')
}

const closeTab = async (id: string) => {
  if (!hasProject.value) {
    emit('close')
    return
  }
  const wasActive = activeTabKind.value === 'agent' && activeId.value === id
  if (wasActive && activeSession.value) await persist()
  await closeUnifiedTab({ id, kind: 'agent' })
}

const onModelPick = async (id: string) => {
  const res = await window.axecoder.setActiveModel(id)
  if (res.ok) modelsFile.value = res.data
}

const addAttachedPath = (filePath: string) => {
  if (!props.projectRoot.trim() || !isUnderProject(props.projectRoot, filePath)) return
  if (attachedFiles.value.some((f) => f.path === filePath)) return
  attachedFiles.value.push({
    path: filePath,
    name: relativeToProject(props.projectRoot, filePath),
  })
}

const removeAttached = (filePath: string) => {
  attachedFiles.value = attachedFiles.value.filter((f) => f.path !== filePath)
  if (filePath === props.contextFilePath) includeContextFile.value = false
}

const onChatDragOver = (e: DragEvent) => {
  const types = e.dataTransfer?.types ?? []
  if (!types.includes('application/x-axecoder-file') && !types.includes('text/plain')) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  dropActive.value = true
}

const onChatDragLeave = () => {
  dropActive.value = false
}

const onChatDrop = (e: DragEvent) => {
  e.preventDefault()
  dropActive.value = false
  const path =
    e.dataTransfer?.getData('application/x-axecoder-file') ||
    e.dataTransfer?.getData('text/plain')
  if (!path?.trim()) return
  addAttachedPath(path.trim())
}

const pendingContextFile = computed(() => {
  if (!includeContextFile.value || !props.contextFilePath?.trim()) return null
  if (!props.projectRoot.trim() || !isUnderProject(props.projectRoot, props.contextFilePath)) {
    return null
  }
  if (attachedFiles.value.some((f) => f.path === props.contextFilePath)) return null
  return {
    path: props.contextFilePath,
    name: relativeToProject(props.projectRoot, props.contextFilePath),
  }
})

const sendFilePaths = computed(() => {
  const paths = attachedFiles.value.map((f) => f.path)
  if (pendingContextFile.value) paths.push(pendingContextFile.value.path)
  return paths
})

type SlashDisplayParts = { invoke: string; body: string }

const slashMessageParts = (msg: ChatMessage): SlashDisplayParts | null => {
  if (!msg.slashOnly && !msg.slashInvoke) return null
  const raw = (msg.slashInvoke || msg.text || '').trim()
  const sp = raw.indexOf(' ')
  if (sp < 0) return { invoke: raw, body: '' }
  return { invoke: raw.slice(0, sp), body: raw.slice(sp + 1) }
}

const userBubbleSlashMinimal = (msg: ChatMessage) => {
  const parts = slashMessageParts(msg)
  return !!(msg.slashOnly && parts && !parts.body)
}

const toApiMessages = (msgs: ChatMessage[]): AiChatMessage[] => {
  const api: AiChatMessage[] = []
  for (const m of msgs) {
    if (m.role === 'user') {
      const content = (m.apiContent ?? m.text ?? '').trim()
      if (m.slashOnly && !m.apiContent) continue
      if (!content) continue
      api.push({ role: 'user', content })
    } else {
      const content = (m.assistantContent ?? m.text ?? '').trim()
      if (!content) continue
      api.push({
        role: 'assistant',
        content,
        ...(m.reasoningContent ? { reasoningContent: m.reasoningContent } : {}),
      })
    }
  }
  return api
}

const stopIdleHintTimer = () => {
  if (idleHintTimer) clearInterval(idleHintTimer)
  idleHintTimer = null
}

const startIdleHintTimer = () => {
  stopIdleHintTimer()
  idleHintIdx.value = 0
  idleHintTimer = setInterval(() => {
    idleHintIdx.value = (idleHintIdx.value + 1) % CHAT_IDLE_HINTS.length
  }, 2200)
}

const unbindAgentProgress = () => {
  agentProgressActive.value = false
  progressUnsub?.()
  progressUnsub = null
}

const bindAgentProgress = (initialSessionId?: string) => {
  unbindAgentProgress()
  progressSteps.value = []
  streamText.value = ''
  runningAgentSessionId.value = initialSessionId ?? ''
  agentProgressActive.value = true
  progressUnsub = window.axecoder.onAgentProgress((payload) => {
    if (!agentProgressActive.value) return
    if (payload.sessionId) runningAgentSessionId.value = payload.sessionId
    if (payload.kind === 'delta') {
      streamText.value += payload.delta
    } else if (payload.kind === 'subagent') {
      const next = new Map(subagentTasks.value)
      next.set(payload.taskId, {
        id: payload.taskId,
        description: payload.description,
        status: payload.status,
      })
      subagentTasks.value = next
    } else {
      progressSteps.value = applyProgressPayload(progressSteps.value, payload)
    }
    void scrollMessages()
  })
}

const unbindAiStream = () => {
  aiStreamUnsub?.()
  aiStreamUnsub = null
}

const clearProgressUi = () => {
  stopIdleHintTimer()
  unbindAgentProgress()
  unbindAiStream()
  progressSteps.value = []
  streamText.value = ''
  subagentTasks.value = new Map()
  runningAgentSessionId.value = ''
}

const showAgentStop = computed(
  () =>
    agentMode.value &&
    (loading.value || pendingBusy.value) &&
    !!runningAgentSessionId.value,
)

const stopAgentRun = async () => {
  const sid = runningAgentSessionId.value
  if (!sid) return
  await window.axecoder.agentStop(sid)
}

const formatToolLog = (_log: AgentToolLogEntry[]) => ''

const maybePlayAgentDoneSound = (res: { ok: boolean; status: string; assistantText?: string }) => {
  if (!res.ok || res.status !== 'done') return
  if (res.assistantText?.includes('（已停止）')) return
  void playAgentCompletionSound({
    enabled: props.agentCompletionSoundEnabled,
    path: props.agentCompletionSoundPath,
  })
}

const pushAssistantFromAgent = (res: AgentSendResult | AgentContinueResult) => {
  if (!activeSession.value) return
  if (!res.ok) {
    activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${res.error}` })
    return
  }
  const suffix = formatToolLog(res.toolLog)
  if (res.status === 'done') {
    activeSession.value.messages.push({
      role: 'assistant',
      text: (res.assistantText + suffix).trim() || '（完成）',
      toolLog: res.toolLog,
      ...(res.assistantContent !== undefined ? { assistantContent: res.assistantContent } : {}),
      ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
    })
    maybePlayAgentDoneSound(res)
    emit('filesChanged')
    return
  }
  activeSession.value.messages.push({
    role: 'assistant',
    text: (res.assistantText + suffix).trim() || 'Please confirm the following changes:',
    toolLog: res.toolLog,
    pendingWrites: res.pending,
    pendingBashes: res.pendingBashes,
    pendingAsks: res.pendingAsks,
    agentSessionId: res.sessionId,
    ...(res.assistantContent !== undefined ? { assistantContent: res.assistantContent } : {}),
    ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
  })
}

const applyContinueToMessage = (msg: ChatMessage, res: AgentContinueResult) => {
  if (!res.ok) {
    msg.text += `\n\nConfirm failed: ${res.error}`
    msg.pendingWrites = undefined
    msg.pendingBashes = undefined
    msg.pendingAsks = undefined
    return
  }
  const suffix = formatToolLog(res.toolLog)
  if (res.status === 'pending') {
    msg.pendingWrites = res.pending
    msg.pendingBashes = res.pendingBashes
    msg.pendingAsks = res.pendingAsks
    msg.agentSessionId = res.sessionId
    if (res.assistantText.trim()) msg.text = res.assistantText + suffix
    else msg.text += suffix
  } else {
    msg.pendingWrites = undefined
    msg.pendingBashes = undefined
    msg.pendingAsks = undefined
    msg.text = (res.assistantText + suffix).trim() || msg.text
    maybePlayAgentDoneSound(res)
    emit('filesChanged')
  }
}

const onConfirmPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId)
  try {
    const res = await window.axecoder.agentConfirmWrite(msg.agentSessionId, pendingId)
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onRejectPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId)
  try {
    const res = await window.axecoder.agentRejectWrite(msg.agentSessionId, pendingId)
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onConfirmBashPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId)
  try {
    const res = await window.axecoder.agentConfirmBash(msg.agentSessionId, pendingId)
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onRejectBashPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId)
  try {
    const res = await window.axecoder.agentRejectBash(msg.agentSessionId, pendingId)
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onAnswerPending = async (
  msg: ChatMessage,
  pendingId: string,
  answers: Record<string, string | string[]>,
) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId)
  try {
    const res = await window.axecoder.agentAnswerQuestions(
      msg.agentSessionId,
      pendingId,
      answers,
    )
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const hasPendingWritesInSession = () => sessionPendingState.value.count > 0

const hasPendingAsksInSession = () =>
  (activeSession.value?.messages ?? []).some((m) => (m.pendingAsks?.length ?? 0) > 0)

const hasPendingBashesInSession = () =>
  (activeSession.value?.messages ?? []).some((m) => (m.pendingBashes?.length ?? 0) > 0)

const hasPendingAgentInteraction = () =>
  hasPendingWritesInSession() || hasPendingBashesInSession() || hasPendingAsksInSession()

const sessionPendingState = computed(() => {
  const msgs = activeSession.value?.messages ?? []
  let count = 0
  const sessionIds: string[] = []
  const msgBySession = new Map<string, ChatMessage>()
  for (const m of msgs) {
    const n = (m.pendingWrites?.length ?? 0) + (m.pendingBashes?.length ?? 0)
    if (n > 0 && m.agentSessionId) {
      count += n
      if (!msgBySession.has(m.agentSessionId)) {
        sessionIds.push(m.agentSessionId)
      }
      msgBySession.set(m.agentSessionId, m)
    }
  }
  return { count, sessionIds, msgBySession }
})

const clearPendingForSession = (sessionId: string) => {
  for (const m of activeSession.value?.messages ?? []) {
    if (m.agentSessionId === sessionId) {
      m.pendingWrites = undefined
      m.pendingBashes = undefined
      m.pendingAsks = undefined
    }
  }
}

const applyContinueAcrossSession = (sessionId: string, anchor: ChatMessage, res: AgentContinueResult) => {
  applyContinueToMessage(anchor, res)
  if (!res.ok) {
    clearPendingForSession(sessionId)
    return
  }
  if (res.status === 'done') {
    clearPendingForSession(sessionId)
    return
  }
  for (const m of activeSession.value?.messages ?? []) {
    if (m !== anchor && m.agentSessionId === sessionId) {
      m.pendingWrites = undefined
      m.pendingBashes = undefined
      m.pendingAsks = undefined
    }
  }
}

const onConfirmAllPending = async () => {
  const { sessionIds, msgBySession } = sessionPendingState.value
  if (!sessionIds.length || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(sessionIds[0])
  try {
    for (const sessionId of sessionIds) {
      const msg = msgBySession.get(sessionId)
      if (!msg) continue
      const res = await window.axecoder.agentConfirmAllWrites(sessionId)
      applyContinueAcrossSession(sessionId, msg, res)
      if (!res.ok) break
    }
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onRejectAllPending = async () => {
  const { sessionIds, msgBySession } = sessionPendingState.value
  if (!sessionIds.length || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(sessionIds[0])
  try {
    for (const sessionId of sessionIds) {
      const msg = msgBySession.get(sessionId)
      if (!msg) continue
      const res = await window.axecoder.agentRejectAllWrites(sessionId)
      applyContinueAcrossSession(sessionId, msg, res)
      if (!res.ok) break
    }
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onAgentAutoApplyChange = async (checked: boolean) => {
  emit('update:agentAutoApplyWrites', checked)
  if (checked && sessionPendingState.value.count > 0) {
    await onConfirmAllPending()
  }
}

const runPlainChat = async (model: ModelEntry, modelId: string, apiMessages: AiChatMessage[]) => {
  const useSse = model.provider === 'openai'
  let streamId = ''
  if (useSse) {
    streamText.value = ''
    streamId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    aiStreamUnsub = window.axecoder.onAiStream((p) => {
      if (p.streamId !== streamId) return
      streamText.value += p.delta
      void scrollMessages()
    })
  }
  const res = await window.axecoder.aiChat(modelId, apiMessages, useSse ? streamId : undefined)
  if (res.ok) {
    const replyText = res.text.trim() || '（模型未返回内容，请检查模型 ID 或 API 配置）'
    activeSession.value!.messages.push({
      role: 'assistant',
      text: replyText,
      assistantContent: res.content,
      ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
    })
  } else {
    activeSession.value!.messages.push({ role: 'assistant', text: `请求失败：${res.error}` })
  }
}

const buildSlashContext = (): SlashContext => ({
  projectRoot: props.projectRoot,
  getSession: () => activeSession.value,
  setSession: (s) => {
    activeSession.value = s
  },
  persist,
  newChat,
  getModelsFile: () => modelsFile.value,
  setModelsFile: (m) => {
    modelsFile.value = m
  },
  setActiveModel: async (id) => {
    const res = await window.axecoder.setActiveModel(id)
    return { ok: res.ok, data: res.ok ? res.data : undefined }
  },
  openModelsSettings: () => emit('openModelsSettings'),
  getAgentSessionId: () => {
    const s = activeSession.value
    if (!s) return undefined
    for (let i = s.messages.length - 1; i >= 0; i--) {
      const m = s.messages[i]
      if (m.agentSessionId) return m.agentSessionId
    }
    return undefined
  },
})

const send = async () => {
  const text = input.value.trim()
  if (!hasProject.value || !text || !activeSession.value) return

  if (text.startsWith('!')) {
    if (loading.value || pendingBusy.value) {
      activeSession.value.messages.push({
        role: 'assistant',
        text: '请等待当前回复完成后再运行 shell 命令。',
      })
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    const cmd = text.slice(1).trim()
    if (!cmd) return
    input.value = ''
    await nextTick()
    resizeInput()
    activeSession.value.messages.push({ role: 'user', text })
    loading.value = true
    try {
      const res = await window.axecoder.agentRunUserShell(props.projectRoot, cmd)
      activeSession.value.messages.push({
        role: 'assistant',
        text: res.ok
          ? `\`\`\`\n${res.text}\n\`\`\``
          : `命令失败：${res.error ?? 'unknown'}`,
      })
      activeSession.value.updatedAt = Date.now()
      await persist()
    } finally {
      loading.value = false
    }
    return
  }

  if (text.startsWith('/')) {
    if (loading.value || pendingBusy.value || hasPendingAgentInteraction()) {
      activeSession.value.messages.push({
        role: 'assistant',
        text: '请等待当前回复或完成 Agent 确认/问答后再使用斜杠命令。',
      })
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    input.value = ''
    await nextTick()
    resizeInput()

    const slashResult = await runSlashCommand(text, buildSlashContext())

    if (slashResult === null) {
      activeSession.value.messages.push({
        role: 'assistant',
        text: '输入格式无效，请以 /命令名 开头。',
      })
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    if (!slashResult.ok) {
      activeSession.value.messages.push({ role: 'assistant', text: slashResult.message })
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    if (!slashResult.silent && slashResult.message) {
      activeSession.value.messages.push({ role: 'assistant', text: slashResult.message })
      activeSession.value.updatedAt = Date.now()
      await persist()
    }
    if (slashResult.sendPrompt) {
      const prompt = slashResult.sendPrompt
      const modelId = modelsFile.value.activeModelId
      const model = activeModel.value
      if (!modelId || !model) {
        activeSession.value.messages.push({
          role: 'assistant',
          text: '请先在设置中添加并启用模型，再执行自定义命令。',
        })
        activeSession.value.updatedAt = Date.now()
        await persist()
        return
      }
      activeSession.value.messages.push({
        role: 'user',
        text,
        slashOnly: true,
        apiContent: prompt,
      })
      if (activeSession.value.title === 'New Agent' || activeSession.value.title === '新对话') {
        activeSession.value.title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
      }
      activeSession.value.updatedAt = Date.now()
      loading.value = true
      if (agentMode.value) bindAgentProgress()
      else startIdleHintTimer()
      try {
        await persist()
        const apiMessages = toApiMessages(activeSession.value.messages)
        if (agentMode.value) {
          const res = await window.axecoder.agentSend(props.projectRoot, modelId, apiMessages)
          pushAssistantFromAgent(res)
        } else {
          await runPlainChat(model, modelId, apiMessages)
        }
        activeSession.value.updatedAt = Date.now()
      } catch (e) {
        const msg = e instanceof Error ? e.message : '请求异常'
        activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${msg}` })
        activeSession.value.updatedAt = Date.now()
      } finally {
        loading.value = false
        clearProgressUi()
        await persist()
      }
    }
    return
  }

  if (loading.value) return
  const modelId = modelsFile.value.activeModelId
  const model = activeModel.value
  if (!modelId || !model) {
    activeSession.value.messages.push({
      role: 'assistant',
      text: '请先在设置中添加并启用模型，再开始对话。',
    })
    await persist()
    return
  }
  input.value = ''
  await nextTick()
  resizeInput()
  const filePaths = sendFilePaths.value.length ? [...sendFilePaths.value] : undefined
  const userMsg: ChatMessage = { role: 'user', text, ...(filePaths ? { filePaths } : {}) }
  activeSession.value.messages.push(userMsg)
  attachedFiles.value = []
  includeContextFile.value = false
  if (activeSession.value.title === 'New Agent' || activeSession.value.title === '新对话') {
    activeSession.value.title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
  }
  activeSession.value.updatedAt = Date.now()

  loading.value = true
  if (agentMode.value) bindAgentProgress()
  else startIdleHintTimer()
  try {
    if (filePaths?.length) {
      userMsg.apiContent = await window.axecoder.expandChatUserWithFiles(
        props.projectRoot,
        text,
        filePaths,
      )
    }
    await persist()
    const historyMsgs = activeSession.value.messages.slice(0, -1)
    const apiMessages = toApiMessages([...historyMsgs, userMsg])
    if (agentMode.value) {
      const res = await window.axecoder.agentSend(props.projectRoot, modelId, apiMessages)
      pushAssistantFromAgent(res)
    } else {
      await runPlainChat(model, modelId, apiMessages)
    }
    activeSession.value.updatedAt = Date.now()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '请求异常'
    activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${msg}` })
    activeSession.value.updatedAt = Date.now()
  } finally {
    loading.value = false
    clearProgressUi()
    await persist()
  }
}

const canSend = computed(() => {
  const text = input.value.trim()
  const slash = text.startsWith('/')
  return (
    hasProject.value &&
    !!text &&
    !loading.value &&
    (enabledModels.value.length > 0 || slash)
  )
})

const lastAssistantText = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i]
    if (m.role === 'assistant' && m.text.trim()) return m.text
  }
  return ''
})

const copyLastReply = async () => {
  const text = lastAssistantText.value
  if (!text) return
  await navigator.clipboard.writeText(text)
}

const regenerateLastReply = async () => {
  if (!hasProject.value || !activeSession.value || loading.value) return
  const modelId = modelsFile.value.activeModelId
  const model = activeModel.value
  if (!modelId || !model) return
  const msgs = activeSession.value.messages
  let assistIdx = -1
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant') {
      assistIdx = i
      break
    }
  }
  if (assistIdx < 0) return
  let userIdx = -1
  for (let i = assistIdx - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      userIdx = i
      break
    }
  }
  if (userIdx < 0) return
  msgs.splice(assistIdx, 1)
  loading.value = true
  if (agentMode.value) bindAgentProgress()
  else startIdleHintTimer()
  try {
    const apiMessages = toApiMessages(msgs.slice(0, userIdx + 1))
    if (agentMode.value) {
      const res = await window.axecoder.agentSend(props.projectRoot, modelId, apiMessages)
      pushAssistantFromAgent(res)
    } else {
      await runPlainChat(model, modelId, apiMessages)
    }
    activeSession.value.updatedAt = Date.now()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '请求异常'
    activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${msg}` })
    activeSession.value.updatedAt = Date.now()
  } finally {
    loading.value = false
    clearProgressUi()
    await persist()
  }
}


watch(input, () => {
  void nextTick(() => resizeInput())
})

const onSlashPick = (name: string) => {
  input.value = `/${name} `
  void nextTick(() => {
    resizeInput()
    inputEl.value?.focus()
  })
}

const onInputKeydown = (e: KeyboardEvent) => {
  if (inputSlash.value && e.key === 'Backspace') {
    const el = inputEl.value
    if (
      el &&
      el.selectionStart === 0 &&
      el.selectionEnd === 0 &&
      !inputSlash.value.args
    ) {
      e.preventDefault()
      input.value = `/${inputSlash.value.name}`
      return
    }
  }
  const picker = slashPickerRef.value
  if (!picker?.isOpen) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    picker.moveActive(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    picker.moveActive(-1)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    picker.pickActive()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    input.value = ''
  }
}

const onInputEnter = () => {
  const picker = slashPickerRef.value
  if (picker?.isOpen) {
    picker.pickActive()
    return
  }
  void send()
}

watch(
  () => props.projectRoot,
  () => {
    void load()
    void loadWsMetas()
  },
)

onMounted(() => {
  void loadModels()
  void load()
  void loadWsMetas()
  void refreshSlashCommandRegistry(props.projectRoot ?? '')
})

watch(
  () => props.projectRoot,
  (root) => {
    void refreshSlashCommandRegistry(root ?? '')
  },
)

onUnmounted(() => {
  clearProgressUi()
})

const showProgressBubble = computed(() => loading.value || pendingBusy.value)

const showNoSessionLanding = computed(() => hasProject.value && !activeSession.value)

const isEmptyChat = computed(
  () =>
    hasProject.value &&
    !!activeSession.value &&
    messages.value.length === 0 &&
    !loading.value &&
    !pendingBusy.value,
)

const landingShortcuts = [
  { label: 'New Agent', keys: ['+'] },
  { label: 'Show/Hide Terminal', keys: ['⌘', '`'] },
  { label: 'Command Palette', keys: ['⌘', '⇧', 'P'] },
  { label: 'Show/Hide AI Panel', keys: ['⌘', '⇧', 'C'] },
  { label: 'Open Project', keys: ['⌘', 'O'] },
  { label: 'Find in Project', keys: ['⌘', '⇧', 'F'] },
]

const progressHeadline = computed(() => {
  if (agentMode.value && progressSteps.value.length) {
    const active = [...progressSteps.value].reverse().find((s) => s.status === 'active')
    return active?.label ?? 'Agent 执行中…'
  }
  if (agentMode.value) return '正在启动 Agent…'
  return CHAT_IDLE_HINTS[idleHintIdx.value] ?? CHAT_IDLE_HINTS[0]
})

defineExpose({
  sessionMetas,
  activeId,
  newChat,
  load,
  loadModels,
  selectSession,
  deleteSession,
  reset,
  newWorkshop: async () => {
    workshopSectionRef.value?.newSession()
    await nextTick()
    const id = workshopSectionRef.value?.activeId ?? ''
    if (id) {
      addUnifiedTab(id, 'workshop')
      setActiveTab(id, 'workshop')
    }
  },
  selectWorkshopSession: async (id: string) => {
    addUnifiedTab(id, 'workshop')
    await switchUnifiedTab({ id, kind: 'workshop' })
  },
  closeWorkshopTab: (id: string) => closeUnifiedTab({ id, kind: 'workshop' }),
  loadWorkshopUsers: () => workshopSectionRef.value?.loadWorkshopUsers(),
  loadWorkshop: loadWsMetas,
  workshopActiveId: activeTabId,
  activeTabKind,
})
</script>

<template>
  <section
    class="chat-pane"
    :class="{
      'workshop-in-chat': isWorkshopMode,
      'agents-hidden': !agentsSidebarVisible,
      'chat-empty': !isWorkshopMode && isEmptyChat,
      'chat-no-session': !isWorkshopMode && showNoSessionLanding,
    }"
  >
    <div class="chat-tabs">
      <div
        v-for="tab in unifiedOpenTabs"
        :key="tab.key"
        class="chat-tab"
        :class="{ active: tab.id === activeTabId && tab.kind === activeTabKind }"
        @click="switchUnifiedTab({ id: tab.id, kind: tab.kind })"
      >
        <span class="tab-label">{{ tab.title }}</span>
        <button
          type="button"
          class="tab-close"
          title="关闭标签"
          @click.stop="closeUnifiedTab({ id: tab.id, kind: tab.kind })"
        >
          ×
        </button>
      </div>
      <div class="tabs-spacer" />
      <button
        v-if="!agentsSidebarVisible"
        type="button"
        class="agents-expand"
        title="Show session history"
        @click="emit('showAgentsSidebar')"
      >
        <svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
          <rect x="9" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
    <WorkshopChatSection
      v-show="isWorkshopMode"
      ref="workshopSectionRef"
      class="workshop-chat-host"
      :project-root="projectRoot"
      :profile-display-name="profileDisplayName"
      :profile-avatar-path="profileAvatarPath"
      @sessions-changed="onWorkshopSessionsChanged"
      @open-file="(p) => emit('openFile', p)"
      @open-models-settings="emit('openModelsSettings')"
      @active-change="onWorkshopActiveChange"
    />
    <div v-show="!isWorkshopMode" class="agent-chat-body">
    <div
      ref="messagesEl"
      :key="activeId"
      class="chat-messages"
      :class="{ 'chat-messages--landing': showNoSessionLanding }"
    >
      <div v-if="showNoSessionLanding" class="chat-landing">
        <img class="chat-landing-logo" src="/donkey-loading.png" width="80" height="80" alt="" />
        <ul class="chat-landing-shortcuts">
          <li v-for="item in landingShortcuts" :key="item.label">
            <span class="landing-label">{{ item.label }}</span>
            <span class="landing-keys">
              <kbd v-for="(key, ki) in item.keys" :key="ki">{{ key }}</kbd>
            </span>
          </li>
        </ul>
      </div>
      <div v-else-if="!hasProject" class="empty-hint">Open a project to start chatting</div>
      <div v-else-if="!messages.length" class="empty-hint">Send your first message, or pick a session from the right</div>
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="message"
        :class="[msg.role, msg.role === 'user' && profileHeaderVisible ? 'message-user--profile' : '']"
      >
        <div v-if="msg.role === 'user' && profileHeaderVisible" class="user-message user-message--profile">
          <div class="user-message-body">
            <div class="user-message-meta">
              <span class="user-message-nickname">{{ profileNickname }}</span>
            </div>
            <div class="user-bubble" :class="{ 'user-bubble--slash': userBubbleSlashMinimal(msg) }">
              <div v-if="msg.filePaths?.length" class="msg-file-tags">
                <span v-for="fp in msg.filePaths" :key="fp" class="msg-file-tag" :title="fp">
                  {{ relativeToProject(projectRoot, fp) }}
                </span>
              </div>
              <template v-if="slashMessageParts(msg)">
                <div v-if="slashMessageParts(msg)!.body" class="slash-cmd-flow">
                  <span class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span
                  ><span class="slash-cmd-body">{{ slashMessageParts(msg)!.body }}</span>
                </div>
                <span v-else class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span>
              </template>
              <template v-else-if="msg.text">{{ msg.text }}</template>
            </div>
          </div>
          <div class="user-message-avatar" :title="profileNickname">
            <img v-if="profileAvatarUrl" :src="profileAvatarUrl" alt="" />
            <span v-else>{{ profileNickname.slice(0, 1) }}</span>
          </div>
        </div>
        <div
          v-else-if="msg.role === 'user'"
          class="user-bubble"
          :class="{ 'user-bubble--slash': userBubbleSlashMinimal(msg) }"
        >
          <div v-if="msg.filePaths?.length" class="msg-file-tags">
            <span v-for="fp in msg.filePaths" :key="fp" class="msg-file-tag" :title="fp">
              {{ relativeToProject(projectRoot, fp) }}
            </span>
          </div>
          <template v-if="slashMessageParts(msg)">
            <div v-if="slashMessageParts(msg)!.body" class="slash-cmd-flow">
              <span class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span
              ><span class="slash-cmd-body">{{ slashMessageParts(msg)!.body }}</span>
            </div>
            <span v-else class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span>
          </template>
          <template v-else-if="msg.text">{{ msg.text }}</template>
        </div>
        <template v-else>
          <div
            v-if="msg.text.trim()"
            class="assistant-text"
            v-html="renderMarkdown(msg.text)"
          />
          <ChatAskUserCard
            v-for="pa in msg.pendingAsks ?? []"
            :key="pa.id"
            :pending="pa"
            :busy="pendingBusy"
            @submit="(answers) => onAnswerPending(msg, pa.id, answers)"
          />
          <ChatBashCard
            v-for="pb in msg.pendingBashes ?? []"
            :key="pb.id"
            :pending="pb"
            :busy="pendingBusy"
            @confirm="onConfirmBashPending(msg, pb.id)"
            @reject="onRejectBashPending(msg, pb.id)"
          />
          <ChatDiffCard
            v-for="pw in msg.pendingWrites ?? []"
            :key="pw.id"
            :pending="pw"
            :busy="pendingBusy"
            @confirm="onConfirmPending(msg, pw.id)"
            @reject="onRejectPending(msg, pw.id)"
          />
        </template>
      </div>
      <div v-if="showProgressBubble" class="message assistant">
        <div class="assistant-text loading-bubble agent-progress-bubble">
          <AgentProgressStream
            :steps="progressSteps"
            :stream-text="streamText"
            :subagent-tasks="subagentTaskList"
            :agent-mode="agentMode"
            :fallback-headline="progressHeadline"
          />
        </div>
      </div>
    </div>
    <div v-if="lastAssistantText && !loading" class="reply-actions">
      <button type="button" class="icon-btn" title="复制回复" @click="copyLastReply">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <rect
            x="5.5"
            y="5.5"
            width="7"
            height="7"
            rx="1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            d="M5.5 10.5H4.5a1.5 1.5 0 0 1-1.5-1.5V4.5A1.5 1.5 0 0 1 4.5 3h4.5a1.5 1.5 0 0 1 1.5 1.5V5.5"
          />
        </svg>
      </button>
      <button
        type="button"
        class="icon-btn"
        title="重新生成"
        :disabled="!enabledModels.length"
        @click="regenerateLastReply"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            d="M8 3a5 5 0 1 0 4.2 7.6M8 1.5v3M8 4.5H5.5"
          />
        </svg>
      </button>
    </div>
    <div v-if="sessionPendingState.count > 0" class="pending-bulk-bar">
      <div class="pending-bulk-left">
        <span class="pending-bulk-label">
          {{ sessionPendingState.count }} 项待确认（文件变更 / 命令）
        </span>
        <label class="pending-auto-apply" title="开启后 Write / Edit / Delete / Move / Bash 将直接执行，不再弹出确认">
          <SwitchToggle
            :model-value="!!agentAutoApplyWrites"
            @update:model-value="onAgentAutoApplyChange"
          />
          自动应用，无需确认
        </label>
      </div>
      <div class="pending-bulk-actions">
        <button
          type="button"
          class="btn-apply-all"
          :disabled="pendingBusy"
          @click="onConfirmAllPending"
        >
          全部确认 ({{ sessionPendingState.count }})
        </button>
        <button
          type="button"
          class="btn-reject-all"
          :disabled="pendingBusy"
          @click="onRejectAllPending"
        >
          全部拒绝
        </button>
      </div>
    </div>
    <div v-if="activeSession" class="chat-input-area">
      <SlashCommandPicker
        ref="slashPickerRef"
        :input-text="input"
        :anchor-el="inputBoxEl"
        @select="onSlashPick"
      />
      <div
        ref="inputBoxEl"
        class="input-box"
        :class="{ 'drop-active': dropActive }"
        @dragover="onChatDragOver"
        @dragleave="onChatDragLeave"
        @drop="onChatDrop"
      >
        <div v-if="attachedFiles.length || pendingContextFile" class="file-refs">
          <span
            v-for="f in attachedFiles"
            :key="f.path"
            class="file-ref-chip"
            :title="f.path"
          >
            {{ f.name }}
            <button type="button" class="chip-remove" @click="removeAttached(f.path)">×</button>
          </span>
          <span
            v-if="pendingContextFile"
            class="file-ref-chip context"
            :title="pendingContextFile.path"
          >
            {{ pendingContextFile.name }}
            <button
              type="button"
              class="chip-remove"
              @click="includeContextFile = false"
            >
              ×
            </button>
          </span>
        </div>
        <div class="chat-input-wrap" :class="{ 'has-slash': !!inputSlash }">
          <span v-if="inputSlash" class="input-slash-pill" title="斜杠命令">
            /{{ inputSlash.name }}
            <button type="button" class="input-slash-remove" @click="clearInputSlash">×</button>
          </span>
          <textarea
            ref="inputEl"
            :value="inputFieldValue"
            class="chat-input"
            rows="1"
            :placeholder="inputSlash ? '补充说明…' : 'Plan, Build, / for commands, @ for context'"
            @input="onInputField"
            @keydown="onInputKeydown"
            @keydown.enter.exact.prevent="onInputEnter"
          />
        </div>
        <div class="chat-input-footer">
          <div class="footer-left">
            <span class="agent-pill" title="Agent">
              <svg class="agent-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.2"
                  d="M4.5 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z M8 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z"
                />
              </svg>
              Agent
            </span>
            <ModelPickerDropdown
              v-if="enabledModels.length"
              :models="enabledModels"
              :active-model-id="modelsFile.activeModelId"
              @select="onModelPick"
              @add-models="emit('openModelsSettings')"
            />
            <button
              v-else
              type="button"
              class="add-models-link"
              @click="emit('openModelsSettings')"
            >
              添加模型
            </button>
          </div>
          <div class="footer-right">
            <label
              v-if="agentMode"
              class="auto-apply-toggle"
              title="开启后 Agent 的文件变更与 Bash 命令将直接应用，不再显示「应用 / 拒绝」"
            >
              <SwitchToggle
            :model-value="!!agentAutoApplyWrites"
            @update:model-value="onAgentAutoApplyChange"
          />
              Auto Run
            </label>
            <button
              v-if="showAgentStop"
              type="button"
              class="stop-btn"
              title="停止 Agent"
              @click="stopAgentRun"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button
              v-else
              type="button"
              class="send-btn"
              :class="{ active: canSend }"
              title="发送"
              :disabled="loading || !enabledModels.length"
              @click="send"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 12V5.5M8 5.5L5.25 8.25M8 5.5l2.75 2.75"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </section>
</template>

<style scoped>
.chat-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--wc-panel);
  min-height: 0;
  overflow: hidden;
  position: relative;
  font-family: var(--wc-font-sans);
  font-size: var(--wc-font-size-ui);
  font-weight: var(--wc-font-weight-ui);
}

.agent-chat-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-pane.workshop-in-chat .workshop-chat-host,
.chat-pane:not(.workshop-in-chat) .agent-chat-body {
  flex: 1;
  min-height: 0;
}

.chat-pane.workshop-in-chat .workshop-chat-host {
  display: flex;
  flex-direction: column;
}

.chat-pane.chat-empty .empty-hint {
  display: none;
}

.chat-messages--landing {
  justify-content: center;
  align-items: center;
}

.chat-landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
  max-width: 340px;
  user-select: none;
}

.chat-landing-logo {
  display: block;
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.chat-landing-shortcuts {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-landing-shortcuts li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--wc-font-size-ui);
  color: var(--wc-landing-label);
  line-height: 1.4;
}

.landing-label {
  flex: 1;
  min-width: 0;
}

.landing-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.landing-keys kbd {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: 1px solid var(--wc-kbd-border);
  background: var(--wc-kbd-bg);
  font-size: var(--wc-font-size-kbd);
  font-family: var(--wc-font-sans);
  font-weight: var(--wc-font-weight-ui);
  color: var(--wc-kbd-fg);
  line-height: 1;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}

.chat-pane.chat-empty .chat-input-area {
  position: absolute;
  top: calc(35px + (100% - 35px) / 2);
  left: 0;
  right: 0;
  transform: translateY(-50%);
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.chat-tabs {
  height: 35px;
  display: flex;
  align-items: stretch;
  background: var(--wc-bg-dark);
  padding: 0;
  gap: 0;
  flex-shrink: 0;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.chat-tabs::-webkit-scrollbar {
  display: none;
}

.tabs-spacer {
  flex: 1;
  align-self: stretch;
  border-bottom: 1px solid var(--wc-border);
}

.agents-expand {
  align-self: flex-end;
  width: 28px;
  height: 32px;
  margin-right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border-bottom: 1px solid var(--wc-border);
  color: var(--wc-text-muted);
  flex-shrink: 0;
}

.agents-expand:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.agents-expand .sidebar-toggle-icon {
  width: 16px;
  height: 16px;
}

.chat-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 0 1 auto;
  max-width: min(220px, 100%);
  align-self: flex-end;
  height: 32px;
  box-sizing: border-box;
  padding: 0 8px 0 12px;
  font-size: 12px;
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--wc-border);
  overflow: hidden;
  cursor: pointer;
  color: var(--wc-text-muted);
}

.chat-tab.active {
  align-self: stretch;
  height: auto;
  background: var(--wc-panel);
  color: var(--wc-text);
  border: none;
  border-top: 1px solid var(--wc-border);
  border-left: 1px solid var(--wc-border);
  border-right: 1px solid var(--wc-border);
  margin-bottom: -1px;
  padding-bottom: 1px;
  position: relative;
  z-index: 1;
}

.chat-tabs > .chat-tab:first-of-type.active {
  border-left-color: transparent;
}

.tab-close {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-muted);
}

.tab-close:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.tab-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-messages {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-hint {
  color: var(--wc-text-dim);
  font-size: 13px;
  text-align: center;
  margin-top: 40px;
}

.message.user.message-user--profile {
  display: flex;
  justify-content: flex-end;
}

.user-message--profile {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: max-content;
  max-width: 60%;
}

.user-message-body {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
  max-width: calc(100% - 46px);
}

.user-message--profile .user-bubble {
  max-width: 100%;
  word-break: break-word;
}

.user-message-meta {
  display: flex;
  justify-content: flex-end;
}

.user-message-nickname {
  font-size: 13px;
  font-weight: 600;
  color: var(--wc-text);
}

.user-message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wc-hover);
  font-size: 14px;
  font-weight: 600;
  color: var(--wc-text);
}

.user-message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-bubble {
  max-width: 85%;
  padding: 10px 14px;
  background: var(--wc-input-bg);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.user-bubble--slash {
  padding: 0;
  background: transparent;
}

.slash-cmd-flow {
  line-height: 1.5;
  word-break: break-word;
}

.slash-cmd-body {
  white-space: pre-wrap;
}

.slash-cmd-flow .slash-cmd-tag {
  margin-right: 0.35em;
}

.slash-cmd-tag {
  display: inline-block;
  vertical-align: baseline;
  max-width: 100%;
  padding: 1px 8px;
  box-sizing: border-box;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: #c9922e;
  background: color-mix(in srgb, #d4a84a 10%, var(--wc-input-bg));
  border: 0.5px solid rgba(212, 168, 74, 0.45);
  white-space: nowrap;
}

.assistant-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--wc-text);
  max-width: 100%;
  overflow-x: auto;
}

.loading-bubble {
  display: inline-block;
  padding: 10px 14px;
  background: var(--wc-input-bg);
  border-radius: 12px;
  font-size: 12px;
  color: var(--wc-text-dim);
}

.agent-progress-bubble {
  min-width: 200px;
  max-width: 100%;
  padding: 0;
  background: transparent;
  border-radius: 0;
  overflow: visible;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  padding: 0 12px 4px;
  flex-shrink: 0;
}

.reply-actions .icon-btn {
  width: 26px;
  height: 26px;
}

.pending-bulk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-top: 1px solid var(--wc-border);
  background: var(--wc-chat-box-bg);
  flex-shrink: 0;
}

.pending-bulk-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pending-bulk-label {
  font-size: 12px;
  color: var(--wc-text-muted);
  min-width: 0;
}

.pending-auto-apply {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--wc-text-dim);
  cursor: pointer;
  user-select: none;
}

.pending-bulk-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-apply-all,
.btn-reject-all {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.btn-apply-all {
  background: var(--wc-accent, #7aa2f7);
  color: #fff;
}

.btn-apply-all:disabled,
.btn-reject-all:disabled {
  opacity: 0.5;
  cursor: default;
}

.auto-apply-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--wc-text-dim);
  cursor: pointer;
  user-select: none;
}

.btn-reject-all {
  background: transparent;
  border: 1px solid var(--wc-border);
  color: var(--wc-text-muted);
}

.chat-input-area {
  padding: 10px 12px 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.input-box {
  background: var(--wc-chat-box-bg);
  border: 1px solid var(--wc-chat-box-border);
  border-radius: 12px;
  overflow: visible;
}

.input-box.drop-active {
  border-color: var(--wc-accent, #4a9eff);
  box-shadow: 0 0 0 1px rgba(74, 158, 255, 0.35);
}

.file-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px 0;
}

.file-ref-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 6px 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--wc-text);
  background: var(--wc-muted-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-ref-chip.context {
  color: var(--wc-text-muted);
  border: 1px dashed var(--wc-muted-border);
  background: transparent;
}

.chip-remove {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-muted);
}

.chip-remove:hover {
  background: var(--wc-muted-surface-strong);
  color: var(--wc-text);
}

.msg-file-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.msg-file-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--wc-tag-bg);
  color: var(--wc-text-muted);
}

.chat-input-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 14px 4px;
  min-height: 44px;
}

.chat-input-wrap.has-slash {
  padding-top: 9px;
}

.input-slash-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-top: 1px;
  padding: 3px 4px 3px 10px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--wc-text);
  background: color-mix(in srgb, var(--wc-input-bg) 82%, var(--wc-accent) 18%);
  border: 1px solid color-mix(in srgb, var(--wc-accent) 40%, var(--wc-border));
  line-height: 1.4;
}

.input-slash-remove {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-muted);
}

.input-slash-remove:hover {
  background: color-mix(in srgb, var(--wc-accent) 20%, var(--wc-muted-surface));
  color: var(--wc-text);
}

.chat-input-wrap .chat-input {
  flex: 1;
  min-width: 60px;
  padding: 0;
  min-height: 22px;
}

.chat-input {
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  resize: none;
  padding: 12px 14px 4px;
  background: transparent;
  font-size: 13px;
  line-height: 1.5;
  color: var(--wc-text);
}

.chat-input::placeholder {
  color: var(--wc-text-muted);
}

.chat-pane.chat-empty .chat-input-wrap {
  min-height: 72px;
}

.chat-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px 8px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.agent-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--wc-text-muted);
  background: var(--wc-muted-surface);
  flex-shrink: 0;
  user-select: none;
}

.agent-icon {
  opacity: 0.85;
}

.add-models-link {
  padding: 3px 6px;
  font-size: 12px;
  color: var(--wc-text-muted);
  border-radius: 6px;
}

.add-models-link:hover {
  color: var(--wc-text);
  background: var(--wc-muted-surface);
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wc-text-muted);
}

.icon-btn:hover {
  background: var(--wc-muted-surface-hover);
  color: var(--wc-text);
}

.send-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wc-muted-surface);
  color: var(--wc-text-dim);
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.send-btn.active {
  background: var(--wc-send-active-bg);
  color: var(--wc-send-active-fg);
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.send-btn.active:hover:not(:disabled) {
  background: var(--wc-send-active-hover);
}

.stop-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #c45c5c;
  color: #fff;
  transition: background 0.15s;
}

.stop-btn:hover {
  background: #a84848;
}

.assistant-text :deep(p) {
  margin: 0 0 0.6em;
}

.assistant-text :deep(p:last-child) {
  margin-bottom: 0;
}

.assistant-text :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  background: var(--wc-code-block-bg);
  border-radius: 8px;
  overflow-x: auto;
  font-family: var(--wc-font-mono);
  font-size: 12px;
}

.assistant-text :deep(code) {
  font-family: var(--wc-font-mono);
  font-size: 12px;
}

.assistant-text :deep(ul),
.assistant-text :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.4em;
}

.assistant-text :deep(h1),
.assistant-text :deep(h2),
.assistant-text :deep(h3),
.assistant-text :deep(h4) {
  margin: 1em 0 0.5em;
  font-weight: 600;
  line-height: 1.35;
}

.assistant-text :deep(h1) {
  font-size: 1.35em;
}

.assistant-text :deep(h2) {
  font-size: 1.2em;
}

.assistant-text :deep(h3) {
  font-size: 1.1em;
}

.assistant-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
  font-size: 12px;
}

.assistant-text :deep(th),
.assistant-text :deep(td) {
  border: 1px solid var(--wc-border);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}

.assistant-text :deep(th) {
  background: var(--wc-muted-surface);
  font-weight: 600;
}

.assistant-text :deep(blockquote) {
  margin: 0.6em 0;
  padding: 0.2em 0 0.2em 12px;
  border-left: 3px solid var(--wc-border);
  color: var(--wc-text-muted);
}

.assistant-text :deep(hr) {
  margin: 1em 0;
  border: none;
  border-top: 1px solid var(--wc-border);
}

.assistant-text :deep(a) {
  color: var(--wc-accent, #4a9eff);
  text-decoration: none;
}

.assistant-text :deep(a:hover) {
  text-decoration: underline;
}

.assistant-text :deep(:not(pre) > code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--wc-code-block-bg);
}

.assistant-text :deep(pre code) {
  padding: 0;
  background: transparent;
}
</style>
