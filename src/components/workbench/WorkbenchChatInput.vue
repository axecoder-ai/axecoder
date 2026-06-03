<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { ModelEntry } from '../../types/axecoder'
import ModelPickerDropdown from './ModelPickerDropdown.vue'
import { isUnderProject, relativeToProject, type ChatFileRef } from '../../utils/chat-file-context'
import type { AttachedImageView } from '../../composables/useChatAttachedImages'

const props = defineProps<{
  projectRoot: string
  modelValue: string
  placeholder?: string
  loading?: boolean
  enabledModels: ModelEntry[]
  activeModelId: string
  attachedFiles: ChatFileRef[]
  attachedImages?: AttachedImageView[]
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
const dropActive = ref(false)

const text = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

const canSend = computed(
  () =>
    !!props.projectRoot.trim() &&
    (!!text.value.trim() || (props.attachedImages?.length ?? 0) > 0) &&
    !props.loading &&
    (props.enabledModels.length > 0 || text.value.trim().startsWith('/')),
)

const resizeInput = () => {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
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

defineExpose({ focus: () => inputEl.value?.focus(), resizeInput })
</script>

<template>
  <div class="chat-input-area">
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
          title="粘贴的图片"
        >
          <img :src="img.previewUrl" alt="" class="image-chip-thumb" />
          <button type="button" class="chip-remove" @click="emit('remove-image', img.ref.id)">×</button>
        </span>
      </div>
      <textarea
        ref="inputEl"
        v-model="text"
        class="chat-input"
        rows="1"
        :placeholder="placeholder ?? 'Plan, Build, / for commands, @ for context'"
        :disabled="loading"
        @input="resizeInput"
        @keydown.enter.exact.prevent="onSend"
        @paste="emit('paste', $event)"
      />
      <div class="chat-input-footer">
        <div class="footer-left">
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
            添加模型
          </button>
        </div>
        <div class="footer-right">
          <button
            type="button"
            class="send-btn"
            :class="{ active: canSend }"
            title="发送"
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
