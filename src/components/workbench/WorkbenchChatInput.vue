<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { ModelEntry, UserEntry } from '../../types/axecoder'
import ModelPickerDropdown from './ModelPickerDropdown.vue'
import AtRefPicker from './AtRefPicker.vue'
import { isUnderProject, relativeToProject, type ChatFileRef } from '../../utils/chat-file-context'
import type { AttachedImageView } from '../../composables/useChatAttachedImages'
import {
  formatRoleMentionInput,
  hasMultipleRoleMentions,
  parseCommittedRoleMention,
  resolveRoleCommandSlug,
  sanitizeRoleMentionArgs,
  effectiveUserSkillSlugs,
} from '../../utils/role-mention'
import { findUserById } from '../../utils/workshop-user-bind'

const props = defineProps<{
  projectRoot: string
  modelValue: string
  placeholder?: string
  loading?: boolean
  enabledModels: ModelEntry[]
  activeModelId: string
  attachedFiles: ChatFileRef[]
  attachedImages?: AttachedImageView[]
  /** Users 列表，用于 @ 提及角色 */
  mentionUsers?: UserEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:attachedFiles': [files: ChatFileRef[]]
  send: []
  'select-model': [id: string]
  'add-models': []
  paste: [e: ClipboardEvent]
  'remove-image': [id: string]
}>()

const inputEl = ref<HTMLTextAreaElement | null>(null)
const inputWrapEl = ref<HTMLElement | null>(null)
const atRefPickerRef = ref<InstanceType<typeof AtRefPicker> | null>(null)
const inputCursor = ref(0)
const dropActive = ref(false)

const mentionUsers = computed(() => props.mentionUsers ?? [])

const inputAtMention = computed(() =>
  mentionUsers.value.length
    ? parseCommittedRoleMention(props.modelValue, mentionUsers.value)
    : null,
)

const inputFieldValue = computed(() =>
  inputAtMention.value ? inputAtMention.value.args : props.modelValue,
)

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

const canSend = computed(() => {
  const mentionHasCommand = !!(inputAtMentionUser.value && effectiveUserSkillSlugs(inputAtMentionUser.value).length)
  const mentionReady =
    !!inputAtMention.value &&
    (!!inputAtMention.value.args.trim() || mentionHasCommand)
  return (
    !!props.projectRoot.trim() &&
    (!!props.modelValue.trim() || (props.attachedImages?.length ?? 0) > 0) &&
    !props.loading &&
    (props.enabledModels.length > 0 ||
      props.modelValue.trim().startsWith('/') ||
      mentionReady)
  )
})

const resizeInput = () => {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

const setInput = (val: string) => emit('update:modelValue', val)

const onInputField = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value
  if (inputAtMention.value) {
    setInput(formatRoleMentionInput(inputAtMention.value.displayName, sanitizeRoleMentionArgs(val)))
  } else {
    setInput(val)
  }
  resizeInput()
}

const clearInputAtMention = () => {
  setInput('')
  void nextTick(() => {
    resizeInput()
    inputEl.value?.focus()
  })
}

const pickerInputText = computed(() =>
  inputAtMention.value ? inputFieldValue.value : props.modelValue,
)

const syncInputCursor = () => {
  inputCursor.value = inputEl.value?.selectionStart ?? pickerInputText.value.length
}

const onAtRolePick = (user: UserEntry, replaceStart: number) => {
  const el = inputEl.value
  const text = pickerInputText.value
  const cursor = el?.selectionStart ?? text.length
  const before = text.slice(0, replaceStart)
  const after = text.slice(cursor)
  if (inputAtMention.value) {
    setInput(
      formatRoleMentionInput(
        inputAtMention.value.displayName,
        sanitizeRoleMentionArgs(before + `@${user.displayName} ` + after),
      ),
    )
    return
  }
  if (before.trim() === '') {
    setInput(formatRoleMentionInput(user.displayName))
  } else {
    setInput(`${props.modelValue.slice(0, replaceStart)}@${user.displayName} ${after}`)
  }
  void nextTick(() => {
    resizeInput()
    el?.focus()
    syncInputCursor()
  })
}

const onAtFilePick = (insertPath: string, replaceStart: number) => {
  const el = inputEl.value
  const text = pickerInputText.value
  const cursor = el?.selectionStart ?? text.length
  const before = text.slice(0, replaceStart)
  const after = text.slice(cursor)
  if (inputAtMention.value) {
    setInput(
      formatRoleMentionInput(
        inputAtMention.value.displayName,
        sanitizeRoleMentionArgs(`${before}${insertPath} ${after}`),
      ),
    )
  } else {
    const fullBefore = props.modelValue.slice(0, replaceStart)
    setInput(`${fullBefore}${insertPath} ${after}`)
  }
  void nextTick(() => {
    resizeInput()
    const pos = (inputAtMention.value ? inputFieldValue.value : props.modelValue).length - after.length
    el?.setSelectionRange(pos, pos)
    syncInputCursor()
    el?.focus()
  })
}

const onInputKeydown = (e: KeyboardEvent) => {
  if (inputAtMention.value && e.key === 'Backspace') {
    const el = inputEl.value
    if (el && el.selectionStart === 0 && el.selectionEnd === 0 && !inputAtMention.value.args) {
      e.preventDefault()
      setInput(`@${inputAtMention.value.displayName}`)
      return
    }
  }
  const picker = atRefPickerRef.value
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
    setInput('')
  }
}

