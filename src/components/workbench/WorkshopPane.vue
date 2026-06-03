<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type {
  ModelEntry,
  UserEntry,
  WorkshopMessage,
  WorkshopProgressPayload,
  WorkshopRoleId,
  WorkshopSession,
  WorkshopStep,
} from '../../types/axecoder'
import WorkshopMessageItem from './WorkshopMessageItem.vue'
import WorkbenchChatInput from './WorkbenchChatInput.vue'
import { applyProgressPayload, type AgentProgressStep } from '../../utils/agent-progress'
import { parseWorkshopStreamRole } from '../../utils/workshop-stream'
import type { ChatFileRef } from '../../utils/chat-file-context'
import { findUserById, findUserForWorkshopRole, inferWorkshopRoleId } from '../../utils/workshop-user-bind'

const props = defineProps<{
  projectRoot: string
}>()

const emit = defineEmits<{
  close: []
  openFile: [path: string]
  openModelsSettings: []
  sessionsChanged: []
}>()

const active = ref<WorkshopSession | null>(null)
let activePersisted = false
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
const usersList = ref<UserEntry[]>([])
const userAvatarUrls = ref<Record<string, string>>({})

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
    const roleKey = active.value
      ? parseWorkshopStreamRole(payload.sessionId, active.value.id)
      : null
    if (roleKey) {
      if (roleKey.startsWith('u-')) {
        const uid = roleKey.slice(2)
        const u = findUserById(usersList.value, uid)
        streamRoleId.value = u ? inferWorkshopRoleId(u) : 'backend'
      } else {
        streamRoleId.value = roleKey as WorkshopRoleId
      }
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
const messages = computed(
  () => active.value?.messages.filter((m) => !m.hidden) ?? [],
)
const showStartComposer = computed(
  () => !active.value || active.value.phase === 'idle' || active.value.phase === 'done',
)
const stepPlan = computed(() => active.value?.stepPlan ?? [])
const currentStepIndex = computed(() => active.value?.currentStepIndex ?? 0)
const stepBarVisible = computed(() => stepPlan.value.length > 0)

const assigneeLabel = (userId: string) => {
  const u = findUserById(usersList.value, userId)
  return u ? `${u.displayName} · ${u.role}` : userId
}

const stepItemClass = (step: WorkshopStep, index: number) => {
  const cur = currentStepIndex.value
  if (step.status === 'done') return 'ws-step--done'
  if (index === cur || step.status === 'running' || step.status === 'redo') return 'ws-step--active'
  return 'ws-step--pending'
}

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
      phase: 'planning',
      mountedFiles: [],
    }
    return id
  }
  active.value = {
    ...active.value,
    messages: [...active.value.messages, userMsg],
    phase: 'planning',
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
  const unsaved = !activePersisted
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

const employeeRoles: WorkshopRoleId[] = ['manager', 'backend', 'frontend', 'tester']

const roleProps = (roleId: WorkshopRoleId) => {
  const id = roleIdentity.value[roleId]
  const isEmployee = employeeRoles.includes(roleId)
  const unbound = isEmployee && !id
  return {
    avatarUrl: roleAvatarUrls.value[roleId],
    nickname: id?.nickname,
    roleTitle: id?.roleTitle,
    unbound,
  }
}

const messageRoleProps = (msg: WorkshopMessage) => {
  if (msg.speakerUserId) {
    const u = findUserById(usersList.value, msg.speakerUserId)
    if (u) {
      return {
        avatarUrl: userAvatarUrls.value[u.id],
        nickname: u.displayName,
        roleTitle: u.role,
        unbound: false,
      }
    }
  }
  return roleProps(msg.roleId)
}

const userComposerUi = computed(() => {
  const p = roleProps('user')
  return {
    ...p,
    nickname: p.nickname || 'BOSS',
    roleTitle: p.roleTitle || 'BOSS',
    letter: (p.nickname || 'B').slice(0, 1),
  }
})

const loadWorkshopUsers = async () => {
  const data = await window.axecoder.listUsers()
  usersList.value = data.users
  const avatars: Partial<Record<WorkshopRoleId, string>> = {}
  const names: Partial<Record<WorkshopRoleId, { nickname: string; roleTitle: string }>> = {}
  const byUser: Record<string, string> = {}
  const roles: WorkshopRoleId[] = ['manager', 'backend', 'frontend', 'tester']
  for (const roleId of roles) {
    const u = findUserForWorkshopRole(data.users, roleId)
    if (!u) continue
    names[roleId] = {
      nickname: u.displayName.trim(),
      roleTitle: u.role.trim(),
    }
    if (u.avatarPath) {
      const res = await window.axecoder.getUserAvatarDataUrl(u.avatarPath)
      if (res.ok && res.dataUrl) {
        avatars[roleId] = res.dataUrl
        byUser[u.id] = res.dataUrl
      }
    }
  }
  for (const u of data.users) {
    if (byUser[u.id] || !u.avatarPath) continue
    const res = await window.axecoder.getUserAvatarDataUrl(u.avatarPath)
    if (res.ok && res.dataUrl) byUser[u.id] = res.dataUrl
  }
  roleAvatarUrls.value = avatars
  roleIdentity.value = names
  userAvatarUrls.value = byUser
}

const notifySessionsChanged = () => {
  emit('sessionsChanged')
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
  activePersisted = true
  notifySessionsChanged()
}

const scrollBottom = async () => {
  await nextTick()
  const el = listEl.value
  if (el) el.scrollTop = el.scrollHeight
}

const selectSession = async (id: string) => {
  const res = await window.axecoder.getWorkshopSession(props.projectRoot, id)
  active.value = res.session
  activePersisted = !!res.session
  await scrollBottom()
}

const newSession = () => {
  active.value = null
  activePersisted = false
  briefInput.value = ''
  answerInput.value = ''
  attachedFiles.value = []
}

const deleteSession = async (id: string) => {
  await window.axecoder.deleteWorkshopSession(props.projectRoot, id)
  if (active.value?.id === id) {
    active.value = null
    activePersisted = false
  }
  notifySessionsChanged()
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
    activePersisted = true
    await scrollBottom()
    notifySessionsChanged()
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
  () => {
    active.value = null
    activePersisted = false
  },
)

onMounted(async () => {
  await loadModels()
  await loadWorkshopUsers()
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

defineExpose({ loadModels, loadWorkshopUsers, selectSession, newSession, deleteSession })
</script>

<template>
  <div class="workshop-pane">
    <header class="workshop-toolbar">
      <span class="workshop-brand">Collab Workshop</span>
      <span class="workshop-hint" title="与主 Chat Agent 相同：Read/Write/Grep 等工具 + 流式进度">Agent</span>
      <button type="button" class="btn-ghost" title="关闭" @click="emit('close')">×</button>
    </header>
    <main class="workshop-main">
      <div v-if="stepBarVisible" class="ws-step-bar">
        <div
          v-for="(step, index) in stepPlan"
          :key="step.id"
          class="ws-step"
          :class="stepItemClass(step, index)"
          :title="assigneeLabel(step.assigneeUserId)"
        >
          <span class="ws-step-idx">{{ index + 1 }}</span>
          <span class="ws-step-title">{{ step.title }}</span>
          <span class="ws-step-who">{{ assigneeLabel(step.assigneeUserId) }}</span>
        </div>
      </div>
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
          :reasoning-content="msg.reasoningContent"
          :message-kind="msg.kind"
          :related-files="msg.relatedFiles"
          v-bind="messageRoleProps(msg)"
          @open-file="openMountedFile"
        />
        <WorkshopMessageItem
          v-if="
            loading &&
            streamRoleId &&
            streamRoleId !== 'system' &&
            streamRoleId !== 'user' &&
            agentProgressActive
          "
          :role-id="streamRoleId"
          text=""
          streaming
          :live-progress="{ steps: progressSteps, streamText: '' }"
          v-bind="roleProps(streamRoleId)"
        />
        <WorkshopMessageItem
          v-else-if="
            thinkingRole &&
            thinkingRole !== 'system' &&
            thinkingRole !== 'user'
          "
          :role-id="thinkingRole"
          text=""
          thinking
          v-bind="roleProps(thinkingRole)"
        />
      </div>
      <div v-if="hasProject" class="composer">
        <template v-if="pendingQuestion">
          <p class="clarify-prompt">{{ pendingQuestion }}</p>
          <div class="composer-user-hint">
            <span
              class="composer-avatar"
              :class="{ 'composer-avatar--img': userComposerUi.avatarUrl }"
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
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--wc-bg);
}
.workshop-toolbar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wc-border);
}

.workshop-toolbar .btn-ghost {
  margin-left: auto;
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
.workshop-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.ws-step-bar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wc-border);
  max-height: 140px;
  overflow-y: auto;
}
.ws-step {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--wc-muted);
}
.ws-step--active {
  background: rgba(99, 102, 241, 0.12);
  color: var(--wc-text);
  font-weight: 500;
}
.ws-step--done {
  opacity: 0.65;
}
.ws-step--done .ws-step-title {
  text-decoration: line-through;
}
.ws-step-idx {
  flex-shrink: 0;
  width: 1.2em;
  font-weight: 600;
}
.ws-step-title {
  flex: 1;
  min-width: 0;
}
.ws-step-who {
  flex-shrink: 0;
  font-size: 10px;
  opacity: 0.85;
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
.composer-avatar:not(.composer-avatar--img) {
  background: var(--wc-accent);
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
