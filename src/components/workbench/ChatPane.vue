<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import type {
  AgentContinueResult,
  AgentPendingAskUser,
  AgentPendingPlan,
  AgentSendResult,
  AgentToolLogEntry,
  AiChatMessage,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  ModelEntry,
  ModelsFile,
  PlanBuildTrack,
  UserEntry,
  WorkshopSessionMeta,
} from '../../types/axecoder'
import ModelPickerDropdown from './ModelPickerDropdown.vue'
import ChatModePickerDropdown from './ChatModePickerDropdown.vue'
import SlashCommandPicker from './SlashCommandPicker.vue'
import AtRefPicker from './AtRefPicker.vue'
import ChatDiffCard from './ChatDiffCard.vue'
import ChatAskUserCard from './ChatAskUserCard.vue'
import ChatPlanCard from './ChatPlanCard.vue'
import ChatBashCard from './ChatBashCard.vue'
import BackgroundTaskCard from './BackgroundTaskCard.vue'
import AgentProgressStream from './AgentProgressStream.vue'
import FooterTpsBadge from './FooterTpsBadge.vue'
import { isUnderProject, relativeToProject, type ChatFileRef } from '../../utils/chat-file-context'
import { formatWorkshopAskAnswers } from '../../utils/workshop-ask'
import {
  applyProgressPayload,
  CHAT_IDLE_HINTS,
  type AgentProgressStep,
} from '../../utils/agent-progress'
import { useAgentStore } from '../../stores/agentStore'
import { useStickToBottomScroll } from '../../composables/useStickToBottomScroll'
import { detectThinkingType } from '../../utils/thinking-parser'
import {
  isPlanBuiltContent,
  isPlanEditorPath,
  markPlanFileBuilt,
  planAbsolutePath,
} from '../../utils/plan-built'
import {
  advancePlanStepStatuses,
  completeAllPlanStepStatuses,
  extractPlanSteps,
  startPlanStepStatuses,
} from '../../utils/plan-steps'
import { runSlashCommand } from '../../slash-commands/run'
import { refreshSlashCommandRegistry, findCommand } from '../../slash-commands/registry'
import type { SlashContext } from '../../slash-commands/types'
import { findUserById } from '../../utils/workshop-user-bind'
import {
  effectiveUserSkillSlugs,
  formatRoleMentionInput,
  parseCommittedRoleMention,
  resolveRoleCommandSlug,
  sanitizeRoleMentionArgs,
  stripRoleCommandPrefix,
} from '../../utils/role-mention'
import {
  prepareRoleWorkflowSendPlan,
  validateRoleMentionText,
} from '../../utils/role-workflow-send'
import { playAgentCompletionSound } from '../../utils/play-completion-sound'
import SwitchToggle from './SwitchToggle.vue'
import WorkshopChatSection from './WorkshopChatSection.vue'
import type { SessionKind } from '../../types/axecoder'
import {
  useChatAttachedImages,
  type AttachedImageView,
} from '../../composables/useChatAttachedImages'
import {
  canPickChatMode,
  loadStoredChatMode,
  saveStoredChatMode,
  type ChatModeId,
} from '../../utils/chat-modes'
import { workshopIdForAgentChat } from '../../utils/workshop-agent-link'
import { providerSupportsSseStream } from '@shared/ai/provider-capabilities'
import { formatAiChatRequestError, visionUnsupportedMessage } from '../../utils/ai-chat-error'
import { visionBlockedForPendingImages } from '../../utils/chat-vision'
import { expandUserMessageForApi } from '../../utils/expand-user-message'
import {
  loadStoredChatEffort,
  saveStoredChatEffort,
  type ReasoningEffortLevel,
} from '../../utils/chat-effort'

const md = new MarkdownIt()
const agentStore = useAgentStore()

const showTpsLive = computed(() => agentProgressActive.value || loading.value)

const workshopSectionRef = ref<InstanceType<typeof WorkshopChatSection> | null>(null)

const props = defineProps<{
  projectRoot: string
  /** Agent/Workshop session kind from App; tab uses ChatPane activeTabKind */
  sessionKind?: SessionKind
  contextFilePath?: string | null
  /** 当前编辑器打开文件内容（用于 plan Build 状态） */
  contextFileContent?: string
  /** Hide landing welcome when editor has open file tabs */
  hasOpenEditorTabs?: boolean
  agentsSidebarVisible: boolean
  agentAutoApplyWrites: boolean
  agentAutoPlanOn?: boolean
  agentCompletionSoundEnabled?: boolean
  agentCompletionSoundPath?: string
  profileDisplayName?: string
  profileAvatarPath?: string
}>()

