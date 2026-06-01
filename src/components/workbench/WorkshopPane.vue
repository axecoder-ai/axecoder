<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type {
  ModelEntry,
  WorkshopMessage,
  WorkshopSession,
  WorkshopSessionMeta,
  WorkshopProgressPayload,
} from '../../types/axecoder'
import WorkshopMessageItem from './WorkshopMessageItem.vue'
import WorkbenchChatInput from './WorkbenchChatInput.vue'
import AgentProgressStream from './AgentProgressStream.vue'
import { applyProgressPayload, type AgentProgressStep } from '../../utils/agent-progress'
import { parseWorkshopStreamId } from '../../utils/workshop-stream'
import type { ChatFileRef } from '../../utils/chat-file-context'
import { workshopRoleUi, type WorkshopRoleUiId } from '../../utils/workshop-roles'
import { findUserForWorkshopRole } from '../../utils/workshop-user-bind'
import type { WorkshopRoleId } from '../../types/axecoder'

const props = defineProps<{
  projectRoot: string
}>()

const emit = defineEmits<{
  close: []
  openFile: [path: string]
  openModelsSettings: []
}>()

const sessions = ref<WorkshopSessionMeta[]>([])
const active = ref<WorkshopSession | null>(null)
const briefInput = ref('')
const answerInput = ref('')
const attachedFiles = ref<ChatFileRef[]>([])
const loading = ref(false)
const thinkingRole = ref<WorkshopProgressPayload['roleId'] | null>(null)
const streamText = ref('')
const streamRoleId = ref<WorkshopRoleId | null>(null)
const modelId = ref('')
const enabledModels = ref<ModelEntry[]>([])
const listEl = ref<HTMLElement | null>(null)
const roleAvatarUrls = ref<Partial<Record<WorkshopRoleId, string>>>({})
const roleIdentity = ref<Partial<Record<WorkshopRoleId, { nickname: string; roleTitle: string }>>>(
  {},
)

let offProgress: (() => void) | undefined
let offAgentProgress: (() => void) | undefined
const progressSteps = ref<AgentProgressStep[]>([])
const agentProgressActive = ref(false)

const clearStreamUi = () => {
  streamText.value = ''
  streamRoleId.value = null
  progressSteps.value = []
}

const workshopAgentPrefix = () =>
  active.value?.id ? `workshop-${active.value.id}-` : ''

const unbindWorkshopAgentProgress = () => {
  agentProgressActive.value = false
  offAgentProgress?.()
  offAgentProgress = undefined
}

const bindWorkshopAgentProgress = () => {
  unbindWorkshopAgentProgress()
  progressSteps.value = []
  streamText.value = ''
  agentProgressActive.value = true
  offAgentProgress = window.axecoder.onAgentProgress((payload) => {
    if (!agentProgressActive.value) return
    const prefix = workshopAgentPrefix()
    if (!prefix || !payload.sessionId.startsWith(prefix)) return
    const parsed = parseWorkshopStreamId(payload.sessionId)
    if (parsed?.roleId) {
      streamRoleId.value = parsed.roleId as WorkshopRoleId
      thinkingRole.value = null
    }
    if (payload.kind === 'delta') {
      streamText.value += payload.delta
    } else {
      progressSteps.value = applyProgressPayload(progressSteps.value, payload)
    }
    void scrollBottom()
  })
}

const hasProject = computed(() => !!props.projectRoot?.trim())
const pendingQuestion = computed(() => active.value?.pendingQuestion ?? '')
const mountedFiles = computed(() => active.value?.mountedFiles ?? [])
const messages = computed(() => active.value?.messages ?? [])
const showStartComposer = computed(
  () => !active.value || active.value.phase === 'idle' || active.value.phase === 'done',
)

const expandWithFiles = async (text: string, filePaths: string[]) => {
  if (!filePaths.length) return text
  return window.axecoder.expandChatUserWithFiles(props.projectRoot, text, filePaths)
}

