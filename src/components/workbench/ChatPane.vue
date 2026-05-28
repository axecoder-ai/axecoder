<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import type {
  AiChatMessage,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  ModelsFile,
} from '../../types/writcraft'
import ModelPickerDropdown from './ModelPickerDropdown.vue'
import {
  buildUserMessageWithFiles,
  isUnderProject,
  relativeToProject,
  type ChatFileRef,
} from '../../utils/chat-file-context'

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
const includeContextFile = ref(true)
const dropActive = ref(false)

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
      ...(m.filePaths?.length ? { filePaths: m.filePaths } : {}),
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
  await window.writcraft.deleteChatSession(props.projectRoot, id)
  sessionMetas.value = sessionMetas.value.filter((s) => s.id !== id)
  if (!sessionMetas.value.length) {
    reset()
    emit('sessionsChanged')
    return
  }
  if (activeId.value === id) {
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

const toApiMessages = async (msgs: ChatMessage[]): Promise<AiChatMessage[]> => {
  const api: AiChatMessage[] = []
  for (const m of msgs) {
    if (m.role === 'user') {
      const content = m.filePaths?.length
        ? await buildUserMessageWithFiles(
            m.text,
            m.filePaths,
            props.projectRoot,
            (p) => window.writcraft.readFile(p),
          )
        : m.text
      api.push({ role: 'user', content })
    } else {
      api.push({ role: 'assistant', content: m.text })
    }
  }
  return api
}

const send = async () => {
  const text = input.value.trim()
  if (!hasProject.value || !text || !activeSession.value || loading.value) return
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
  includeContextFile.value = true
  if (activeSession.value.title === '新对话') {
    activeSession.value.title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
  }
  activeSession.value.updatedAt = Date.now()
  await persist()

  loading.value = true
  try {
    const historyMsgs = activeSession.value.messages.slice(0, -1)
    const apiMessages = await toApiMessages([...historyMsgs, userMsg])
    const res = await window.writcraft.aiChat(modelId, apiMessages)
    const replyText = res.ok ? res.text : `请求失败：${res.error}`
    activeSession.value.messages.push({ role: 'assistant', text: replyText })
    activeSession.value.updatedAt = Date.now()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '请求异常'
    activeSession.value.messages.push({ role: 'assistant', text: `请求失败：${msg}` })
    activeSession.value.updatedAt = Date.now()
  } finally {
    loading.value = false
    await persist()
  }
}

const canSend = computed(
  () =>
    hasProject.value &&
    !!input.value.trim() &&
    !loading.value &&
    enabledModels.value.length > 0,
)

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

watch(
  () => props.contextFilePath,
  () => {
    includeContextFile.value = true
  },
)

onMounted(() => {
  void loadModels()
  void load()
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
        <svg viewBox="0 0 16 16" width="16" height="16">
          <rect x="2.5" y="4.5" width="11" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1" />
          <rect x="10.5" y="5" width="2.5" height="6" rx="0.5" fill="currentColor" />
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
        <div v-else class="assistant-text" v-html="renderMarkdown(msg.text)" />
      </div>
      <div v-if="loading" class="loading">思考中…</div>
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
  min-width: var(--wc-chat-min);
  display: flex;
  flex-direction: column;
  background: var(--wc-panel);
  min-height: 0;
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

.chat-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 12px;
  font-size: 12px;
  background: var(--wc-panel);
  border-radius: 4px 4px 0 0;
  max-width: 220px;
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
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
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
  white-space: pre-wrap;
  color: var(--wc-text);
}

.loading {
  font-size: 12px;
  color: var(--wc-text-dim);
}

.chat-input-area {
  padding: 10px 12px 12px;
  flex-shrink: 0;
}

.input-box {
  background: #262626;
  border: 1px solid #333333;
  border-radius: 12px;
  overflow: hidden;
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
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-ref-chip.context {
  color: var(--wc-text-muted);
  border: 1px dashed rgba(255, 255, 255, 0.15);
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
  background: rgba(255, 255, 255, 0.1);
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
  background: rgba(0, 0, 0, 0.2);
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
  background: rgba(255, 255, 255, 0.06);
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
  background: rgba(255, 255, 255, 0.06);
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
  background: rgba(255, 255, 255, 0.08);
  color: var(--wc-text);
}

.send-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: var(--wc-text-dim);
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.send-btn.active {
  background: #e8e8e8;
  color: #1a1a1a;
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.send-btn.active:hover:not(:disabled) {
  background: #f0f0f0;
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
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
}

.assistant-text :deep(code) {
  font-size: 12px;
}

.assistant-text :deep(ul),
.assistant-text :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.4em;
}
</style>
