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
  ModelsFile,
} from '../../types/writcraft'
import ModelPickerDropdown from './ModelPickerDropdown.vue'
import ChatDiffCard from './ChatDiffCard.vue'
import { isUnderProject, relativeToProject, type ChatFileRef } from '../../utils/chat-file-context'
import {
  applyProgressPayload,
  CHAT_IDLE_HINTS,
  type AgentProgressStep,
} from '../../utils/agent-progress'
import { runSlashCommand } from '../../slash-commands/run'
import type { SlashContext } from '../../slash-commands/types'
import {
  formatInitProgressLogLine,
  normalizeInitProgressPayload,
} from '../../utils/background-init-progress'

const md = new MarkdownIt()

const props = defineProps<{
  projectRoot: string
  /** 当前编辑器打开的文件，发送时可作为上下文 */
  contextFilePath?: string | null
  agentsSidebarVisible: boolean
}>()

const emit = defineEmits<{
  close: []
  showAgentsSidebar: []
  openModelsSettings: []
  activeChange: [id: string]
  sessionsChanged: []
  filesChanged: []
}>()

const sessionMetas = ref<ChatSessionMeta[]>([])
const activeSession = ref<ChatSession | null>(null)
const activeId = ref('')
const input = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
const loading = ref(false)
const modelsFile = ref<ModelsFile>({ schemaVersion: 1, activeModelId: '', models: [] })
const attachedFiles = ref<ChatFileRef[]>([])
const includeContextFile = ref(false)
const dropActive = ref(false)
const pendingBusy = ref(false)
const progressSteps = ref<AgentProgressStep[]>([])
const idleHintIdx = ref(0)
let idleHintTimer: ReturnType<typeof setInterval> | null = null
let progressUnsub: (() => void) | null = null
const agentProgressActive = ref(false)

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

const persist = async () => {
  if (!hasProject.value || !activeSession.value) return
  const s = activeSession.value
  const res = await window.writcraft.saveChatSession(props.projectRoot, {
    id: s.id,
    title: s.title,
    updatedAt: s.updatedAt,
    messages: s.messages.map((m) => ({
      role: m.role,
      text: m.text,
      ...(m.filePaths?.length ? { filePaths: [...m.filePaths] } : {}),
      ...(m.apiContent ? { apiContent: m.apiContent } : {}),
      ...(m.assistantContent !== undefined ? { assistantContent: m.assistantContent } : {}),
      ...(m.reasoningContent ? { reasoningContent: m.reasoningContent } : {}),
    })),
  })
  if (!res.ok) return
  syncMetaFromActive()
  emit('sessionsChanged')
}

const reset = () => {
  sessionMetas.value = []
  activeSession.value = null
  activeId.value = ''
}

const resizeInput = () => {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
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
  if (activeSession.value && activeId.value && activeId.value !== id) {
    await persist()
  }
  const { session } = await window.writcraft.getChatSession(props.projectRoot, id)
  if (!session) return false
  activeSession.value = session
  activeId.value = id
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
  modelsFile.value = await window.writcraft.listModels()
}

const load = async () => {
  if (!hasProject.value) {
    reset()
    return
  }
  const res = await window.writcraft.getChatSessions(props.projectRoot)
  sessionMetas.value = res.sessions
  if (!sessionMetas.value.length) {
    reset()
    return
  }
  const pickId =
    activeId.value && sessionMetas.value.some((s) => s.id === activeId.value)
      ? activeId.value
      : sessionMetas.value[0].id
  await selectSession(pickId)
}

const newChat = async () => {
  if (!hasProject.value) return
  const s: ChatSession = {
    id: newId(),
    title: '新对话',
    updatedAt: Date.now(),
    messages: [],
  }
  const res = await window.writcraft.saveChatSession(props.projectRoot, s)
  if (!res.ok) return
  sessionMetas.value = [
    { id: s.id, title: s.title, updatedAt: s.updatedAt },
    ...sessionMetas.value.filter((m) => m.id !== s.id),
  ]
  activeSession.value = s
  activeId.value = s.id
  emit('sessionsChanged')
}