const emit = defineEmits<{
  close: []
  showAgentsSidebar: []
  openModelsSettings: []
  openPermissionsSettings: []
  activeChange: [id: string]
  kindChange: [kind: SessionKind]
  sessionsChanged: []
  filesChanged: []
  openFile: [path: string]
  planFileBuilt: [path: string]
  'update:agentAutoApplyWrites': [value: boolean]
  'update:agentAutoPlanOn': [value: boolean]
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
const isMultiAgentInAgentChat = computed(
  () => activeTabKind.value === 'agent' && chatModeId.value === 'multi-agent',
)
const isWorkshopEmbeddedInAgentChat = computed(
  () =>
    activeTabKind.value === 'agent' &&
    (chatModeId.value === 'multi-agent' ||
      chatModeId.value === 'reflection' ||
      chatModeId.value === 'software-company'),
)
const showWorkshopPanel = computed(
  () => isWorkshopMode.value || isWorkshopEmbeddedInAgentChat.value,
)
const showAgentComposer = computed(
  () => hasProject.value && (!showWorkshopPanel.value || isWorkshopEmbeddedInAgentChat.value),
)
const workshopLoading = computed(() => !!workshopSectionRef.value?.loading)
const workshopPendingQuestion = computed(
  () => workshopSectionRef.value?.pendingQuestion ?? '',
)
const workshopPendingAsks = computed(
  () => workshopSectionRef.value?.pendingAsks ?? [],
)

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
  const fallback = embeddedWorkshopTitlePlaceholder()
  const liveId = workshopSectionRef.value?.activeId
  if (id === liveId) return workshopSectionRef.value?.activeTitle ?? fallback
  return wsTitleById.value[id] ?? wsMetas.value.find((m) => m.id === id)?.title ?? fallback
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
  if (isMultiAgentInAgentChat.value) return
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

let lastMultiAgentSyncKey = ''

const syncMultiAgentWorkshop = async () => {
  if (!isWorkshopEmbeddedInAgentChat.value || !hasProject.value || !activeId.value) return
  const key = activeId.value
  if (lastMultiAgentSyncKey === key) return
  lastMultiAgentSyncKey = key
  await nextTick()
  await workshopSectionRef.value?.openForAgentChat(activeId.value)
  await syncMultiAgentAgentSessionTitle()
}

const embeddedWorkshopTitlePlaceholder = () => {
  if (chatModeId.value === 'reflection') return 'Reflection'
  if (chatModeId.value === 'software-company') return 'Software Co.'
  return 'Multi-Agent'
}
const AGENT_TITLE_PLACEHOLDERS = new Set([
  'New Agent',
  'New chat',
  '新对话',
  'Multi-Agent',
  'Reflection',
])

/** Multi-Agent / Reflection 对话在 Workshop 线程；侧栏/标签仍显示 Agent 会话，需把 Workshop 标题写回 */
const syncMultiAgentAgentSessionTitle = async () => {
  if (!isWorkshopEmbeddedInAgentChat.value || !hasProject.value || !activeSession.value || !activeId.value)
    return
  const wsTitle = workshopSectionRef.value?.activeTitle?.trim()
  const placeholder = embeddedWorkshopTitlePlaceholder()
  if (!wsTitle || wsTitle === placeholder) return
  const s = activeSession.value
  if (!AGENT_TITLE_PLACEHOLDERS.has(s.title) && s.title !== wsTitle) return
  if (s.title === wsTitle) {
    void maybeRefreshMultiAgentSessionTitle()
    return
  }
  s.title = wsTitle
  s.updatedAt = Date.now()
  await persist({ skipTitleSuggest: true })
  void maybeRefreshMultiAgentSessionTitle()
}

const workshopMessagesForTitleSuggest = (
  messages: { roleId: string; text: string; hidden?: boolean }[],
) =>
  messages
    .filter((m) => !m.hidden && m.roleId !== 'system' && m.text.trim())
    .map((m) => ({
      role: (m.roleId === 'user' || m.roleId === 'manager' ? 'user' : 'assistant') as
        | 'user'
        | 'assistant',
      text: m.text,
    }))

const maybeRefreshMultiAgentSessionTitle = async () => {
  if (titleSuggestInFlight || !isWorkshopEmbeddedInAgentChat.value || !hasProject.value || !activeSession.value)
    return
  const modelId = modelsFile.value.activeModelId
  if (!modelId) return
  const wsId = workshopIdForAgentChat(activeId.value)
  const { session } = await window.axecoder.getWorkshopSession(props.projectRoot, wsId)
  if (!session?.messages.length) return
  const payload = workshopMessagesForTitleSuggest(session.messages)
  const s = activeSession.value
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

const onWorkshopSessionsChanged = async () => {
  await loadWsMetas()
  const id = workshopSectionRef.value?.activeId
  if (id) {
    const title = workshopSectionRef.value?.activeTitle
    if (title) wsTitleById.value = { ...wsTitleById.value, [id]: title }
  }
  await syncMultiAgentAgentSessionTitle()
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
const atRefPickerRef = ref<InstanceType<typeof AtRefPicker> | null>(null)
const inputCursor = ref(0)
const chatEffort = ref<ReasoningEffortLevel>(loadStoredChatEffort())
const mentionUsers = ref<UserEntry[]>([])
const roleAvatarUrls = ref<Record<string, string>>({})
const { scrollEl: messagesEl, onScrollContainer, scrollToBottom: scrollMessages } =
  useStickToBottomScroll()
const loading = ref(false)
const modelsFile = ref<ModelsFile>({ schemaVersion: 1, activeModelId: '', models: [] })
const attachedFiles = ref<ChatFileRef[]>([])
const chatSessionId = computed(
  () => activeSession.value?.id ?? `draft-${Date.now()}`,
)
const {
  attachedImages,
  onPasteImage,
  removeAttachedImage,
  clearAttachedImages,
  resolveImageRefsForApi,
  imageRefsForPersist,
} = useChatAttachedImages(chatSessionId)
const includeContextFile = ref(false)
const dropActive = ref(false)
const pendingBusy = ref(false)
const progressSteps = ref<AgentProgressStep[]>([])
const loopGuardNotice = ref('')
const pendingAssigneeUserId = ref('')
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

const chatModeId = ref<ChatModeId>(loadStoredChatMode())
const workshopMessageCount = ref(0)

const hasSessionMessagesForModeLock = computed(() => {
  if ((activeSession.value?.messages.length ?? 0) > 0) return true
  if (
    (chatModeId.value === 'multi-agent' ||
      chatModeId.value === 'reflection' ||
      chatModeId.value === 'software-company') &&
    workshopMessageCount.value > 0
  )
    return true
  return false
})

const onChatModePick = (id: ChatModeId) => {
  if (!canPickChatMode(chatModeId.value, id, hasSessionMessagesForModeLock.value)) return
  chatModeId.value = id
  saveStoredChatMode(id)
  if (id !== 'multi-agent' && id !== 'reflection' && id !== 'software-company') {
    lastMultiAgentSyncKey = ''
    return
  }
  lastMultiAgentSyncKey = ''
  void syncMultiAgentWorkshop()
}

const agentMode = computed(() => !!activeModel.value)

const sendAgent = (
  projectRoot: string,
  modelId: string,
  apiMessages: import('../../types/axecoder').AiChatMessage[],
  assigneeUserId?: string,
  roleWorkflowInvoke?: boolean,
) =>
  window.axecoder.agentSend(
    projectRoot,
    modelId,
    apiMessages,
    chatModeId.value,
    assigneeUserId,
    roleWorkflowInvoke,
    chatEffort.value,
  )

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
      ...(m.imageRefs?.length
        ? { imageRefs: JSON.parse(JSON.stringify(m.imageRefs)) }
        : {}),
      ...(m.imagePreviews?.length ? { imagePreviews: [...m.imagePreviews] } : {}),
      ...(m.apiContent ? { apiContent: m.apiContent } : {}),
      ...(m.slashInvoke ? { slashInvoke: m.slashInvoke } : {}),
      ...(m.slashOnly ? { slashOnly: true } : {}),
      ...(m.assistantContent !== undefined ? { assistantContent: m.assistantContent } : {}),
      ...(m.reasoningContent ? { reasoningContent: m.reasoningContent } : {}),
      ...(m.speakerUserId ? { speakerUserId: m.speakerUserId } : {}),
      ...(m.roleMentionUserId ? { roleMentionUserId: m.roleMentionUserId } : {}),
      ...(m.roleMentionCommand ? { roleMentionCommand: m.roleMentionCommand } : {}),
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

const inputAtMention = computed(() => {
  if (inputSlash.value || !showAgentComposer.value) return null
  return parseCommittedRoleMention(input.value, mentionUsers.value)
})

const inputAtMentionUser = computed(() =>
  inputAtMention.value
    ? findUserById(mentionUsers.value, inputAtMention.value.userId)
    : undefined,
)

const inputAtMentionCommandSlug = computed(() =>
  inputAtMentionUser.value
    ? resolveRoleCommandSlug(inputAtMentionUser.value, inputAtMention.value?.args ?? '')
    : undefined,
)

const inputFieldValue = computed(() => {
  if (inputSlash.value) return inputSlash.value.args
  if (inputAtMention.value) return inputAtMention.value.args
  return input.value
})

const onInputField = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value
  if (inputSlash.value) {
    input.value = `/${inputSlash.value.name} ${val}`
  } else if (inputAtMention.value) {
    input.value = formatRoleMentionInput(
      inputAtMention.value.displayName,
      sanitizeRoleMentionArgs(val),
    )
  } else {
    input.value = val
  }
  resizeInput()
}

const clearInputAtMention = () => {
  input.value = ''
  void nextTick(() => {
    resizeInput()
    inputEl.value?.focus()
  })
}

const onAtRolePick = (user: UserEntry, replaceStart: number) => {
  const el = inputEl.value
  const cursor = el?.selectionStart ?? input.value.length
  const before = input.value.slice(0, replaceStart)
  const after = input.value.slice(cursor)
  if (before.trim() === '' && !parseCommittedRoleMention(input.value, mentionUsers.value)) {
    input.value = formatRoleMentionInput(user.displayName)
  } else {
    input.value = `${before}@${user.displayName} ${after}`
  }
  void nextTick(() => {
    resizeInput()
    const pos = input.value.length - after.length
    el?.setSelectionRange(pos, pos)
    inputCursor.value = pos
    el?.focus()
  })
}

const loadMentionUsers = async () => {
  const data = await window.axecoder.listUsers()
  mentionUsers.value = data.users
  const next: Record<string, string> = {}
  for (const u of data.users) {
    if (!u.avatarPath) continue
    const res = await window.axecoder.getUserAvatarDataUrl(u.avatarPath)
    if (res.ok && res.dataUrl) next[u.id] = res.dataUrl
  }
  roleAvatarUrls.value = next
}

const speakerUser = (userId?: string) =>
  userId ? findUserById(mentionUsers.value, userId) : undefined

type RoleMentionDisplay = { userId: string; name: string; body: string; command?: string }

const roleMentionDisplay = (msg: ChatMessage): RoleMentionDisplay | null => {
  const mention = parseCommittedRoleMention(msg.text, mentionUsers.value)
  const userId = msg.roleMentionUserId ?? mention?.userId
  if (!userId && !mention) return null
  const u = userId ? speakerUser(userId) : undefined
  const name = u?.displayName ?? mention?.displayName ?? ''
  if (!name) return null
  let body = mention?.args ?? ''
  const command = msg.roleMentionCommand
  if (command && u) body = stripRoleCommandPrefix(body, command, effectiveUserSkillSlugs(u))
  return { userId: userId ?? mention!.userId, name, body, command }
}

const userBubbleRoleMentionMinimal = (msg: ChatMessage) => {
  const d = roleMentionDisplay(msg)
  return !!(d && !d.body)
}

const assigneeFromUserMessage = (msg: ChatMessage) =>
  msg.roleMentionUserId ?? parseCommittedRoleMention(msg.text, mentionUsers.value)?.userId

const clearInputSlash = () => {
  input.value = ''
  void nextTick(() => {
    resizeInput()
    inputEl.value?.focus()
  })
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
  await hydrateMessageImagePreviews(session.messages)
  if (!sessionMetas.value.some((m) => m.id === id)) {
    sessionMetas.value = [
      { id: session.id, title: session.title, updatedAt: session.updatedAt },
      ...sessionMetas.value,
    ]
  }
  addUnifiedTab(id, 'agent')
  activeSession.value = session
  activeId.value = id
  setActiveTab(id, 'agent')
  input.value = ''
  await scrollMessages(session.messages.length > 0)
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
  const linkedWs = workshopIdForAgentChat(id)
  removeUnifiedTab(linkedWs, 'workshop')
  await window.axecoder.deleteWorkshopSession(props.projectRoot, linkedWs)
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

const buildApiMessages = async (msgs: ChatMessage[]): Promise<AiChatMessage[]> => {
  const api: AiChatMessage[] = []
  for (const m of msgs) {
    if (m.role === 'user') {
      const content = (m.apiContent ?? m.text ?? '').trim()
      if (m.slashOnly && !m.apiContent) continue
      let images = m.apiImages
      if (!images?.length && m.imageRefs?.length) {
        images = await resolveImageRefsForApi(m.imageRefs)
      }
      if (!content && !images?.length) continue
      api.push({
        role: 'user',
        content,
        ...(images?.length ? { images } : {}),
      })
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

const hydrateMessageImagePreviews = async (msgs: ChatMessage[]) => {
  for (const m of msgs) {
    if (!m.imageRefs?.length || m.imagePreviews?.length) continue
    const urls: string[] = []
    for (const ref of m.imageRefs) {
      const res = await window.axecoder.getChatImagePreview(ref)
      if (res.ok) urls.push(res.dataUrl)
    }
    if (urls.length) m.imagePreviews = urls
  }
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

const bindAgentProgress = (initialSessionId?: string, assigneeUserId?: string) => {
  unbindAgentProgress()
  if (assigneeUserId) setPendingAssignee(assigneeUserId)
  progressSteps.value = []
  streamText.value = ''
  loopGuardNotice.value = ''
  runningAgentSessionId.value = initialSessionId ?? ''
  agentProgressActive.value = true
  progressUnsub = window.axecoder.onAgentProgress((payload) => {
    if (!agentProgressActive.value) return
    // 过滤 sessionId：只处理属于当前 session 的进度消息
    if (payload.sessionId && runningAgentSessionId.value && payload.sessionId !== runningAgentSessionId.value) {
      return
    }
    if (payload.sessionId) runningAgentSessionId.value = payload.sessionId
    if (payload.kind === 'delta') {
      streamText.value += payload.delta
    } else if (payload.kind === 'thinking_delta') {
      // 处理思考流增量
      agentStore.appendThinking(payload.delta)
      agentStore.setThinkingType(detectThinkingType(agentStore.currentThinking))
    } else if (payload.kind === 'content_delta') {
      // 处理内容流增量
      streamText.value += payload.delta
    } else if (payload.kind === 'subagent') {
      const next = new Map(subagentTasks.value)
      next.set(payload.taskId, {
        id: payload.taskId,
        description: payload.description,
        status: payload.status,
      })
      subagentTasks.value = next
    } else if (payload.kind === 'loop_guard') {
      loopGuardNotice.value = payload.text
    } else if (payload.kind === 'chat_mode') {
      if (canPickChatMode(chatModeId.value, payload.chatMode, hasSessionMessagesForModeLock.value)) {
        chatModeId.value = payload.chatMode
        saveStoredChatMode(payload.chatMode)
      }
    } else if (payload.kind === 'tool' && payload.status === 'done' && payload.ok) {
      bumpPlanBuildProgress(payload.sessionId)
      progressSteps.value = applyProgressPayload(progressSteps.value, payload)
    } else {
      progressSteps.value = applyProgressPayload(progressSteps.value, payload)
    }
    if (payload.kind !== 'thinking_delta') void scrollMessages()
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
  pendingAssigneeUserId.value = ''
  agentStore.clearThinking()
}

const setPendingAssignee = (userId?: string) => {
  pendingAssigneeUserId.value = userId?.trim() ?? ''
}

const progressAssigneeUser = computed(() => {
  const id = pendingAssigneeUserId.value
  return id ? speakerUser(id) : undefined
})

const showAgentStop = computed(() => {
  if (isWorkshopEmbeddedInAgentChat.value && workshopLoading.value) return true
  return (
    agentMode.value &&
    (loading.value || pendingBusy.value) &&
    !!runningAgentSessionId.value
  )
})

const stopAgentRun = async () => {
  if (isWorkshopEmbeddedInAgentChat.value && workshopLoading.value) {
    await workshopSectionRef.value?.stopRun()
    return
  }
  const sid = runningAgentSessionId.value
  if (!sid) return
  await window.axecoder.agentStop(sid)
}

const formatToolLog = (_log: AgentToolLogEntry[]) => ''

const maybePlayAgentDoneSound = (res: { ok: boolean; status: string; assistantText?: string }) => {
  if (!res.ok || res.status !== 'done') return
  if (res.assistantText?.includes('(stopped)')) return
  void playAgentCompletionSound({
    enabled: props.agentCompletionSoundEnabled,
    path: props.agentCompletionSoundPath,
  })
}

const mergeBackgroundTaskIds = (msg: ChatMessage, ids?: string[]) => {
  if (!ids?.length) return
  const set = new Set(msg.backgroundTaskIds ?? [])
  for (const id of ids) {
    if (id.trim()) set.add(id.trim())
  }
  msg.backgroundTaskIds = [...set]
}

const pushAssistantFromAgent = (
  res: AgentSendResult | AgentContinueResult,
  model?: ModelEntry,
) => {
  if (!activeSession.value) return
  if (!res.ok) {
    activeSession.value.messages.push({
      role: 'assistant',
      text: formatAiChatRequestError(res.error, model),
    })
    return
  }
  const suffix = formatToolLog(res.toolLog)
  const speakerUserId = res.speakerUserId
  if (res.status === 'done') {
    activeSession.value.messages.push({
      role: 'assistant',
      text: (res.assistantText + suffix).trim() || '(done)',
      toolLog: res.toolLog,
      ...(speakerUserId ? { speakerUserId } : {}),
      ...(res.assistantContent !== undefined ? { assistantContent: res.assistantContent } : {}),
      ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
      ...(res.backgroundTaskIds?.length ? { backgroundTaskIds: [...res.backgroundTaskIds] } : {}),
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
    pendingPlans: res.pendingPlans,
    agentSessionId: res.sessionId,
    ...(speakerUserId ? { speakerUserId } : {}),
    ...(res.assistantContent !== undefined ? { assistantContent: res.assistantContent } : {}),
    ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
    ...(res.backgroundTaskIds?.length ? { backgroundTaskIds: [...res.backgroundTaskIds] } : {}),
  })
}

const applyContinueToMessage = (msg: ChatMessage, res: AgentContinueResult) => {
  if (!res.ok) {
    msg.text += `\n\nConfirm failed: ${res.error}`
    msg.pendingWrites = undefined
    msg.pendingBashes = undefined
    msg.pendingAsks = undefined
    msg.pendingPlans = undefined
    return
  }
  const suffix = formatToolLog(res.toolLog)
  if (res.status === 'pending') {
    msg.pendingWrites = res.pending
    msg.pendingBashes = res.pendingBashes
    msg.pendingAsks = res.pendingAsks
    msg.pendingPlans = res.pendingPlans
    msg.agentSessionId = res.sessionId
    if (res.speakerUserId) msg.speakerUserId = res.speakerUserId
    mergeBackgroundTaskIds(msg, res.backgroundTaskIds)
    if (res.assistantText.trim()) msg.text = res.assistantText + suffix
    else msg.text += suffix
  } else {
    msg.pendingWrites = undefined
    msg.pendingBashes = undefined
    msg.pendingAsks = undefined
    msg.pendingPlans = undefined
    msg.text = (res.assistantText + suffix).trim() || msg.text
    mergeBackgroundTaskIds(msg, res.backgroundTaskIds)
    maybePlayAgentDoneSound(res)
    emit('filesChanged')
  }
}

const onConfirmPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
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
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
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
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
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
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
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
  if (msg.pendingAsks?.length) {
    const next = msg.pendingAsks.filter((p) => p.id !== pendingId)
    msg.pendingAsks = next.length ? next : undefined
  }
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
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

const ensurePlanBuildTrack = (msg: ChatMessage, pp: AgentPendingPlan) => {
  if (!msg.planBuildTracks) msg.planBuildTracks = []
  if (msg.planBuildTracks.some((t) => t.id === pp.id)) return
  const stepCount = extractPlanSteps(pp).length
  const track: PlanBuildTrack = {
    id: pp.id,
    plan: { ...pp },
    stepStatuses: startPlanStepStatuses(stepCount),
    building: true,
    done: false,
  }
  msg.planBuildTracks.push(track)
}

const bumpPlanBuildProgress = (sessionId: string) => {
  for (const msg of activeSession.value?.messages ?? []) {
    if (msg.agentSessionId && msg.agentSessionId !== sessionId) continue
    for (const track of msg.planBuildTracks ?? []) {
      if (!track.building) continue
      track.stepStatuses = advancePlanStepStatuses(track.stepStatuses)
      if (!track.stepStatuses.some((s) => s === 'pending' || s === 'in_progress')) {
        track.building = false
        track.done = true
      }
    }
  }
}

const finalizePlanBuildTracks = (msg: ChatMessage) => {
  for (const track of msg.planBuildTracks ?? []) {
    if (!track.building) continue
    track.stepStatuses = completeAllPlanStepStatuses(track.stepStatuses)
    track.building = false
    track.done = true
  }
}

const hasPlanBuildTrack = (msg: ChatMessage, planId: string) =>
  (msg.planBuildTracks ?? []).some((t) => t.id === planId)

const planBuildingLocal = ref(false)

const pendingPlanAction = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i]!
    if (m.role !== 'assistant') continue
    for (const pp of m.pendingPlans ?? []) {
      if (!hasPlanBuildTrack(m, pp.id)) return { msg: m, plan: pp }
    }
  }
  return null
})

const showFooterPlanBuild = computed(() => {
  if (pendingPlanAction.value) return true
  return isPlanEditorPath(props.contextFilePath, props.contextFileContent ?? '')
})

const footerPlanBuilt = computed(() => {
  const path = props.contextFilePath
  if (!path || !isPlanEditorPath(path, props.contextFileContent ?? '')) return false
  return isPlanBuiltContent(props.contextFileContent ?? '')
})

const footerPlanBuildDisabled = computed(
  () =>
    footerPlanBuilt.value ||
    planBuildingLocal.value ||
    loading.value ||
    pendingBusy.value ||
    !hasProject.value,
)

const onFooterPlanBuild = async () => {
  if (footerPlanBuildDisabled.value) return
  const pending = pendingPlanAction.value
  if (pending) {
    await onBuildPlanPending(pending.msg, pending.plan.id)
    const path = planAbsolutePath(props.projectRoot, pending.plan.filePath)
    emit('planFileBuilt', path)
    return
  }
  const path = props.contextFilePath
  if (!path) return
  planBuildingLocal.value = true
  try {
    const built = await buildPlanFromPath(path)
    if (built) emit('planFileBuilt', path)
  } finally {
    planBuildingLocal.value = false
  }
}

const markBuiltPlanFile = async (relPath: string) => {
  const root = props.projectRoot?.trim()
  if (!root) return
  await markPlanFileBuilt(planAbsolutePath(root, relPath))
}

const onBuildPlanPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  const pp = msg.pendingPlans?.find((p) => p.id === pendingId)
  if (!pp) return
  const root = props.projectRoot?.trim()
  if (root) {
    try {
      const { content } = await window.axecoder.readFile(planAbsolutePath(root, pp.filePath))
      if (isPlanBuiltContent(content)) return
    } catch {
      /* 文件尚未落盘则继续 */
    }
  }
  ensurePlanBuildTrack(msg, pp)
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
  try {
    if (chatModeId.value !== 'agent') {
      chatModeId.value = 'agent'
      saveStoredChatMode('agent')
    }
    const res = await window.axecoder.agentBuildPlan(msg.agentSessionId, pendingId)
    if (res.ok && res.status === 'done') {
      finalizePlanBuildTracks(msg)
      await markBuiltPlanFile(pp.filePath)
    }
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const onDismissPlanPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress(msg.agentSessionId, msg.speakerUserId)
  try {
    const res = await window.axecoder.agentDismissPlan(msg.agentSessionId, pendingId)
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const buildPlanFromPath = async (absolutePlanPath: string): Promise<boolean> => {
  const root = props.projectRoot?.trim()
  if (!root || loading.value || pendingBusy.value) return false
  try {
    const { content } = await window.axecoder.readFile(absolutePlanPath)
    if (isPlanBuiltContent(content)) return false
  } catch {
    return false
  }
  const rel = relativeToProject(root, absolutePlanPath) ?? absolutePlanPath
  const composed = await window.axecoder.agentComposePlanBuild(root, rel)
  if (!composed.ok) {
    window.alert(composed.error)
    return false
  }
  const session = activeSession.value
  if (!session) return false
  const modelId = modelsFile.value.activeModelId
  const model = activeModel.value
  if (!modelId || !model) {
    window.alert('Add and enable a model in Settings before Build.')
    return false
  }
  if (chatModeId.value !== 'agent') {
    chatModeId.value = 'agent'
    saveStoredChatMode('agent')
  }
  session.messages.push({ role: 'user', text: `Build plan: ${rel}`, apiContent: composed.text })
  session.updatedAt = Date.now()
  loading.value = true
  bindAgentProgress()
  try {
    await persist()
    const apiMessages = await buildApiMessages(session.messages)
    const res = await sendAgent(props.projectRoot, modelId, apiMessages)
    pushAssistantFromAgent(res, model)
    session.updatedAt = Date.now()
    if (res.ok && res.status === 'done') {
      await markPlanFileBuilt(absolutePlanPath)
      return true
    }
    return false
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request error'
    session.messages.push({
      role: 'assistant',
      text: formatAiChatRequestError(msg, model),
    })
    return false
  } finally {
    loading.value = false
    clearProgressUi()
    await persist()
  }
}

const hasPendingWritesInSession = () => sessionPendingState.value.count > 0

const hasPendingAsksInSession = () =>
  (activeSession.value?.messages ?? []).some((m) => (m.pendingAsks?.length ?? 0) > 0)

const hasPendingBashesInSession = () =>
  (activeSession.value?.messages ?? []).some((m) => (m.pendingBashes?.length ?? 0) > 0)

const hasPendingPlansInSession = () =>
  (activeSession.value?.messages ?? []).some((m) => (m.pendingPlans?.length ?? 0) > 0)

const hasPendingAgentInteraction = () =>
  hasPendingWritesInSession() ||
  hasPendingBashesInSession() ||
  hasPendingAsksInSession() ||
  hasPendingPlansInSession()

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
      m.pendingPlans = undefined
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
      m.pendingPlans = undefined
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

const onAgentAutoPlanToggle = (on: boolean) => {
  emit('update:agentAutoPlanOn', on)
}

const runPlainChat = async (model: ModelEntry, modelId: string, apiMessages: AiChatMessage[]) => {
  const useSse = providerSupportsSseStream(model.provider)
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
  const res = await window.axecoder.aiChat(
    modelId,
    apiMessages,
    useSse ? streamId : undefined,
    chatEffort.value,
  )
  if (res.ok) {
    const replyText = res.text.trim() || '(Model returned no content; check model ID or API settings)'
    activeSession.value!.messages.push({
      role: 'assistant',
      text: replyText,
      assistantContent: res.content,
      ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
    })
  } else {
    activeSession.value!.messages.push({
      role: 'assistant',
      text: formatAiChatRequestError(res.error, model),
    })
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
  openPermissionsSettings: () => emit('openPermissionsSettings'),
  getAgentSessionId: () => {
    const s = activeSession.value
    if (!s) return undefined
    for (let i = s.messages.length - 1; i >= 0; i--) {
      const m = s.messages[i]
      if (m.agentSessionId) return m.agentSessionId
    }
    return undefined
  },
  selectSession,
  setChatMode: (id) => onChatModePick(id),
  getChatEffort: () => chatEffort.value,
  setChatEffort: (level) => {
    chatEffort.value = level
    saveStoredChatEffort(level)
  },
})

const ensureChatSession = async (): Promise<boolean> => {
  if (activeSession.value) return true
  await newChat()
  if (!activeSession.value) return false
  if (isWorkshopEmbeddedInAgentChat.value) {
    await syncMultiAgentWorkshop()
  }
  return true
}

const onWorkshopAnswerAsk = async (
  pendingId: string,
  answers: Record<string, string | string[]>,
) => {
  const pending = workshopPendingAsks.value.find((p) => p.id === pendingId)
  if (!pending || workshopLoading.value) return
  const text = formatWorkshopAskAnswers(pending, answers)
  if (!text.trim()) return
  if (!(await ensureChatSession())) return
  const modelId = modelsFile.value.activeModelId
  if (!modelId) return
  await workshopSectionRef.value?.sendWithPayload({
    text,
    apiText: text,
    displayText: text,
    modelId,
  })
}

const send = async () => {
  if (isWorkshopEmbeddedInAgentChat.value) {
    const text = input.value.trim()
    const imageRefs = imageRefsForPersist()
    const hasPendingImages = imageRefs.length > 0
    if (!hasProject.value || (!text && !hasPendingImages)) return
    if (loading.value || workshopLoading.value) return
    if (!(await ensureChatSession())) return
    const modelId = modelsFile.value.activeModelId
    if (!modelId) {
      if (!(await ensureChatSession())) return
      activeSession.value!.messages.push({
        role: 'assistant',
        text: 'Add and enable a model in Settings before chatting.',
      })
      await persist()
      return
    }
    const filePaths = sendFilePaths.value.length ? [...sendFilePaths.value] : undefined
    const mentionPlan = await prepareRoleWorkflowSendPlan(text, mentionUsers.value, props.projectRoot)
    if (mentionPlan.kind === 'error') {
      activeSession.value!.messages.push({
        role: 'assistant',
        text: mentionPlan.message,
      })
      activeSession.value!.updatedAt = Date.now()
      await persist()
      return
    }
    const mention = parseCommittedRoleMention(text, mentionUsers.value)
    let apiText = mention?.args.trim() || text
    const displayText = text || '(image)'
    if (mentionPlan.kind === 'workflow') apiText = mentionPlan.prompt
    const plainImageRefs = imageRefs.length
      ? (JSON.parse(JSON.stringify(imageRefs)) as import('../../types/axecoder').ChatImageRef[])
      : undefined
    const imagePreviews = attachedImages.value.map((x: AttachedImageView) => x.previewUrl)
    input.value = ''
    attachedFiles.value = []
    clearAttachedImages()
    includeContextFile.value = false
    await nextTick()
    resizeInput()
    const res = await workshopSectionRef.value?.sendWithPayload({
      text: apiText || displayText,
      apiText,
      displayText,
      filePaths,
      imageRefs: plainImageRefs,
      imagePreviews: imagePreviews.length ? imagePreviews : undefined,
      modelId,
    })
    if (res && !res.ok) {
      if (activeSession.value) {
        activeSession.value.messages.push({
          role: 'assistant',
          text: `协作请求失败：${res.error}`,
        })
        activeSession.value.updatedAt = Date.now()
        await persist()
      }
    }
    return
  }
  const text = input.value.trim()
  const hasPendingImages = attachedImages.value.length > 0
  if (!hasProject.value || (!text && !hasPendingImages)) return
  if (!(await ensureChatSession())) return
  const session = activeSession.value
  if (!session) return

  if (text.startsWith('!')) {
    if (loading.value || pendingBusy.value) {
      session.messages.push({
        role: 'assistant',
        text: 'Wait for the current reply to finish before running shell commands.',
      })
      session.updatedAt = Date.now()
      await persist()
      return
    }
    const cmd = text.slice(1).trim()
    if (!cmd) return
    input.value = ''
    await nextTick()
    resizeInput()
    session.messages.push({ role: 'user', text })
    loading.value = true
    try {
      const res = await window.axecoder.agentRunUserShell(props.projectRoot, cmd)
      session.messages.push({
        role: 'assistant',
        text: res.ok
          ? `\`\`\`\n${res.text}\n\`\`\``
          : `Command failed: ${res.error ?? 'unknown'}`,
      })
      session.updatedAt = Date.now()
      await persist()
    } finally {
      loading.value = false
    }
    return
  }

  if (text.startsWith('/')) {
    if (loading.value || pendingBusy.value || hasPendingAgentInteraction()) {
      session.messages.push({
        role: 'assistant',
        text: 'Wait for the current reply or pending Agent confirmations before slash commands.',
      })
      session.updatedAt = Date.now()
      await persist()
      return
    }
    input.value = ''
    await nextTick()
    resizeInput()

    const slashResult = await runSlashCommand(text, buildSlashContext())

    if (slashResult === null) {
      session.messages.push({
        role: 'assistant',
        text: 'Invalid input; start with /command.',
      })
      session.updatedAt = Date.now()
      await persist()
      return
    }
    if (!slashResult.ok) {
      session.messages.push({ role: 'assistant', text: slashResult.message })
      session.updatedAt = Date.now()
      await persist()
      return
    }
    if (!slashResult.silent && slashResult.message) {
      session.messages.push({ role: 'assistant', text: slashResult.message })
      session.updatedAt = Date.now()
      await persist()
    }
    if (slashResult.sendPrompt) {
      const prompt = slashResult.sendPrompt
      const modelId = modelsFile.value.activeModelId
      const model = activeModel.value
      if (!modelId || !model) {
        session.messages.push({
          role: 'assistant',
          text: 'Add and enable a model in Settings before custom commands.',
        })
        session.updatedAt = Date.now()
        await persist()
        return
      }
      session.messages.push({
        role: 'user',
        text,
        slashOnly: true,
        apiContent: prompt,
      })
      if (session.title === 'New Agent' || session.title === 'New chat') {
        session.title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
      }
      session.updatedAt = Date.now()
      loading.value = true
      if (agentMode.value) bindAgentProgress()
      else startIdleHintTimer()
      try {
        await persist()
        const apiMessages = await buildApiMessages(session.messages)
        if (agentMode.value) {
          const res = await sendAgent(
            props.projectRoot,
            modelId,
            apiMessages,
            undefined,
            slashResult.roleWorkflowInvoke === true,
          )
          pushAssistantFromAgent(res, model)
        } else {
          await runPlainChat(model, modelId, apiMessages)
        }
        session.updatedAt = Date.now()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Request error'
        session.messages.push({
          role: 'assistant',
          text: formatAiChatRequestError(msg, model),
        })
        session.updatedAt = Date.now()
      } finally {
        loading.value = false
        clearProgressUi()
        await persist()
      }
    }
    return
  }

  if (loading.value) return
  const mentionValidation = validateRoleMentionText(text, mentionUsers.value)
  if (!mentionValidation.ok) {
    session.messages.push({
      role: 'assistant',
      text: mentionValidation.error,
    })
    await persist()
    return
  }
  const modelId = modelsFile.value.activeModelId
  const model = activeModel.value
  if (!modelId || !model) {
    session.messages.push({
      role: 'assistant',
      text: 'Add and enable a model in Settings before chatting.',
    })
    await persist()
    return
  }
  const imageRefs = imageRefsForPersist()
  if (visionBlockedForPendingImages(model, imageRefs.length)) {
    session.messages.push({
      role: 'assistant',
      text: visionUnsupportedMessage(model),
    })
    session.updatedAt = Date.now()
    await persist()
    return
  }
  const imagePreviews = attachedImages.value.map((x: AttachedImageView) => x.previewUrl)
  const mention = parseCommittedRoleMention(text, mentionUsers.value)
  let apiText = mention?.args.trim() || text
  const filePaths = sendFilePaths.value.length ? [...sendFilePaths.value] : undefined
  const displayText = text || '(image)'
  let roleMentionUserId: string | undefined
  let roleMentionCommand: string | undefined

  const mentionPlan = await prepareRoleWorkflowSendPlan(text, mentionUsers.value, props.projectRoot)
  if (mentionPlan.kind === 'error') {
    activeSession.value!.messages.push({ role: 'assistant', text: mentionPlan.message })
    activeSession.value!.updatedAt = Date.now()
    await persist()
    return
  }
  if (mention) {
    roleMentionUserId = mention.userId
    if (mentionPlan.kind === 'workflow') {
      apiText = mentionPlan.prompt
      roleMentionCommand = mentionPlan.slug
    }
  }

  loading.value = true
  if (agentMode.value) bindAgentProgress(undefined, roleMentionUserId ?? mention?.userId)
  else startIdleHintTimer()
  try {
    const plainImageRefs = imageRefs.length
      ? (JSON.parse(JSON.stringify(imageRefs)) as import('../../types/axecoder').ChatImageRef[])
      : []
    input.value = ''
    await nextTick()
    resizeInput()
    const userMsg: ChatMessage = {
      role: 'user',
      text: displayText,
      ...(filePaths ? { filePaths } : {}),
      ...(plainImageRefs.length ? { imageRefs: plainImageRefs, imagePreviews } : {}),
      ...(roleMentionUserId ? { roleMentionUserId } : {}),
      ...(roleMentionCommand ? { roleMentionCommand } : {}),
      ...(roleMentionCommand ? { slashOnly: true } : {}),
    }
    activeSession.value!.messages.push(userMsg)
    void scrollMessages(true)
    attachedFiles.value = []
    clearAttachedImages()
    includeContextFile.value = false
    if (
      activeSession.value!.title === 'New Agent' ||
      activeSession.value!.title === 'New chat'
    ) {
      activeSession.value!.title =
        displayText.slice(0, 24) + (displayText.length > 24 ? '…' : '')
    }
    activeSession.value!.updatedAt = Date.now()

    const baseApiText =
      roleMentionCommand || (apiText && apiText !== displayText) ? apiText : apiText || displayText
    userMsg.apiContent = await expandUserMessageForApi(
      props.projectRoot,
      baseApiText,
      filePaths,
      mentionUsers.value,
    )
    await persist()
    const apiMessages = await buildApiMessages(activeSession.value!.messages)
    if (agentMode.value) {
      const res = await sendAgent(
        props.projectRoot,
        modelId,
        apiMessages,
        roleMentionUserId ?? mention?.userId,
        !!roleMentionCommand,
      )
      pushAssistantFromAgent(res, model)
    } else {
      await runPlainChat(model, modelId, apiMessages)
    }
    activeSession.value!.updatedAt = Date.now()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request error'
    activeSession.value?.messages.push({
      role: 'assistant',
      text: formatAiChatRequestError(msg, model),
    })
    if (activeSession.value) activeSession.value.updatedAt = Date.now()
  } finally {
    loading.value = false
    clearProgressUi()
    await persist()
  }
}

const canSend = computed(() => {
  const text = input.value.trim()
  const slash = text.startsWith('/')
  const hasImages = attachedImages.value.length > 0
  const mentionUser = inputAtMentionUser.value
  const mentionHasCommand = !!(mentionUser && effectiveUserSkillSlugs(mentionUser).length)
  const mentionReady =
    !!inputAtMention.value &&
    (!!inputAtMention.value.args.trim() || mentionHasCommand)
  return (
    hasProject.value &&
    (!!text || hasImages) &&
    !loading.value &&
    !workshopLoading.value &&
    (enabledModels.value.length > 0 || slash || mentionReady || (inputAtMention.value && hasImages))
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
    const apiMessages = await buildApiMessages(msgs.slice(0, userIdx + 1))
    const userMsg = msgs[userIdx]
    if (agentMode.value) {
      const res = await sendAgent(
        props.projectRoot,
        modelId,
        apiMessages,
        userMsg ? assigneeFromUserMessage(userMsg) : undefined,
      )
      pushAssistantFromAgent(res, model)
    } else {
      await runPlainChat(model, modelId, apiMessages)
    }
    activeSession.value.updatedAt = Date.now()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request error'
    activeSession.value.messages.push({
      role: 'assistant',
      text: formatAiChatRequestError(msg, model),
    })
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
  if (inputAtMention.value && e.key === 'Backspace') {
    const el = inputEl.value
    if (
      el &&
      el.selectionStart === 0 &&
      el.selectionEnd === 0 &&
      !inputAtMention.value.args
    ) {
      e.preventDefault()
      input.value = `@${inputAtMention.value.displayName}`
      return
    }
  }
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
  const slashPicker = slashPickerRef.value
  if (slashPicker?.isOpen) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      slashPicker.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      slashPicker.moveActive(-1)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      slashPicker.pickActive()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      input.value = ''
    }
    return
  }
  const atPicker = atRefPickerRef.value
  if (atPicker?.isOpen) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      atPicker.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      atPicker.moveActive(-1)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      atPicker.pickActive()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      input.value = ''
    }
  }
}

const onAtRefPick = (insertPath: string, replaceStart: number) => {
  const el = inputEl.value
  const cursor = el?.selectionStart ?? input.value.length
  const before = input.value.slice(0, replaceStart)
  const after = input.value.slice(cursor)
  input.value = `${before}${insertPath} ${after}`
  void nextTick(() => {
    resizeInput()
    const pos = before.length + insertPath.length + 1
    el?.setSelectionRange(pos, pos)
    inputCursor.value = pos
    el?.focus()
  })
}

const syncInputCursor = () => {
  inputCursor.value = inputEl.value?.selectionStart ?? input.value.length
}

const onChatEffortPick = (level: ReasoningEffortLevel) => {
  chatEffort.value = level
  saveStoredChatEffort(level)
}

const onInputEnter = () => {
  const atPicker = atRefPickerRef.value
  if (atPicker?.isOpen) {
    atPicker.pickActive()
    return
  }
  const slashPicker = slashPickerRef.value
  if (slashPicker?.isOpen) {
    slashPicker.pickActive()
    return
  }
  if (!canSend.value) return
  void send()
}

watch(
  () => props.projectRoot,
  () => {
    void load()
    void loadWsMetas()
  },
)

watch(
  () => chatModeId.value,
  (mode, prev) => {
    void loadMentionUsers()
    if (
      (mode === 'multi-agent' ||
        mode === 'reflection' ||
        mode === 'software-company') &&
      mode !== prev
    )
      void syncMultiAgentWorkshop()
  },
)

watch(
  () => activeId.value,
  (id, prev) => {
    if (id !== prev) workshopMessageCount.value = 0
    if (!isWorkshopEmbeddedInAgentChat.value || !id || id === prev) return
    lastMultiAgentSyncKey = ''
    void syncMultiAgentWorkshop()
  },
)

watch(workshopMessageCount, (n, prev) => {
  if (!isWorkshopEmbeddedInAgentChat.value || n <= 0 || n === prev) return
  void syncMultiAgentAgentSessionTitle()
})

onMounted(async () => {
  void loadModels()
  await load()
  void loadWsMetas()
  if (
    chatModeId.value === 'multi-agent' ||
    chatModeId.value === 'reflection' ||
    chatModeId.value === 'software-company'
  ) {
    await syncMultiAgentWorkshop()
    await loadMentionUsers()
  }
  void refreshSlashCommandRegistry(props.projectRoot ?? '')
  void loadMentionUsers()
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

const showNoSessionLanding = computed(
  () => hasProject.value && !activeSession.value && !props.hasOpenEditorTabs,
)

const isEmptyChat = computed(
  () =>
    hasProject.value &&
    !!activeSession.value &&
    messages.value.length === 0 &&
    !streamText.value.trim() &&
    !agentStore.currentThinking.trim() &&
    !progressSteps.value.length &&
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
    return active?.label ?? 'Agent Running…'
  }
  if (agentMode.value) return 'Starting Agent…'
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
  buildPlanFromPath,
})
</script>

<template>
  <section
    class="chat-pane"
    :class="{
      'workshop-in-chat': showWorkshopPanel,
      'agents-hidden': !agentsSidebarVisible,
      'chat-empty': !showWorkshopPanel && isEmptyChat,
      'chat-no-session': !showWorkshopPanel && showNoSessionLanding,
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
          title="Close tab"
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
      v-show="showWorkshopPanel"
      ref="workshopSectionRef"
      class="workshop-chat-host"
      :project-root="projectRoot"
      :profile-display-name="profileDisplayName"
      :profile-avatar-path="profileAvatarPath"
      :embedded-in-agent-chat="isWorkshopEmbeddedInAgentChat"
      :linked-agent-chat-id="isWorkshopEmbeddedInAgentChat ? activeId : ''"
      :agent-history-count="isWorkshopEmbeddedInAgentChat ? (activeSession?.messages.length ?? 0) : 0"
      :preferred-model-id="isWorkshopEmbeddedInAgentChat ? modelsFile.activeModelId : undefined"
      :orchestration-chat-mode="isWorkshopEmbeddedInAgentChat ? chatModeId : undefined"
      @sessions-changed="onWorkshopSessionsChanged"
      @message-count-change="(n) => (workshopMessageCount = n)"
      @open-file="(p) => emit('openFile', p)"
      @open-models-settings="emit('openModelsSettings')"
      @active-change="onWorkshopActiveChange"
    >
      <template v-if="isWorkshopEmbeddedInAgentChat" #mode-picker>
        <ChatModePickerDropdown
          :active-mode-id="chatModeId"
          :has-session-messages="hasSessionMessagesForModeLock"
          :agent-auto-plan-on="!!agentAutoPlanOn"
          @select="onChatModePick"
          @toggle-auto-plan="onAgentAutoPlanToggle"
        />
      </template>
    </WorkshopChatSection>
    <div v-show="!showWorkshopPanel" class="agent-chat-body">
    <div
      ref="messagesEl"
      :key="activeId"
      class="chat-messages"
      :class="{ 'chat-messages--landing': showNoSessionLanding }"
      @scroll="onScrollContainer"
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
            <div class="user-bubble" :class="{ 'user-bubble--slash': userBubbleSlashMinimal(msg) || userBubbleRoleMentionMinimal(msg) }">
              <div v-if="msg.filePaths?.length" class="msg-file-tags">
                <span v-for="fp in msg.filePaths" :key="fp" class="msg-file-tag" :title="fp">
                  {{ relativeToProject(projectRoot, fp) }}
                </span>
              </div>
              <div v-if="msg.imagePreviews?.length" class="msg-image-row">
                <img
                  v-for="(url, j) in msg.imagePreviews"
                  :key="j"
                  :src="url"
                  alt=""
                  class="msg-image-thumb"
                />
              </div>
              <template v-if="slashMessageParts(msg)">
                <div v-if="slashMessageParts(msg)!.body" class="slash-cmd-flow">
                  <span class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span
                  ><span class="slash-cmd-body">{{ slashMessageParts(msg)!.body }}</span>
                </div>
                <span v-else class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span>
              </template>
              <template v-else-if="roleMentionDisplay(msg)">
                <div class="role-mention-flow">
                  <span class="role-mention-chip">
                    <span class="role-mention-avatar">
                      <img
                        v-if="roleAvatarUrls[roleMentionDisplay(msg)!.userId]"
                        :src="roleAvatarUrls[roleMentionDisplay(msg)!.userId]"
                        alt=""
                      />
                      <span v-else>{{ roleMentionDisplay(msg)!.name.slice(0, 1) }}</span>
                    </span>
                    <span class="role-mention-name">@{{ roleMentionDisplay(msg)!.name }}</span>
                    <span v-if="roleMentionDisplay(msg)!.command" class="role-mention-cmd"
                      >/{{ roleMentionDisplay(msg)!.command }}</span
                    >
                  </span>
                  <span v-if="roleMentionDisplay(msg)!.body" class="role-mention-body">{{
                    roleMentionDisplay(msg)!.body
                  }}</span>
                </div>
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
          :class="{ 'user-bubble--slash': userBubbleSlashMinimal(msg) || userBubbleRoleMentionMinimal(msg) }"
        >
          <div v-if="msg.filePaths?.length" class="msg-file-tags">
            <span v-for="fp in msg.filePaths" :key="fp" class="msg-file-tag" :title="fp">
              {{ relativeToProject(projectRoot, fp) }}
            </span>
          </div>
          <div v-if="msg.imagePreviews?.length" class="msg-image-row">
            <img
              v-for="(url, j) in msg.imagePreviews"
              :key="j"
              :src="url"
              alt=""
              class="msg-image-thumb"
            />
          </div>
          <template v-if="slashMessageParts(msg)">
            <div v-if="slashMessageParts(msg)!.body" class="slash-cmd-flow">
              <span class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span
              ><span class="slash-cmd-body">{{ slashMessageParts(msg)!.body }}</span>
            </div>
            <span v-else class="slash-cmd-tag">{{ slashMessageParts(msg)!.invoke }}</span>
          </template>
          <template v-else-if="roleMentionDisplay(msg)">
            <div class="role-mention-flow">
              <span class="role-mention-chip">
                <span class="role-mention-avatar">
                  <img
                    v-if="roleAvatarUrls[roleMentionDisplay(msg)!.userId]"
                    :src="roleAvatarUrls[roleMentionDisplay(msg)!.userId]"
                    alt=""
                  />
                  <span v-else>{{ roleMentionDisplay(msg)!.name.slice(0, 1) }}</span>
                </span>
                <span class="role-mention-name">@{{ roleMentionDisplay(msg)!.name }}</span>
                <span v-if="roleMentionDisplay(msg)!.command" class="role-mention-cmd"
                  >/{{ roleMentionDisplay(msg)!.command }}</span
                >
              </span>
              <span v-if="roleMentionDisplay(msg)!.body" class="role-mention-body">{{
                roleMentionDisplay(msg)!.body
              }}</span>
            </div>
          </template>
          <template v-else-if="msg.text">{{ msg.text }}</template>
        </div>
        <template v-else>
          <div v-if="msg.speakerUserId && speakerUser(msg.speakerUserId)" class="assistant-role-header">
            <div class="assistant-role-avatar">
              <img
                v-if="roleAvatarUrls[msg.speakerUserId]"
                :src="roleAvatarUrls[msg.speakerUserId]"
                alt=""
              />
              <span v-else>{{ speakerUser(msg.speakerUserId)!.displayName.slice(0, 1) }}</span>
            </div>
            <div class="assistant-role-meta">
              <span class="assistant-role-name">{{ speakerUser(msg.speakerUserId)!.displayName }}</span>
              <span class="assistant-role-title">{{ speakerUser(msg.speakerUserId)!.role }}</span>
            </div>
          </div>
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
          <ChatPlanCard
            v-for="pp in msg.pendingPlans ?? []"
            v-show="!hasPlanBuildTrack(msg, pp.id)"
            :key="pp.id"
            :pending="pp"
            :busy="pendingBusy"
            @dismiss="onDismissPlanPending(msg, pp.id)"
          />
          <ChatPlanCard
            v-for="track in msg.planBuildTracks ?? []"
            :key="`plan-track-${track.id}`"
            :pending="track.plan"
            :step-statuses="track.stepStatuses"
            :building="track.building"
            :built="track.done"
            :busy="pendingBusy"
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
          <BackgroundTaskCard
            v-if="msg.backgroundTaskIds?.length && hasProject"
            :project-root="props.projectRoot ?? ''"
            :task-ids="msg.backgroundTaskIds"
          />
        </template>
      </div>
      <div v-if="showProgressBubble" class="message assistant">
        <div v-if="progressAssigneeUser" class="assistant-role-header">
          <div class="assistant-role-avatar">
            <img
              v-if="roleAvatarUrls[pendingAssigneeUserId]"
              :src="roleAvatarUrls[pendingAssigneeUserId]"
              alt=""
            />
            <span v-else>{{ progressAssigneeUser.displayName.slice(0, 1) }}</span>
          </div>
          <div class="assistant-role-meta">
            <span class="assistant-role-name">{{ progressAssigneeUser.displayName }}</span>
            <span class="assistant-role-title">{{ progressAssigneeUser.role }}</span>
          </div>
        </div>
        <div class="assistant-text loading-bubble agent-progress-bubble">
          <AgentProgressStream
            :steps="progressSteps"
            :stream-text="streamText"
            :subagent-tasks="subagentTaskList"
            :agent-mode="agentMode"
            :fallback-headline="progressHeadline"
            :thinking-text="agentStore.currentThinking"
            :thinking-type="agentStore.thinkingType"
            :loop-guard-notice="loopGuardNotice"
          />
        </div>
      </div>
    </div>
    <div v-if="lastAssistantText && !loading" class="reply-actions">
      <button type="button" class="icon-btn" title="Copy reply" @click="copyLastReply">
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
        title="Regenerate"
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
          {{ sessionPendingState.count }}  pending (file changes / commands)
        </span>
        <label class="pending-auto-apply" title="When on, Write/Edit/Delete/Move/Bash run without confirmation">
          <SwitchToggle
            :model-value="!!agentAutoApplyWrites"
            @update:model-value="onAgentAutoApplyChange"
          />
          Auto-apply without confirmation
        </label>
      </div>
      <div class="pending-bulk-actions">
        <button
          type="button"
          class="btn-apply-all"
          :disabled="pendingBusy"
          @click="onConfirmAllPending"
        >
          Accept all ({{ sessionPendingState.count }})
        </button>
        <button
          type="button"
          class="btn-reject-all"
          :disabled="pendingBusy"
          @click="onRejectAllPending"
        >
          Reject all
        </button>
      </div>
    </div>
    </div>
    <div v-if="showAgentComposer" class="chat-input-area">
      <div v-if="workshopPendingAsks.length" class="workshop-clarify-hint">
        <ChatAskUserCard
          v-for="pa in workshopPendingAsks"
          :key="pa.id"
          :pending="pa"
          :busy="workshopLoading"
          @submit="(answers) => onWorkshopAnswerAsk(pa.id, answers)"
        />
      </div>
      <div v-else-if="workshopPendingQuestion" class="workshop-clarify-hint" role="status">
        <span class="workshop-clarify-hint-label">待你回答</span>
        <p>{{ workshopPendingQuestion }}</p>
      </div>
      <SlashCommandPicker
        ref="slashPickerRef"
        :input-text="input"
        :anchor-el="inputBoxEl"
        @select="onSlashPick"
      />
      <AtRefPicker
        ref="atRefPickerRef"
        :project-root="projectRoot"
        :input-text="input"
        :cursor="inputCursor"
        :mention-users="mentionUsers"
        :anchor-el="inputBoxEl"
        @pick-role="onAtRolePick"
        @pick-file="onAtRefPick"
      />
      <div
        ref="inputBoxEl"
        class="input-box"
        :class="{ 'drop-active': dropActive }"
        @dragover="onChatDragOver"
        @dragleave="onChatDragLeave"
        @drop="onChatDrop"
      >
        <div
          v-if="attachedFiles.length || attachedImages.length || pendingContextFile"
          class="file-refs"
        >
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
            v-for="img in attachedImages"
            :key="img.ref.id"
            class="file-ref-chip image-chip"
            title="Pasted image"
          >
            <img :src="img.previewUrl" alt="" class="image-chip-thumb" />
            <button type="button" class="chip-remove" @click="removeAttachedImage(img.ref.id)">
              ×
            </button>
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
        <div class="chat-input-wrap" :class="{ 'has-slash': !!inputSlash, 'has-mention': !!inputAtMention }">
          <span v-if="inputSlash" class="input-slash-pill" title="Slash command">
            /{{ inputSlash.name }}
            <button type="button" class="input-slash-remove" @click="clearInputSlash">×</button>
          </span>
          <span v-else-if="inputAtMention" class="role-mention-chip input-mention-pill" title="Mentioned role">
            <span class="role-mention-avatar">
              <img
                v-if="roleAvatarUrls[inputAtMention.userId]"
                :src="roleAvatarUrls[inputAtMention.userId]"
                alt=""
              />
              <span v-else>{{ inputAtMention.displayName.slice(0, 1) }}</span>
            </span>
            <span class="role-mention-name">@{{ inputAtMention.displayName }}</span>
            <span v-if="inputAtMentionCommandSlug" class="role-mention-cmd"
              >/{{ inputAtMentionCommandSlug }}</span
            >
            <button type="button" class="input-mention-remove" @click="clearInputAtMention">×</button>
          </span>
          <textarea
            ref="inputEl"
            :value="inputFieldValue"
            class="chat-input"
            rows="1"
            :placeholder="
              inputSlash
                ? 'Add details…'
                : inputAtMention
                  ? 'Add task details…'
                  : isMultiAgentInAgentChat
                    ? 'Plan, Build, /commands, @file or @role'
                    : 'Plan, Build, /commands, @file or @role'
            "
            @input="(e) => { onInputField(e); syncInputCursor() }"
            @click="syncInputCursor"
            @keyup="syncInputCursor"
            @keydown="onInputKeydown"
            @keydown.enter.exact.prevent="onInputEnter"
            @paste="onPasteImage"
          />
        </div>
        <div class="chat-input-footer">
          <div class="footer-left">
            <ChatModePickerDropdown
              :active-mode-id="chatModeId"
              :has-session-messages="hasSessionMessagesForModeLock"
              :agent-auto-plan-on="!!agentAutoPlanOn"
              @select="onChatModePick"
              @toggle-auto-plan="onAgentAutoPlanToggle"
            />
            <ModelPickerDropdown
              v-if="enabledModels.length"
              :models="enabledModels"
              :active-model-id="modelsFile.activeModelId"
              :effort="chatEffort"
              :effort-disabled="loading"
              @select="onModelPick"
              @update:effort="onChatEffortPick"
              @add-models="emit('openModelsSettings')"
            />
            <button
              v-if="showFooterPlanBuild"
              type="button"
              class="footer-plan-build-btn"
              :class="{ built: footerPlanBuilt }"
              :disabled="footerPlanBuildDisabled"
              :title="footerPlanBuilt ? '此计划已执行过 Build' : '按当前计划开始实现'"
              @click="onFooterPlanBuild"
            >
              {{ footerPlanBuilt ? 'Built' : 'Build' }}
            </button>
            <button
              v-else-if="!enabledModels.length"
              type="button"
              class="add-models-link"
              @click="emit('openModelsSettings')"
            >
              Add model
            </button>
          </div>
          <div class="footer-right">
            <FooterTpsBadge v-if="agentMode" :live="showTpsLive" />
            <label
              v-if="agentMode"
              class="auto-apply-toggle"
              title="When on, Agent file changes and Bash run without Apply/Reject prompts"
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
              title="Stop Agent"
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
              title="Send"
              :disabled="!canSend"
              @click="() => canSend && send()"
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
  </section>
</template>

<style scoped>
.chat-pane {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--wc-panel);
  min-height: 0;
  overflow: hidden;
  position: relative;
  z-index: 0;
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

.chat-pane.workshop-in-chat .chat-input-area {
  flex-shrink: 0;
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
  pointer-events: none;
}

.chat-pane.chat-empty .chat-input-area .input-box {
  pointer-events: auto;
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
  overflow-anchor: none;
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
  background: var(--wc-user-bubble-bg);
  color: var(--wc-user-bubble-fg);
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

.slash-cmd-tag.mention-tag {
  color: var(--wc-accent, #4a9eff);
  background: color-mix(in srgb, var(--wc-accent) 12%, var(--wc-input-bg));
  border-color: color-mix(in srgb, var(--wc-accent) 35%, var(--wc-border));
}

.role-mention-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.role-mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wc-text) 6%, var(--wc-input-bg));
  border: 1px solid var(--wc-border);
  vertical-align: middle;
  max-width: 100%;
}

.role-mention-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wc-muted-surface);
  font-size: 10px;
  font-weight: 600;
  color: var(--wc-text-muted);
}

.role-mention-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.role-mention-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--wc-text);
  line-height: 1.35;
}

.role-mention-cmd {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  color: #c9922e;
  line-height: 1.35;
}

.role-mention-body {
  font-size: 13px;
  line-height: 1.5;
  color: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.assistant-role-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.assistant-role-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--wc-text-muted);
  flex-shrink: 0;
}

