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
import { workshopIdForAgentChat } from '../../utils/workshop-agent-link'
import {
  clearWorkshopLiveTurnState,
  createWorkshopLiveTurnState,
  markWorkshopAgentStreamKey,
  markWorkshopLiveRole,
} from '../../utils/workshop-live-turn'
import { detectThinkingType } from '../../utils/thinking-parser'
import {
  prepareRoleWorkflowSendPlan,
} from '../../utils/role-workflow-send'
import { parseCommittedRoleMention } from '../../utils/role-mention'
import { formatAiChatRequestError, visionUnsupportedMessage } from '../../utils/ai-chat-error'
import { visionBlockedForPendingImages } from '../../utils/chat-vision'
import { expandUserMessageForApi } from '../../utils/expand-user-message'
import { useStickToBottomScroll } from '../../composables/useStickToBottomScroll'

const props = defineProps<{
  projectRoot: string
  profileDisplayName?: string
  profileAvatarPath?: string
  /** 嵌在 Agent 标签内：不触发侧栏 workshop 标签切换 */
  embeddedInAgentChat?: boolean
  /** 与 Agent 会话 1:1 绑定的 chat id */
  linkedAgentChatId?: string
  /** 嵌入 Agent 标签时，该 Agent 会话已有消息数（用于空状态提示） */
  agentHistoryCount?: number
  /** Multi-Agent 嵌入时与 Agent 底栏共用 activeModelId */
  preferredModelId?: string
}>()

const emit = defineEmits<{
  sessionsChanged: []
  openFile: [path: string]
  openModelsSettings: []
  activeChange: [id: string]
  messageCountChange: [count: number]
}>()

const emitWorkshopActive = (id: string) => {
  if (!props.embeddedInAgentChat) emit('activeChange', id)
}

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
const thinkingText = ref('')
const thinkingTypeLabel = ref('')
const streamRoleId = ref<WorkshopRoleId | null>(null)
const streamSpeakerUserId = ref<string | null>(null)
const modelId = ref('')
const enabledModels = ref<ModelEntry[]>([])
const { scrollEl: listEl, onScrollContainer, scrollToBottom: scrollBottom } =
  useStickToBottomScroll()
const userAvatarUrls = ref<Record<string, string>>({})
const usersList = ref<UserEntry[]>([])
const profileAvatarUrl = ref('')

let offProgress: (() => void) | undefined
let offAgentProgress: (() => void) | undefined
const progressSteps = ref<AgentProgressStep[]>([])
const agentProgressActive = ref(false)
const liveTurnState = createWorkshopLiveTurnState()

