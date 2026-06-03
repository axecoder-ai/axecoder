<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, toRef } from 'vue'
import type {
  ModelEntry,
  UserEntry,
  WorkshopMessage,
  WorkshopProgressPayload,
  WorkshopRoleId,
  WorkshopSession,
} from '../../types/axecoder'
import WorkshopMessageItem from './WorkshopMessageItem.vue'
import WorkbenchChatInput from './WorkbenchChatInput.vue'
import { applyProgressPayload, type AgentProgressStep } from '../../utils/agent-progress'
import { parseWorkshopStreamRole } from '../../utils/workshop-stream'
import type { ChatFileRef } from '../../utils/chat-file-context'
import { findUserById, inferWorkshopRoleId } from '../../utils/workshop-user-bind'
import { useWorkbenchSession } from '../../composables/useWorkbenchSession'
import { useChatAttachedImages } from '../../composables/useChatAttachedImages'

const props = defineProps<{
  projectRoot: string
  profileDisplayName?: string
  profileAvatarPath?: string
}>()

const emit = defineEmits<{
  sessionsChanged: []
  openFile: [path: string]
  openModelsSettings: []
  activeChange: [id: string]
}>()

const kind = ref<'workshop'>('workshop')
const { sendWorkshop, loadWorkshop } = useWorkbenchSession(
  toRef(props, 'projectRoot'),
  kind,
)

const active = ref<WorkshopSession | null>(null)
let activePersisted = false
const briefInput = ref('')
const answerInput = ref('')
const attachedFiles = ref<ChatFileRef[]>([])
const workshopSessionId = computed(
  () => active.value?.id ?? `ws-draft-${Date.now()}`,
)
const {
  attachedImages,
  onPasteImage,
  removeAttachedImage,
  clearAttachedImages,
  imageRefsForPersist,
} = useChatAttachedImages(workshopSessionId)
const activeModel = computed(() =>
  enabledModels.value.find((m) => m.id === modelId.value),
)
const loading = ref(false)
const thinkingRole = ref<WorkshopProgressPayload['roleId'] | null>(null)
const streamText = ref('')
const streamRoleId = ref<WorkshopRoleId | null>(null)
const streamSpeakerUserId = ref<string | null>(null)
const modelId = ref('')
const enabledModels = ref<ModelEntry[]>([])
const listEl = ref<HTMLElement | null>(null)
const userAvatarUrls = ref<Record<string, string>>({})
const usersList = ref<UserEntry[]>([])
const profileAvatarUrl = ref('')

let offProgress: (() => void) | undefined
let offAgentProgress: (() => void) | undefined
const progressSteps = ref<AgentProgressStep[]>([])
const agentProgressActive = ref(false)

const hasProject = computed(() => !!props.projectRoot?.trim())
const pendingQuestion = computed(() => active.value?.pendingQuestion ?? '')
const messages = computed(() => active.value?.messages.filter((m) => !m.hidden) ?? [])
const liveRoleId = computed((): WorkshopRoleId | null => {
  const r = streamRoleId.value ?? thinkingRole.value
  if (!r || r === 'system' || r === 'user') return null
  return r
})
const showLiveAgentItem = computed(
  () => loading.value && agentProgressActive.value && !!liveRoleId.value,
)
const showThinkingDots = computed(
  () =>
    loading.value &&
    !agentProgressActive.value &&
    !!thinkingRole.value &&
    thinkingRole.value !== 'system' &&
    thinkingRole.value !== 'user',
)
const showStartComposer = computed(
  () => !active.value || active.value.phase === 'idle' || active.value.phase === 'done',
)

const bossNickname = computed(() => props.profileDisplayName?.trim() || 'BOSS')
const bossLetter = computed(() => bossNickname.value.slice(0, 1).toUpperCase() || 'B')

const loadProfileAvatar = async () => {
  const p = props.profileAvatarPath?.trim() ?? ''
  if (!p) {
    profileAvatarUrl.value = ''
    return
  }
  const res = await window.axecoder.getUserAvatarDataUrl(p)
  profileAvatarUrl.value = res.ok && res.dataUrl ? res.dataUrl : ''
}

watch(
  () => props.profileAvatarPath,
  () => {
    void loadProfileAvatar()
  },
  { immediate: true },
)