.assistant-role-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.assistant-role-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.assistant-role-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--wc-text);
}

.assistant-role-title {
  font-size: 11px;
  color: var(--wc-text-dim);
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

.workshop-clarify-hint {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--wc-border);
  background: var(--wc-muted-surface);
}
.workshop-clarify-hint-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-accent, #6eb6ff);
  margin-bottom: 4px;
}
.workshop-clarify-hint p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--wc-text);
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

.file-ref-chip.image-chip {
  padding: 2px 4px 2px 2px;
  gap: 2px;
}

.image-chip-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.msg-image-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.msg-image-thumb {
  max-width: 200px;
  max-height: 160px;
  border-radius: 8px;
  object-fit: contain;
  background: var(--wc-muted-surface);
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

.input-mention-pill {
  flex-shrink: 0;
  margin-top: 1px;
  padding-right: 4px;
}

.input-mention-pill .input-mention-remove {
  margin-left: 2px;
}

.input-mention-remove {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-muted);
}

.input-mention-remove:hover {
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

.footer-plan-build-btn {
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  background: #e9b770;
  color: #1a1408;
  flex-shrink: 0;
}

.footer-plan-build-btn:hover:not(:disabled) {
  background: #f0c585;
}

.footer-plan-build-btn:disabled,
.footer-plan-build-btn.built {
  opacity: 0.45;
  cursor: not-allowed;
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