const hasProject = computed(() => !!props.projectRoot?.trim())
const pendingQuestion = computed(() => active.value?.pendingQuestion ?? '')
const messages = computed(() => active.value?.messages.filter((m) => !m.hidden) ?? [])
const liveRoleId = computed((): WorkshopRoleId | null => {
  const think = thinkingRole.value
  if (think && think !== 'system' && think !== 'user') return think
  const r = streamRoleId.value
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
const showEmptyHint = computed(
  () =>
    hasProject.value &&
    !messages.value.length &&
    !loading.value &&
    !showLiveAgentItem.value &&
    !showThinkingDots.value,
)
const showAgentHistoryHint = computed(
  () =>
    !!props.embeddedInAgentChat &&
    (props.agentHistoryCount ?? 0) > 0 &&
    showEmptyHint.value,
)
const composerPlaceholder = computed(() => {
  if (!active.value?.messages.length) return 'Describe the task, or @ a role to assign directly…'
  return '@ a role or add a follow-up…'
})

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
  thinkingText.value = ''
  thinkingTypeLabel.value = ''
  streamRoleId.value = null
  streamSpeakerUserId.value = null
  progressSteps.value = []
  clearWorkshopLiveTurnState(liveTurnState)
}

const resetLiveProgressSteps = () => {
  progressSteps.value = []
  streamText.value = ''
  thinkingText.value = ''
  thinkingTypeLabel.value = ''
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
  thinkingText.value = ''
  thinkingTypeLabel.value = ''
  const currentWorkshopId = active.value?.id
  agentProgressActive.value = true
  offAgentProgress = window.axecoder.onAgentProgress((payload) => {
    if (!agentProgressActive.value) return
    // 严格过滤：只处理属于当前 workshop session 的进度消息
    const prefix = workshopAgentPrefix()
    if (!prefix || !payload.sessionId.startsWith(prefix)) return
    // 二次检查：确保当前 active.value.id 没有变化
    if (!active.value || active.value.id !== currentWorkshopId) return
    const roleKey = active.value
      ? parseWorkshopStreamRole(payload.sessionId, active.value.id)
      : null
    if (roleKey) {
      if (markWorkshopAgentStreamKey(liveTurnState, roleKey)) {
        resetLiveProgressSteps()
      }
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
    } else if (payload.kind === 'thinking_delta') {
      thinkingText.value += payload.delta
      thinkingTypeLabel.value = detectThinkingType(thinkingText.value)
    } else if (payload.kind === 'content_delta') {
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
  const preferred = props.preferredModelId?.trim()
  modelId.value =
    (preferred && enabledModels.value.find((m) => m.id === preferred)?.id) ||
    enabledModels.value.find((m) => m.id === data.activeModelId)?.id ||
    enabledModels.value[0]?.id ||
    ''
}

watch(
  () => props.preferredModelId,
  (id) => {
    if (!id?.trim() || !props.embeddedInAgentChat) return
    const hit = enabledModels.value.find((m) => m.id === id)
    if (hit) modelId.value = hit.id
  },
)

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

/** 协作进行中：每个角色 done 后从磁盘拉取最新消息，避免下一位接话时上一条「消失」 */
const syncWorkshopSession = async () => {
  const id = active.value?.id
  if (!id || !props.projectRoot?.trim()) return
  const session = await loadWorkshop(id)
  if (!session || session.id !== id) return
  active.value = session
  activePersisted = true
  await scrollBottom()
}

const newLocalWorkshopId = () =>
  `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const pushOptimisticUser = (
  text: string,
  imageRefs?: import('../../types/axecoder').ChatImageRef[],
  imagePreviews?: string[],
): string => {
  const now = Date.now()
  const userMsg: WorkshopMessage = {
    id: `opt-user-${now}`,
    roleId: 'user',
    text,
    createdAt: now,
    ...(imageRefs?.length ? { imageRefs } : {}),
    ...(imagePreviews?.length ? { imagePreviews } : {}),
  }
  if (!active.value) {
    const id =
      props.embeddedInAgentChat && props.linkedAgentChatId?.trim()
        ? workshopIdForAgentChat(props.linkedAgentChatId)
        : newLocalWorkshopId()
    const title = text.slice(0, 24) + (text.length > 24 ? '…' : '')
    active.value = {
      id,
      title: title || 'Multi-Agent',
      updatedAt: now,
      userBrief: text,
      modelId: modelId.value,
      messages: [userMsg],
      phase: 'running',
      mountedFiles: [],
    }
    emitWorkshopActive(id)
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

const expandWithFiles = async (text: string, filePaths: string[]) =>
  expandUserMessageForApi(
    props.projectRoot,
    text,
    filePaths.length ? filePaths : undefined,
    usersList.value,
  )

const pushLocalSystemMessage = (text: string) => {
  const now = Date.now()
  const sysMsg: WorkshopMessage = {
    id: `local-system-${now}`,
    roleId: 'system',
    text,
    createdAt: now,
  }
  if (!active.value) {
    const id =
      props.embeddedInAgentChat && props.linkedAgentChatId?.trim()
        ? workshopIdForAgentChat(props.linkedAgentChatId)
        : newLocalWorkshopId()
    active.value = {
      id,
      title: 'Multi-Agent',
      updatedAt: now,
      userBrief: '',
      modelId: modelId.value,
      messages: [sysMsg],
      phase: 'idle',
      mountedFiles: [],
    }
    emitWorkshopActive(id)
    return
  }
  active.value = {
    ...active.value,
    messages: [...active.value.messages, sysMsg],
    updatedAt: now,
  }
}

const sendPayload = async (opts: {
  text: string
  apiText?: string
  displayText?: string
  filePaths?: string[]
  imageRefs?: import('../../types/axecoder').ChatImageRef[]
  imagePreviews?: string[]
  modelIdOverride?: string
  isClarify?: boolean
  preferredAssigneeUserId?: string
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!hasProject.value || loading.value) return { ok: false, error: 'Busy' }
  const text = opts.text.trim()
  const imageRefs = opts.imageRefs ?? []
  if (!text && !imageRefs.length) return { ok: false, error: 'Empty message' }
  const useModelId = opts.modelIdOverride?.trim() || modelId.value
  if (!useModelId) {
    pushLocalSystemMessage('请先在设置中启用模型，或在输入框底部选择可用模型。')
    void scrollBottom(true)
    return { ok: false, error: 'No model' }
  }
  const model = activeModel.value
  const pendingImages = opts.imageRefs?.length ?? 0
  if (model && visionBlockedForPendingImages(model, pendingImages)) {
    pushLocalSystemMessage(visionUnsupportedMessage(model))
    void scrollBottom(true)
    return { ok: false, error: visionUnsupportedMessage(model) }
  }
  const filePaths = opts.filePaths ?? []
  const displayText = opts.displayText?.trim() || text || '(image)'
  const workshopId = pushOptimisticUser(displayText, imageRefs, opts.imagePreviews)
  await scrollBottom(true)
  loading.value = true
  thinkingRole.value = 'manager'
  clearStreamUi()
  bindWorkshopAgentProgress()
  try {
    const payload = await expandWithFiles(opts.apiText ?? text, filePaths)
    const res = await sendWorkshop(
      workshopId,
      payload,
      useModelId,
      displayText,
      imageRefs.length ? imageRefs : undefined,
      opts.preferredAssigneeUserId,
    )
    if (!res.ok) {
      rollbackOptimisticUser()
      pushLocalSystemMessage(formatAiChatRequestError(res.error, model))
      await scrollBottom(true)
      return { ok: false, error: res.error }
    }
    active.value = res.session
    activePersisted = true
    emitWorkshopActive(res.session.id)
    await hydrateWorkshopImagePreviews(res.session.messages)
    await scrollBottom(true)
    emit('sessionsChanged')
    return { ok: true }
  } catch (e) {
    rollbackOptimisticUser()
    const msg = e instanceof Error ? e.message : String(e)
    pushLocalSystemMessage(`协作请求异常：${msg}`)
    await scrollBottom(true)
    return { ok: false, error: msg }
  } finally {
    loading.value = false
    thinkingRole.value = null
    clearProgressUi()
  }
}

const sendText = async (raw: string, isClarify: boolean) => {
  const text = raw.trim()
  const imageRefs = imageRefsForPersist()
  const imagePreviews = attachedImages.value.map((x) => x.previewUrl)
  if (!text && !imageRefs.length) return
  const plan = await prepareRoleWorkflowSendPlan(text, usersList.value, props.projectRoot)
  if (plan.kind === 'error') {
    pushLocalSystemMessage(plan.message)
    void scrollBottom(true)
    return
  }
  const mention = parseCommittedRoleMention(text, usersList.value)
  let apiText = mention?.args.trim() || text
  if (plan.kind === 'workflow') apiText = plan.prompt
  if (isClarify) answerInput.value = ''
  else briefInput.value = ''
  attachedFiles.value = []
  clearAttachedImages()
  await sendPayload({
    text: apiText || text || '(image)',
    apiText: apiText || text,
    displayText: text || '(image)',
    imageRefs: imageRefs.length ? imageRefs : undefined,
    imagePreviews: imagePreviews.length ? imagePreviews : undefined,
    isClarify,
    preferredAssigneeUserId: mention?.userId,
  })
}

const sendWithPayload = async (opts: {
  text: string
  apiText?: string
  displayText?: string
  filePaths?: string[]
  imageRefs?: import('../../types/axecoder').ChatImageRef[]
  imagePreviews?: string[]
  modelId?: string
  preferredAssigneeUserId?: string
}) => {
  const mention = opts.displayText
    ? parseCommittedRoleMention(opts.displayText, usersList.value)
    : null
  return sendPayload({
    text: opts.text,
    apiText: opts.apiText,
    displayText: opts.displayText,
    filePaths: opts.filePaths,
    imageRefs: opts.imageRefs,
    imagePreviews: opts.imagePreviews,
    modelIdOverride: opts.modelId,
    preferredAssigneeUserId: opts.preferredAssigneeUserId ?? mention?.userId,
  })
}

const hydrateWorkshopImagePreviews = async (messages: WorkshopMessage[]) => {
  for (const m of messages) {
    if (!m.imageRefs?.length || m.imagePreviews?.length) continue
    const urls: string[] = []
    for (const ref of m.imageRefs) {
      const res = await window.axecoder.getChatImagePreview(ref)
      if (res.ok) urls.push(res.dataUrl)
    }
    if (urls.length) m.imagePreviews = urls
  }
}

const selectSession = async (id: string) => {
  const session = await loadWorkshop(id)
  if (session) await hydrateWorkshopImagePreviews(session.messages)
  active.value = session
  activePersisted = !!session
  if (session) emitWorkshopActive(session.id)
  await scrollBottom(true)
}

const openForAgentChat = async (agentChatId: string) => {
  if (!agentChatId.trim()) return
  await loadModels()
  const id = workshopIdForAgentChat(agentChatId)
  const session = await loadWorkshop(id)
  if (session) {
    await hydrateWorkshopImagePreviews(session.messages)
    active.value = session
    activePersisted = true
    modelId.value = session.modelId || modelId.value
    emitWorkshopActive(id)
    await scrollBottom(true)
    return
  }
  const now = Date.now()
  active.value = {
    id,
    title: 'Multi-Agent',
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
  emitWorkshopActive(id)
}

const newSession = () => {
  const id = newLocalWorkshopId()
  const now = Date.now()
  active.value = {
    id,
    title: 'Multi-Agent',
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
  emitWorkshopActive(id)
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
        if (markWorkshopLiveRole(liveTurnState, p.roleId)) {
          resetLiveProgressSteps()
        }
        thinkingRole.value = p.roleId
        if (!agentProgressActive.value) {
          streamRoleId.value = null
          streamSpeakerUserId.value = null
        } else {
          streamRoleId.value = p.roleId
        }
      }
    } else if (p.status === 'speaking') {
      if (p.roleId !== 'system' && p.roleId !== 'user') {
        if (markWorkshopLiveRole(liveTurnState, p.roleId)) {
          resetLiveProgressSteps()
        }
        thinkingRole.value = null
        streamRoleId.value = p.roleId
      } else {
        thinkingRole.value = null
      }
      void scrollBottom()
    } else if (p.status === 'done') {
      thinkingRole.value = null
      if (!agentProgressActive.value) clearStreamUi()
      void syncWorkshopSession()
    }
  })
})

onUnmounted(() => {
  offProgress?.()
  unbindWorkshopAgentProgress()
})

const activeId = computed(() => active.value?.id ?? '')
const activeTitle = computed(() => active.value?.title ?? 'Multi-Agent')

const activeMessageCount = computed(() => active.value?.messages.length ?? 0)

watch(
  activeMessageCount,
  (n) => {
    emit('messageCountChange', n)
  },
  { immediate: true },
)

defineExpose({
  loadModels,
  loadWorkshopUsers,
  selectSession,
  openForAgentChat,
  newSession,
  sendWithPayload,
  activeId,
  activeTitle,
  activeMessageCount,
  loading,
})
</script>

<template>
  <div class="workshop-chat-section">
    <div v-if="!hasProject" class="workshop-empty">Open a project first</div>
    <div v-else ref="listEl" class="message-list" @scroll="onScrollContainer">
      <div v-if="showEmptyHint" class="workshop-empty-hint">
        <p class="workshop-empty-title">Multi-Agent 协作</p>
        <p class="workshop-empty-desc">在下方描述任务，Tech Lead 会协调各角色 Agent 协作完成。</p>
        <p v-if="showAgentHistoryHint" class="workshop-empty-note">
          此标签下曾有普通 Agent 对话；Multi-Agent 使用独立线程，不会显示那些记录。切换到
          <strong>@ Agent</strong>
          可查看原聊天。
        </p>
      </div>
      <WorkshopMessageItem
        v-for="msg in messages"
        :key="msg.id"
        :role-id="msg.roleId"
        :text="msg.text"
        :reasoning-content="msg.reasoningContent"
        :related-files="msg.relatedFiles"
        :image-previews="msg.imagePreviews"
        v-bind="messageRoleProps(msg)"
        @open-file="openMountedFile"
      />
      <WorkshopMessageItem
        v-if="showLiveAgentItem && liveRoleId"
        :role-id="liveRoleId"
        text=""
        streaming
        :live-progress="{
          steps: progressSteps,
          streamText: streamText,
          thinkingText: thinkingText,
          thinkingType: thinkingTypeLabel,
        }"
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
    <div v-if="hasProject && !embeddedInAgentChat" class="composer">
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
          :mention-users="usersList"
          placeholder="Type clarification…"
          @update:attached-files="attachedFiles = $event"
          @paste="onPasteImage"
          @remove-image="removeAttachedImage"
          @send="() => void sendText(answerInput, true)"
          @select-model="(id) => (modelId = id)"
          @add-models="emit('openModelsSettings')"
        >
          <template v-if="embeddedInAgentChat" #footer-prefix>
            <slot name="mode-picker" />
          </template>
        </WorkbenchChatInput>
      </template>
      <template v-else>
      <p v-if="loading" class="composer-hint">Collaboration in progress…</p>
      <WorkbenchChatInput
        v-model="briefInput"
        :project-root="projectRoot"
        :attached-files="attachedFiles"
        :attached-images="attachedImages"
        :loading="loading"
        :enabled-models="enabledModels"
        :active-model-id="modelId"
        :mention-users="usersList"
        :placeholder="composerPlaceholder"
        @update:attached-files="attachedFiles = $event"
        @paste="onPasteImage"
        @remove-image="removeAttachedImage"
        @send="() => void sendText(briefInput, false)"
        @select-model="(id) => (modelId = id)"
        @add-models="emit('openModelsSettings')"
      >
        <template v-if="embeddedInAgentChat" #footer-prefix>
          <slot name="mode-picker" />
        </template>
      </WorkbenchChatInput>
      </template>
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
.workshop-empty-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  text-align: center;
  color: var(--wc-text-muted);
  font-size: 13px;
  line-height: 1.5;
  user-select: none;
}
.workshop-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--wc-text);
}
.workshop-empty-desc,
.workshop-empty-note {
  margin: 0;
  max-width: 420px;
}
.workshop-empty-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--wc-text-dim);
}
.workshop-empty-note strong {
  font-weight: 600;
  color: var(--wc-text-muted);
}
</style>