const clearStreamUi = () => {
  streamText.value = ''
  streamRoleId.value = null
  streamSpeakerUserId.value = null
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
        streamSpeakerUserId.value = uid
        const u = findUserById(usersList.value, uid)
        streamRoleId.value = u ? inferWorkshopRoleId(u) : 'backend'
      } else {
        streamSpeakerUserId.value = null
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

const clearProgressUi = () => {
  unbindWorkshopAgentProgress()
  clearStreamUi()
}

const loadWorkshopUsers = async () => {
  const data = await window.axecoder.listUsers()
  usersList.value = data.users
  const byUser: Record<string, string> = {}
  for (const u of data.users) {
    if (!u.avatarPath) continue
    const res = await window.axecoder.getUserAvatarDataUrl(u.avatarPath)
    if (res.ok && res.dataUrl) byUser[u.id] = res.dataUrl
  }
  userAvatarUrls.value = byUser
}

const loadModels = async () => {
  const data = await window.axecoder.listModels()
  enabledModels.value = data.models.filter((m) => m.enabled)
  modelId.value =
    enabledModels.value.find((m) => m.id === data.activeModelId)?.id ??
    enabledModels.value[0]?.id ??
    ''
}

const messageRoleProps = (msg: WorkshopMessage) => {
  if (msg.roleId === 'user') {
    return {
      avatarUrl: profileAvatarUrl.value || undefined,
      nickname: bossNickname.value,
      roleTitle: 'BOSS',
      unbound: false,
    }
  }
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
  if (msg.roleId === 'manager') {
    const u = usersList.value.find((x) => x.isBuiltin && x.builtinRole === 'manager')
    if (u) {
      return {
        avatarUrl: userAvatarUrls.value[u.id],
        nickname: u.displayName,
        roleTitle: u.role,
        unbound: false,
      }
    }
  }
  const byRole = usersList.value.find((u) => inferWorkshopRoleId(u) === msg.roleId)
  if (byRole) {
    return {
      avatarUrl: userAvatarUrls.value[byRole.id],
      nickname: byRole.displayName,
      roleTitle: byRole.role,
      unbound: false,
    }
  }
  return { unbound: true }
}

const roleProps = (roleId: WorkshopRoleId, speakerUserId?: string | null) => {
  if (roleId === 'user') {
    return {
      avatarUrl: profileAvatarUrl.value || undefined,
      nickname: bossNickname.value,
      roleTitle: 'BOSS',
      unbound: false,
    }
  }
  const uid = speakerUserId ?? streamSpeakerUserId.value
  if (uid) {
    const u = findUserById(usersList.value, uid)
    if (u) {
      return {
        avatarUrl: userAvatarUrls.value[u.id],
        nickname: u.displayName,
        roleTitle: u.role,
        unbound: false,
      }
    }
  }
  if (roleId === 'manager') {
    const u = usersList.value.find((x) => x.isBuiltin && x.builtinRole === 'manager')
    if (u) {
      return {
        avatarUrl: userAvatarUrls.value[u.id],
        nickname: u.displayName,
        roleTitle: u.role,
        unbound: false,
      }
    }
  }
  const byRole = usersList.value.find((u) => inferWorkshopRoleId(u) === roleId)
  if (byRole) {
    return {
      avatarUrl: userAvatarUrls.value[byRole.id],
      nickname: byRole.displayName,
      roleTitle: byRole.role,
      unbound: false,
    }
  }
  return { unbound: true }
}

const scrollBottom = async () => {
  await nextTick()
  const el = listEl.value
  if (el) el.scrollTop = el.scrollHeight
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
      title: title || 'Workshop',
      updatedAt: now,
      userBrief: text,
      modelId: modelId.value,
      messages: [userMsg],
      phase: 'running',
      mountedFiles: [],
    }
    emit('activeChange', id)
    return id
  }
  active.value = {
    ...active.value,
    messages: [...active.value.messages, userMsg],
    phase: 'running',
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
  if (!activePersisted && rest.length === 0) {
    active.value = null
    return
  }
  active.value = {
    ...active.value,
    messages: rest,
    phase: rest.length ? active.value.phase : 'idle',
  }
}

const expandWithFiles = async (text: string, filePaths: string[]) => {
  if (!filePaths.length) return text
  return window.axecoder.expandChatUserWithFiles(props.projectRoot, text, filePaths)
}

const sendText = async (raw: string, isClarify: boolean) => {
  if (!hasProject.value || loading.value) return
  const text = raw.trim()
  const imageRefs = imageRefsForPersist()
  if ((!text && !imageRefs.length) || !modelId.value) return
  const filePaths = attachedFiles.value.map((f) => f.path)
  if (isClarify) answerInput.value = ''
  else briefInput.value = ''
  attachedFiles.value = []
  clearAttachedImages()
  const workshopId = pushOptimisticUser(text || '（图片）')
  await scrollBottom()
  loading.value = true
  thinkingRole.value = 'manager'
  clearStreamUi()
  bindWorkshopAgentProgress()
  try {
    const payload = await expandWithFiles(text, filePaths)
    const res = await sendWorkshop(
      workshopId,
      payload,
      modelId.value,
      text || '（图片）',
      imageRefs.length ? imageRefs : undefined,
    )
    if (!res.ok) {
      rollbackOptimisticUser()
      window.alert(res.error)
      return
    }
    active.value = res.session
    activePersisted = true
    emit('activeChange', res.session.id)
    await scrollBottom()
    emit('sessionsChanged')
  } finally {
    loading.value = false
    thinkingRole.value = null
    clearProgressUi()
  }
}