const onInputEnter = () => {
  const picker = atRefPickerRef.value
  if (picker?.isOpen) {
    picker.pickActive()
    return
  }
  onSend()
}

const addAttachedPath = (filePath: string) => {
  if (!props.projectRoot.trim() || !isUnderProject(props.projectRoot, filePath)) return
  if (props.attachedFiles.some((f) => f.path === filePath)) return
  emit('update:attachedFiles', [
    ...props.attachedFiles,
    { path: filePath, name: relativeToProject(props.projectRoot, filePath) },
  ])
}

const removeAttached = (filePath: string) => {
  emit(
    'update:attachedFiles',
    props.attachedFiles.filter((f) => f.path !== filePath),
  )
}

const onDragOver = (e: DragEvent) => {
  const types = e.dataTransfer?.types ?? []
  if (!types.includes('application/x-axecoder-file') && !types.includes('text/plain')) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  dropActive.value = true
}

const onDragLeave = () => {
  dropActive.value = false
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  dropActive.value = false
  const path =
    e.dataTransfer?.getData('application/x-axecoder-file') ||
    e.dataTransfer?.getData('text/plain')
  if (!path?.trim()) return
  addAttachedPath(path.trim())
}

const onSend = () => {
  if (!canSend.value) return
  emit('send')
}

watch(
  () => props.modelValue,
  () => void nextTick(resizeInput),
)

onMounted(() => resizeInput())

defineExpose({
  focus: () => inputEl.value?.focus(),
  resizeInput,
  getPreferredAssigneeUserId: () => inputAtMention.value?.userId,
})
</script>

<template>
  <div class="chat-input-area">
    <AtRefPicker
      ref="atRefPickerRef"
      :project-root="projectRoot"
      :input-text="pickerInputText"
      :cursor="inputCursor"
      :mention-users="inputAtMention ? [] : mentionUsers"
      :anchor-el="inputWrapEl"
      @pick-role="onAtRolePick"
      @pick-file="onAtFilePick"
    />
    <div
      class="input-box"
      :class="{ 'drop-active': dropActive }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div v-if="attachedFiles.length || (attachedImages?.length ?? 0)" class="file-refs">
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
          <button type="button" class="chip-remove" @click="emit('remove-image', img.ref.id)">×</button>
        </span>
      </div>
      <div
        ref="inputWrapEl"
        class="chat-input-wrap"
        :class="{ 'has-mention': !!inputAtMention }"
      >
        <span v-if="inputAtMention" class="role-mention-chip input-mention-pill" title="Mentioned role">
          <span class="role-mention-avatar">
            <span>{{ inputAtMention.displayName.slice(0, 1) }}</span>
          </span>
          <span class="role-mention-name">@{{ inputAtMention.displayName }}</span>
          <span v-if="inputAtMentionCommandSlug" class="role-mention-cmd"
            >/{{ inputAtMentionCommandSlug }}</span
          >
          <button type="button" class="input-mention-remove" @click="clearInputAtMention">×</button>
        </span>
        <textarea
          ref="inputEl"
          class="chat-input"
          rows="1"
          :value="inputFieldValue"
          :placeholder="
            inputAtMention
              ? 'Add task details…'
              : (placeholder ?? 'Plan, Build, / for commands, @ for roles')
          "
          :disabled="loading"
          @input="(e) => { onInputField(e); syncInputCursor() }"
          @click="syncInputCursor"
          @keyup="syncInputCursor"
          @keydown="onInputKeydown"
          @keydown.enter.exact.prevent="onInputEnter"
          @paste="emit('paste', $event)"
        />
      </div>
      <div class="chat-input-footer">
        <div class="footer-left">
          <slot name="footer-prefix" />
          <ModelPickerDropdown
            v-if="enabledModels.length"
            :models="enabledModels"
            :active-model-id="activeModelId"
            @select="emit('select-model', $event)"
            @add-models="emit('add-models')"
          />
          <button
            v-else
            type="button"
            class="add-models-link"
            @click="emit('add-models')"
          >
            Add model
          </button>
        </div>
        <div class="footer-right">
          <button
            type="button"
            class="send-btn"
            :class="{ active: canSend }"
            title="Send"
            :disabled="!canSend"
            @click="onSend"
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
</template>

<style scoped>
.chat-input-area {
  padding: 10px 12px 12px;
  flex-shrink: 0;
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
.image-chip {
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
.chat-input-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 14px 4px;
}
.chat-input-wrap.has-mention {
  padding-top: 10px;
}
.input-mention-pill {
  flex-shrink: 0;
  margin-top: 2px;
  padding-right: 4px;
}
.role-mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wc-text) 6%, var(--wc-input-bg));
  border: 1px solid var(--wc-border);
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
.role-mention-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--wc-text);
}
.role-mention-cmd {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  color: #c9922e;
}
.input-mention-remove {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-muted);
}
.input-mention-remove:hover {
  background: rgba(74, 158, 255, 0.2);
  color: var(--wc-text);
}
.chat-input {
  flex: 1;
  min-width: 120px;
  min-height: 44px;
  max-height: 200px;
  resize: none;
  padding: 0;
  background: transparent;
  font-size: 13px;
  line-height: 1.5;
  color: var(--wc-text);
  border: none;
  outline: none;
}
.chat-input::placeholder {
  color: var(--wc-text-muted);
}
.chat-input:disabled {
  opacity: 0.6;
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
</style>