const newLocalWorkshopId = () =>
  `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const pushOptimisticUser = (text: string): string => {
  const now = Date.now()
  const userMsg: WorkshopMessage = {
    id: `opt-user-${now}`,
    roleId: 'user',
    text,
    createdAt: now,
  }
  if (!active.value) {
    const id = newLocalWorkshopId()
    const title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
    active.value = {
      id,
      title: title || 'Collab Workshop',
      updatedAt: now,
      userBrief: text,
      modelId: modelId.value,
      messages: [userMsg],
      phase: 'manager',
      mountedFiles: [],
    }
    return id
  }
  active.value = {
    ...active.value,
    messages: [...active.value.messages, userMsg],
    phase: 'manager',
    pendingQuestion: undefined,
    updatedAt: now,
  }
  return active.value.id
}

const rollbackOptimisticUser = () => {
  if (!active.value) return
  const msgs = active.value.messages
  const last = msgs[msgs.length - 1]
  if (!last?.id.startsWith('opt-user-')) return
  const rest = msgs.slice(0, -1)
  const unsaved = !sessions.value.some((s) => s.id === active.value!.id)
  if (unsaved && rest.length === 0) {
    active.value = null
    return
  }
  active.value = {
    ...active.value,
    messages: rest,
    phase: rest.length ? active.value.phase : 'idle',
  }
}

const roleProps = (roleId: WorkshopRoleId) => ({
  avatarUrl: roleAvatarUrls.value[roleId],
  nickname: roleIdentity.value[roleId]?.nickname,
  roleTitle: roleIdentity.value[roleId]?.roleTitle,
})

const userComposerUi = computed(() => {
  const p = roleProps('user')
  const fallback = workshopRoleUi('user')
  return {
    ...p,
    nickname: p.nickname || fallback.nickname,
    roleTitle: p.roleTitle || fallback.roleTitle,
    letter: (p.nickname || fallback.nickname).slice(0, 1) || fallback.avatar,
    color: fallback.color,
  }
})

const loadWorkshopUsers = async () => {
  const data = await window.axecoder.listUsers()
  const avatars: Partial<Record<WorkshopRoleId, string>> = {}
  const names: Partial<Record<WorkshopRoleId, { nickname: string; roleTitle: string }>> = {}
  const roles: WorkshopRoleUiId[] = ['manager', 'backend', 'frontend', 'tester', 'user']
  for (const roleId of roles) {
    const u = findUserForWorkshopRole(data.users, roleId)
    if (!u) continue
    names[roleId] = {
      nickname: u.displayName.trim() || workshopRoleUi(roleId).nickname,
      roleTitle: u.role.trim() || workshopRoleUi(roleId).roleTitle,
    }
    if (u.avatarPath) {
      const res = await window.axecoder.getUserAvatarDataUrl(u.avatarPath)
      if (res.ok && res.dataUrl) avatars[roleId] = res.dataUrl
    }
  }
  roleAvatarUrls.value = avatars
  roleIdentity.value = names
}

const loadList = async () => {
  if (!hasProject.value) {
    sessions.value = []
    return
  }
  const res = await window.axecoder.getWorkshopSessions(props.projectRoot)
  sessions.value = res.sessions
}

const loadModels = async () => {
  const data = await window.axecoder.listModels()
  enabledModels.value = data.models.filter((m) => m.enabled)
  modelId.value =
    enabledModels.value.find((m) => m.id === data.activeModelId)?.id ??
    enabledModels.value[0]?.id ??
    ''
}

const onModelPick = async (id: string) => {
  const res = await window.axecoder.setActiveModel(id)
  if (!res.ok) {
    window.alert(res.error)
    return
  }
  modelId.value = id
}

const persist = async () => {
  if (!active.value || !hasProject.value) return
  await window.axecoder.saveWorkshopSession(props.projectRoot, active.value)
  await loadList()
}

const scrollBottom = async () => {
  await nextTick()
  const el = listEl.value
  if (el) el.scrollTop = el.scrollHeight
}

const selectSession = async (id: string) => {
  const res = await window.axecoder.getWorkshopSession(props.projectRoot, id)
  active.value = res.session
  await scrollBottom()
}

const newSession = () => {
  active.value = null
  briefInput.value = ''
  answerInput.value = ''
  attachedFiles.value = []
}

const startRun = async () => {
  if (!hasProject.value || loading.value) return
  const text = briefInput.value.trim()
  if (!text) return
  if (!modelId.value) return
  const filePaths = attachedFiles.value.map((f) => f.path)
  briefInput.value = ''
  attachedFiles.value = []
  const workshopId = pushOptimisticUser(text)
  await scrollBottom()
  loading.value = true
  thinkingRole.value = 'manager'
  clearStreamUi()
  bindWorkshopAgentProgress()
  try {
    const payload = await expandWithFiles(text, filePaths)
    const res = await window.axecoder.workshopStartRun(
      props.projectRoot,
      workshopId,
      payload,
      modelId.value,
    )
    if (!res.ok) {
      rollbackOptimisticUser()
      window.alert(res.error)
      return
    }
    active.value = res.session
    await scrollBottom()
    await loadList()
  } finally {
    loading.value = false
    thinkingRole.value = null
    clearProgressUi()
  }
}

const clearProgressUi = () => {
  unbindWorkshopAgentProgress()
  clearStreamUi()
}

const sendAnswer = async () => {
  if (!active.value || loading.value || !pendingQuestion.value) return
  const text = answerInput.value.trim()
  if (!text) return
  const filePaths = attachedFiles.value.map((f) => f.path)
  answerInput.value = ''
  attachedFiles.value = []
  pushOptimisticUser(text)
  await scrollBottom()
  loading.value = true
  thinkingRole.value = 'manager'
  clearStreamUi()
  bindWorkshopAgentProgress()
  try {
    const payload = await expandWithFiles(text, filePaths)
    const res = await window.axecoder.workshopSendUserAnswer(
      props.projectRoot,
      active.value.id,
      payload,
    )
    if (!res.ok) {
      rollbackOptimisticUser()
      window.alert(res.error)
      return
    }
    active.value = res.session
    await scrollBottom()
    await persist()
  } finally {
    loading.value = false
    thinkingRole.value = null
    clearProgressUi()
  }
}

const openMountedFile = (rel: string) => {
  if (!props.projectRoot) return
  const full = rel.startsWith('/') ? rel : `${props.projectRoot}/${rel.replace(/^\.\//, '')}`
  emit('openFile', full)
}

watch(
  () => props.projectRoot,
  async () => {
    active.value = null
    await loadList()
  },
)

onMounted(async () => {
  await loadModels()
  await loadWorkshopUsers()
  await loadList()
  offProgress = window.axecoder.onWorkshopProgress((p) => {
    if (!active.value || p.workshopId !== active.value.id) return
    if (p.status === 'thinking') {
      thinkingRole.value = p.roleId
      clearStreamUi()
    } else if (p.status === 'speaking') {
      thinkingRole.value = null
      if (p.roleId !== 'system' && p.roleId !== 'user') {
        streamRoleId.value = p.roleId
        streamText.value = ''
      }
      void scrollBottom()
    } else if (p.status === 'done') {
      thinkingRole.value = null
      clearStreamUi()
    }
  })
})

onUnmounted(() => {
  offProgress?.()
  unbindWorkshopAgentProgress()
})

defineExpose({ loadModels, loadWorkshopUsers })
</script>

<template>
  <div class="workshop-pane">
    <aside class="workshop-list">
      <div class="workshop-list-head">
        <span class="workshop-brand">Collab Workshop</span>
        <span class="workshop-hint" title="与主 Chat Agent 相同：Read/Write/Grep 等工具 + 流式进度">Agent</span>
        <button type="button" class="btn-ghost" title="关闭" @click="emit('close')">×</button>
      </div>
      <button type="button" class="btn-new" :disabled="!hasProject" @click="newSession">
        新建协作
      </button>
      <ul class="session-items">
        <li
          v-for="s in sessions"
          :key="s.id"
          class="session-item"
          :class="{ active: active?.id === s.id }"
          @click="selectSession(s.id)"
        >
          {{ s.title }}
        </li>
      </ul>
    </aside>
    <main class="workshop-main">
      <div v-if="mountedFiles.length" class="file-chips">
        <button
          v-for="f in mountedFiles"
          :key="f"
          type="button"
          class="file-chip"
          @click="openMountedFile(f)"
        >
          {{ f }}
        </button>
      </div>
      <div v-if="!hasProject" class="workshop-empty">请先打开项目</div>
      <div v-else ref="listEl" class="message-list">
        <WorkshopMessageItem
          v-for="msg in messages"
          :key="msg.id"
          :role-id="msg.roleId"
          :text="msg.text"
          :related-files="msg.relatedFiles"
          v-bind="roleProps(msg.roleId)"
          @open-file="openMountedFile"
        />
        <WorkshopMessageItem
          v-if="streamRoleId && streamText"
          :role-id="streamRoleId"
          :text="streamText"
          streaming
          v-bind="roleProps(streamRoleId)"
        />
        <WorkshopMessageItem
          v-else-if="thinkingRole && thinkingRole !== 'system' && thinkingRole !== 'user'"
          :role-id="thinkingRole"
          text=""
          thinking
          v-bind="roleProps(thinkingRole)"
        />
        <div
          v-if="loading && (streamText || progressSteps.length || thinkingRole)"
          class="ws-agent-progress"
        >
          <AgentProgressStream
            :steps="progressSteps"
            :stream-text="streamText"
            :subagent-tasks="[]"
            :agent-mode="true"
            fallback-headline="协作进行中…"
          />
        </div>
      </div>
      <div v-if="hasProject" class="composer">
        <template v-if="pendingQuestion">
          <p class="clarify-prompt">{{ pendingQuestion }}</p>
          <div class="composer-user-hint">
            <span
              class="composer-avatar"
              :class="{ 'composer-avatar--img': userComposerUi.avatarUrl }"
              :style="userComposerUi.avatarUrl ? undefined : { background: userComposerUi.color }"
            >
              <img v-if="userComposerUi.avatarUrl" :src="userComposerUi.avatarUrl" alt="" />
              <span v-else>{{ userComposerUi.letter }}</span>
            </span>
            <span class="composer-user-meta">
              <span class="composer-nickname">{{ userComposerUi.nickname }}</span>
              <span class="composer-role">{{ userComposerUi.roleTitle }}</span>
            </span>
          </div>
          <WorkbenchChatInput
            v-model="answerInput"
            :project-root="projectRoot"
            :attached-files="attachedFiles"
            :loading="loading"
            :enabled-models="enabledModels"
            :active-model-id="modelId"
            placeholder="输入澄清答案…"
            @update:attached-files="attachedFiles = $event"
            @send="sendAnswer"
            @select-model="onModelPick"
            @add-models="emit('openModelsSettings')"
          />
        </template>
        <WorkbenchChatInput
          v-else-if="showStartComposer"
          v-model="briefInput"
          :project-root="projectRoot"
          :attached-files="attachedFiles"
          :loading="loading"
          :enabled-models="enabledModels"
          :active-model-id="modelId"
          placeholder="Plan, Build, / for commands, @ for context"
          @update:attached-files="attachedFiles = $event"
          @send="startRun"
          @select-model="onModelPick"
          @add-models="emit('openModelsSettings')"
        />
        <p v-else-if="loading" class="composer-hint">协作进行中…</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.workshop-pane {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--wc-bg);
}
.workshop-list {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--wc-border);
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}
.workshop-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.workshop-brand {
  font-size: 12px;
  font-weight: 600;
  color: var(--wc-text);
}
.workshop-hint {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--wc-muted-surface);
  color: var(--wc-text-dim);
  margin-left: 4px;
}
.btn-ghost {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--wc-text-muted);
}
.btn-ghost:hover {
  background: var(--wc-hover);
}
.btn-new {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
  background: var(--wc-accent);
  color: #fff;
}
.btn-new:disabled {
  opacity: 0.5;
}
.session-items {
  list-style: none;
  overflow-y: auto;
  flex: 1;
}
.session-item {
  padding: 6px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--wc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-item:hover,
.session-item.active {
  background: var(--wc-hover);
  color: var(--wc-text);
}
.workshop-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wc-border);
}
.file-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--wc-input-bg);
  color: var(--wc-accent);
}
.workshop-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wc-text-muted);
  font-size: 13px;
}
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ws-agent-progress {
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--wc-chat-box-bg);
  border: 1px solid var(--wc-chat-box-border);
  font-size: 13px;
}
.composer {
  border-top: 1px solid var(--wc-border);
  flex-shrink: 0;
}
.composer .clarify-prompt {
  padding: 8px 16px 0;
}
.composer .composer-user-hint {
  padding: 0 16px;
}
.composer-user-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  justify-content: flex-end;
}
.composer-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
}
.composer-avatar--img {
  background: var(--wc-muted-surface);
}
.composer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.composer-user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.composer-nickname {
  font-size: 12px;
  font-weight: 600;
  color: var(--wc-text);
}
.composer-role {
  font-size: 10px;
  color: var(--wc-text-muted);
}
.clarify-prompt {
  font-size: 12px;
  color: var(--wc-text-muted);
  margin-bottom: 8px;
}
.composer-hint {
  font-size: 12px;
  color: var(--wc-text-muted);
  padding: 12px 16px;
}
</style>