const selectSession = async (id: string) => {
  const session = await loadWorkshop(id)
  active.value = session
  activePersisted = !!session
  if (session) emit('activeChange', session.id)
  await scrollBottom()
}

const newSession = () => {
  const id = newLocalWorkshopId()
  const now = Date.now()
  active.value = {
    id,
    title: 'Workshop',
    updatedAt: now,
    userBrief: '',
    modelId: modelId.value,
    messages: [],
    phase: 'idle',
    mountedFiles: [],
  }
  activePersisted = false
  briefInput.value = ''
  answerInput.value = ''
  attachedFiles.value = []
  emit('activeChange', id)
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
      if (p.roleId !== 'system' && p.roleId !== 'user') {
        thinkingRole.value = p.roleId
        if (!agentProgressActive.value) {
          streamRoleId.value = null
          clearStreamUi()
        }
      }
    } else if (p.status === 'speaking') {
      thinkingRole.value = null
      if (p.roleId !== 'system' && p.roleId !== 'user') {
        if (streamRoleId.value !== p.roleId) streamText.value = ''
        streamRoleId.value = p.roleId
      }
      void scrollBottom()
    } else if (p.status === 'done') {
      thinkingRole.value = null
      if (!agentProgressActive.value) clearStreamUi()
    }
  })
})

onUnmounted(() => {
  offProgress?.()
  unbindWorkshopAgentProgress()
})

const activeId = computed(() => active.value?.id ?? '')
const activeTitle = computed(() => active.value?.title ?? 'Workshop')

defineExpose({
  loadModels,
  loadWorkshopUsers,
  selectSession,
  newSession,
  activeId,
  activeTitle,
})
</script>

<template>
  <div class="workshop-chat-section">
    <div v-if="!hasProject" class="workshop-empty">请先打开项目</div>
    <div v-else ref="listEl" class="message-list">
      <WorkshopMessageItem
        v-for="msg in messages"
        :key="msg.id"
        :role-id="msg.roleId"
        :text="msg.text"
        :reasoning-content="msg.reasoningContent"
        :related-files="msg.relatedFiles"
        v-bind="messageRoleProps(msg)"
        @open-file="openMountedFile"
      />
      <WorkshopMessageItem
        v-if="showLiveAgentItem && liveRoleId"
        :role-id="liveRoleId"
        text=""
        streaming
        :live-progress="{ steps: progressSteps, streamText: '' }"
        v-bind="roleProps(liveRoleId)"
      />
      <WorkshopMessageItem
        v-else-if="showThinkingDots && thinkingRole"
        :role-id="thinkingRole"
        text=""
        thinking
        v-bind="roleProps(thinkingRole)"
      />
    </div>
    <div v-if="hasProject" class="composer">
      <template v-if="pendingQuestion">
        <p class="clarify-prompt">{{ pendingQuestion }}</p>
        <WorkbenchChatInput
          v-model="answerInput"
          :project-root="projectRoot"
          :attached-files="attachedFiles"
          :attached-images="attachedImages"
          :loading="loading"
          :enabled-models="enabledModels"
          :active-model-id="modelId"
          placeholder="输入澄清答案…"
          @update:attached-files="attachedFiles = $event"
          @paste="onPasteImage"
          @remove-image="removeAttachedImage"
          @send="() => void sendText(answerInput, true)"
          @select-model="(id) => (modelId = id)"
          @add-models="emit('openModelsSettings')"
        />
      </template>
      <WorkbenchChatInput
        v-else-if="showStartComposer"
        v-model="briefInput"
        :project-root="projectRoot"
        :attached-files="attachedFiles"
        :attached-images="attachedImages"
        :loading="loading"
        :enabled-models="enabledModels"
        :active-model-id="modelId"
        placeholder="描述任务，开始 Workshop 群聊…"
        @update:attached-files="attachedFiles = $event"
        @paste="onPasteImage"
        @remove-image="removeAttachedImage"
        @send="() => void sendText(briefInput, false)"
        @select-model="(id) => (modelId = id)"
        @add-models="emit('openModelsSettings')"
      />
      <p v-else-if="loading" class="composer-hint">协作进行中…</p>
    </div>
  </div>
</template>

<style scoped>
.workshop-chat-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.composer {
  flex-shrink: 0;
  border-top: 1px solid var(--wc-border);
  padding: 8px 12px;
}
.clarify-prompt {
  font-size: 12px;
  color: var(--wc-text-dim);
  margin: 0 0 8px;
}
.composer-hint {
  font-size: 12px;
  color: var(--wc-text-muted);
  margin: 0;
  padding: 8px 0;
}
.workshop-empty {
  padding: 24px;
  color: var(--wc-text-muted);
  font-size: 13px;
}
</style>