const deleteSession = async (id: string) => {
  if (!hasProject.value || !id) return
  const wasActive = activeId.value === id
  if (wasActive) {
    activeSession.value = null
    activeId.value = ''
  }
  await window.writcraft.deleteChatSession(props.projectRoot, id)
  sessionMetas.value = sessionMetas.value.filter((s) => s.id !== id)
  if (!sessionMetas.value.length) {
    reset()
    emit('sessionsChanged')
    return
  }
  if (wasActive) {
    await selectSession(sessionMetas.value[0].id)
  }
  emit('sessionsChanged')
}

const closeChat = async () => {
  if (!hasProject.value) {
    emit('close')
    return
  }
  if (!activeSession.value) {
    emit('close')
    return
  }
  await deleteSession(activeId.value)
}

const onModelPick = async (id: string) => {
  const res = await window.writcraft.setActiveModel(id)
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
  if (!types.includes('application/x-writcraft-file') && !types.includes('text/plain')) return
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
    e.dataTransfer?.getData('application/x-writcraft-file') ||
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

const toApiMessages = (msgs: ChatMessage[]): AiChatMessage[] => {
  const api: AiChatMessage[] = []
  for (const m of msgs) {
    if (m.role === 'user') {
      api.push({ role: 'user', content: m.apiContent ?? m.text })
    } else {
      api.push({
        role: 'assistant',
        content: m.assistantContent ?? m.text,
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

const bindAgentProgress = () => {
  unbindAgentProgress()
  progressSteps.value = []
  agentProgressActive.value = true
  progressUnsub = window.writcraft.onAgentProgress((payload) => {
    if (!agentProgressActive.value) return
    progressSteps.value = applyProgressPayload(progressSteps.value, payload)
    void scrollMessages()
  })
}

const clearProgressUi = () => {
  stopIdleHintTimer()
  unbindAgentProgress()
  progressSteps.value = []
}

const formatToolLog = (log: AgentToolLogEntry[]) => {
  if (!log.length) return ''
  const lines = log.map((t) => `- ${t.ok ? '✓' : '✗'} ${t.name}: ${t.summary}`)
  return `\n\n---\n工具：\n${lines.join('\n')}`
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
    emit('filesChanged')
    return
  }
  activeSession.value.messages.push({
    role: 'assistant',
    text: (res.assistantText + suffix).trim() || '请确认以下变更：',
    toolLog: res.toolLog,
    pendingWrites: res.pending,
    agentSessionId: res.sessionId,
    ...(res.assistantContent !== undefined ? { assistantContent: res.assistantContent } : {}),
    ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
  })
}

const applyContinueToMessage = (msg: ChatMessage, res: AgentContinueResult) => {
  if (!res.ok) {
    msg.text += `\n\n确认失败：${res.error}`
    msg.pendingWrites = undefined
    return
  }
  const suffix = formatToolLog(res.toolLog)
  if (res.status === 'pending') {
    msg.pendingWrites = res.pending
    msg.agentSessionId = res.sessionId
    if (res.assistantText.trim()) msg.text = res.assistantText + suffix
    else msg.text += suffix
  } else {
    msg.pendingWrites = undefined
    msg.text = (res.assistantText + suffix).trim() || msg.text
    emit('filesChanged')
  }
}

const onConfirmPending = async (msg: ChatMessage, pendingId: string) => {
  if (!msg.agentSessionId || pendingBusy.value) return
  pendingBusy.value = true
  bindAgentProgress()
  try {
    const res = await window.writcraft.agentConfirmWrite(msg.agentSessionId, pendingId)
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
  bindAgentProgress()
  try {
    const res = await window.writcraft.agentRejectWrite(msg.agentSessionId, pendingId)
    applyContinueToMessage(msg, res)
    activeSession.value!.updatedAt = Date.now()
    await persist()
  } finally {
    pendingBusy.value = false
    clearProgressUi()
  }
}

const hasPendingWritesInSession = () => {
  const msgs = activeSession.value?.messages ?? []
  for (const m of msgs) {
    if (m.pendingWrites?.length) return true
  }
  return false
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
    const res = await window.writcraft.setActiveModel(id)
    return { ok: res.ok, data: res.ok ? res.data : undefined }
  },
  openModelsSettings: () => emit('openModelsSettings'),
  initBackground: (modelId?: string) =>
    window.writcraft.initBackground(props.projectRoot, modelId),
})

const send = async () => {
  const text = input.value.trim()
  if (!hasProject.value || !text || !activeSession.value) return

  if (text.startsWith('/')) {
    if (loading.value || pendingBusy.value || hasPendingWritesInSession()) {
      activeSession.value.messages.push({
        role: 'assistant',
        text: '请等待当前回复或完成 Agent 写盘确认后再使用斜杠命令。',
      })
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    input.value = ''
    await nextTick()
    resizeInput()

    const isInitCmd = /^\/init\b/i.test(text.trim())
    let initProgressUnsub: (() => void) | null = null
    let initProgressMsg: ChatMessage | null = null
    if (isInitCmd) {
      initProgressMsg = { role: 'assistant', text: '**/init** 进行中…\n\n' }
      activeSession.value.messages.push(initProgressMsg)
      activeSession.value.updatedAt = Date.now()
      await persist()
      initProgressUnsub = window.writcraft.onBackgroundInitProgress((raw) => {
        if (!initProgressMsg) return
        const line = formatInitProgressLogLine(normalizeInitProgressPayload(raw))
        if (line) initProgressMsg.text += `${line}\n`
        void scrollMessages()
      })
    }

    let slashResult
    try {
      slashResult = await runSlashCommand(text, buildSlashContext())
    } finally {
      initProgressUnsub?.()
    }

    if (slashResult === null) {
      if (initProgressMsg) {
        activeSession.value.messages = activeSession.value.messages.filter((m) => m !== initProgressMsg)
      }
      activeSession.value.messages.push({
        role: 'assistant',
        text: '暂无已注册的斜杠命令。',
      })
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    if (!slashResult.ok) {
      if (initProgressMsg) {
        initProgressMsg.text += `\n**失败：** ${slashResult.message}`
      } else {
        activeSession.value.messages.push({ role: 'assistant', text: slashResult.message })
      }
      activeSession.value.updatedAt = Date.now()
      await persist()
      return
    }
    if (!slashResult.silent && slashResult.message) {
      if (initProgressMsg) {
        initProgressMsg.text += `\n---\n\n${slashResult.message}`
      } else {
        activeSession.value.messages.push({ role: 'assistant', text: slashResult.message })
      }
      activeSession.value.updatedAt = Date.now()
      await persist()
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
  if (activeSession.value.title === '新对话') {
    activeSession.value.title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
  }
  activeSession.value.updatedAt = Date.now()

  loading.value = true
  if (agentMode.value) bindAgentProgress()
  else startIdleHintTimer()
  try {
    if (filePaths?.length) {
      userMsg.apiContent = await window.writcraft.expandChatUserWithFiles(
        props.projectRoot,
        text,
        filePaths,
      )
    }
    await persist()
    const historyMsgs = activeSession.value.messages.slice(0, -1)
    const apiMessages = toApiMessages([...historyMsgs, userMsg])
    if (agentMode.value) {
      const res = await window.writcraft.agentSend(props.projectRoot, modelId, apiMessages)
      pushAssistantFromAgent(res)
    } else {
      const res = await window.writcraft.aiChat(modelId, apiMessages)
      if (res.ok) {
        const replyText = res.text.trim() || '（模型未返回内容，请检查模型 ID 或 API 配置）'
        activeSession.value.messages.push({
          role: 'assistant',
          text: replyText,
          assistantContent: res.content,
          ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
        })
      } else {
        activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${res.error}` })
      }
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
      const res = await window.writcraft.agentSend(props.projectRoot, modelId, apiMessages)
      pushAssistantFromAgent(res)
    } else {
      const res = await window.writcraft.aiChat(modelId, apiMessages)
      if (res.ok) {
        const replyText = res.text.trim() || '（模型未返回内容，请检查模型 ID 或 API 配置）'
        activeSession.value.messages.push({
          role: 'assistant',
          text: replyText,
          assistantContent: res.content,
          ...(res.reasoningContent ? { reasoningContent: res.reasoningContent } : {}),
        })
      } else {
        activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${res.error}` })
      }
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

watch(activeId, (id) => {
  emit('activeChange', id)
})

watch(input, () => {
  void nextTick(() => resizeInput())
})

watch(
  () => props.projectRoot,
  () => {
    void load()
  },
)

onMounted(() => {
  void loadModels()
  void load()
})

onUnmounted(() => {
  clearProgressUi()
})

const showProgressBubble = computed(() => loading.value || pendingBusy.value)

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
})
</script>

<template>
  <section class="chat-pane" :class="{ 'agents-hidden': !agentsSidebarVisible }">
    <div class="chat-tabs">
      <div v-if="activeSession" class="chat-tab active">
        <span class="tab-label">{{ activeSession.title }}</span>
        <button type="button" class="tab-close" title="关闭对话" @click="closeChat">×</button>
      </div>
      <button type="button" class="new-tab" title="新对话" @click="newChat">+</button>
      <div class="tabs-spacer" />
      <button
        v-if="!agentsSidebarVisible"
        type="button"
        class="agents-expand"
        title="显示 Agents 历史"
        @click="emit('showAgentsSidebar')"
      >
        <svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
          <rect x="9" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
    <div ref="messagesEl" :key="activeId" class="chat-messages">
      <div v-if="!hasProject" class="empty-hint">请先打开项目，再开始 AI 对话</div>
      <div v-else-if="!activeSession" class="empty-hint">点击 + 或右侧「新建对话」开始</div>
      <div v-else-if="!messages.length" class="empty-hint">发送第一条消息，或从右侧选择历史会话</div>
      <div v-for="(msg, i) in messages" :key="i" class="message" :class="msg.role">
        <div v-if="msg.role === 'user'" class="user-bubble">
          <div v-if="msg.filePaths?.length" class="msg-file-tags">
            <span v-for="fp in msg.filePaths" :key="fp" class="msg-file-tag" :title="fp">
              {{ relativeToProject(projectRoot, fp) }}
            </span>
          </div>
          {{ msg.text }}
        </div>
        <template v-else>
          <div
            v-if="msg.text.trim()"
            class="assistant-text"
            v-html="renderMarkdown(msg.text)"
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
          <div class="progress-headline">
            <span class="progress-pulse" aria-hidden="true" />
            {{ progressHeadline }}
          </div>
          <ul v-if="agentMode && progressSteps.length" class="progress-steps">
            <li
              v-for="step in progressSteps"
              :key="step.id"
              class="progress-step"
              :class="step.status"
            >
              <span class="progress-dot" />
              <span class="progress-label">{{ step.label }}</span>
            </li>
          </ul>
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
    <div class="chat-input-area">
      <div
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
        <textarea
          ref="inputEl"
          v-model="input"
          class="chat-input"
          rows="1"
          placeholder=""
          @input="resizeInput"
          @keydown.enter.exact.prevent="send"
        />
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
            <button
              type="button"
              class="icon-btn"
              title="历史会话"
              @click="emit('showAgentsSidebar')"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  d="M8 3a5 5 0 1 0 4.2 7.6M8 1.5v3M8 4.5H5.5"
                />
              </svg>
            </button>
            <button
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
}

.chat-tabs {
  height: 35px;
  display: flex;
  align-items: center;
  background: var(--wc-bg-dark);
  border-bottom: 1px solid var(--wc-border);
  padding: 0 8px;
  gap: 4px;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
}

.tabs-spacer {
  flex: 1;
}

.agents-expand {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
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
  padding: 6px 8px 6px 12px;
  font-size: 12px;
  background: var(--wc-panel);
  border-radius: 4px 4px 0 0;
  overflow: hidden;
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

.new-tab {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--wc-text-muted);
  font-size: 18px;
  line-height: 1;
}

.new-tab:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
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

.user-bubble {
  align-self: flex-end;
  max-width: 85%;
  padding: 10px 14px;
  background: var(--wc-input-bg);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
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
}

.progress-headline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--wc-text);
}

.progress-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--wc-accent, #4a9eff);
  flex-shrink: 0;
  animation: progress-pulse 1.2s ease-in-out infinite;
}

@keyframes progress-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.progress-steps {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  color: var(--wc-text-dim);
  line-height: 1.4;
}

.progress-step.active {
  color: var(--wc-text);
}

.progress-step.active .progress-dot {
  animation: progress-dot-blink 0.9s ease-in-out infinite;
}

.progress-step.done .progress-dot {
  background: #3d9a5f;
}

.progress-step.error .progress-dot {
  background: #c45c5c;
}

.progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--wc-text-dim);
}

@keyframes progress-dot-blink {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.progress-label {
  word-break: break-word;
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
