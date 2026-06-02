<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { UserEntry } from '../../types/axecoder'

const props = defineProps<{
  visible: boolean
  editing: UserEntry | null
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { entry: UserEntry }]
  pickAvatar: [userId: string]
}>()

const displayName = ref('')
const role = ref('')
const expertise = ref('')
const avatarPath = ref('')
const avatarPreview = ref('')
const draftUserId = ref('')

const isBuiltinManager = computed(
  () => Boolean(props.editing?.isBuiltin && props.editing?.builtinRole === 'manager'),
)

const avatarFallback = computed(() => {
  const n = displayName.value.trim()
  return n ? n.slice(0, 1) : '?'
})

watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    draftUserId.value = props.editing?.id ?? `user-${Date.now()}`
    if (props.editing) {
      displayName.value = props.editing.displayName
      role.value = props.editing.role
      expertise.value = props.editing.expertise
      avatarPath.value = props.editing.avatarPath
      avatarPreview.value = ''
      if (props.editing.avatarPath) {
        const res = await window.axecoder.getUserAvatarDataUrl(props.editing.avatarPath)
        if (res.ok && res.dataUrl) avatarPreview.value = res.dataUrl
      }
    } else {
      displayName.value = ''
      role.value = ''
      expertise.value = ''
      avatarPath.value = ''
      avatarPreview.value = ''
    }
  },
)

const onPickAvatar = () => {
  emit('pickAvatar', draftUserId.value)
}

const onSave = () => {
  const id = draftUserId.value
  emit('save', {
    entry: {
      id,
      displayName: displayName.value.trim(),
      role: role.value.trim(),
      expertise: expertise.value.trim(),
      avatarPath: avatarPath.value,
      isBuiltin: props.editing?.isBuiltin,
      builtinRole: props.editing?.builtinRole,
    },
  })
  emit('close')
}

defineExpose({
  setAvatarPreview: (path: string, dataUrl: string) => {
    avatarPath.value = path
    avatarPreview.value = dataUrl
  },
})
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ editing ? 'Edit user' : 'Add user' }}</h3>
      <div class="avatar-row">
        <div class="avatar-preview">
          <img v-if="avatarPreview" :src="avatarPreview" alt="" />
          <span v-else class="avatar-fallback">{{ avatarFallback }}</span>
        </div>
        <button type="button" class="secondary-btn" @click="onPickAvatar">Choose avatar</button>
      </div>
      <label class="row">
        Name
        <input v-model="displayName" type="text" placeholder="Display name" />
      </label>
      <label class="row">
        Role
        <input
          v-model="role"
          type="text"
          placeholder="e.g. Backend engineer"
          :disabled="isBuiltinManager"
        />
        <span v-if="isBuiltinManager" class="hint">Built-in tech lead role cannot be changed</span>
      </label>
      <label class="row">
        Expertise
        <textarea
          v-model="expertise"
          rows="2"
          placeholder="e.g. API design, performance"
          :disabled="isBuiltinManager"
        />
        <span v-if="isBuiltinManager" class="hint">Built-in tech lead expertise cannot be changed</span>
      </label>
      <div class="actions">
        <button type="button" class="secondary-btn" @click="emit('close')">Cancel</button>
        <button type="button" class="primary-btn" @click="onSave">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  width: min(420px, 92vw);
  padding: 20px 24px;
  background: var(--wc-panel);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
}

h3 {
  margin: 0 0 16px;
  font-size: 16px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.avatar-preview {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 22px;
  font-weight: 600;
  color: var(--wc-text-muted);
}

.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--wc-text-muted);
}

.row input,
.row textarea {
  padding: 8px 10px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--wc-text);
}

.row input:disabled,
.row textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 11px;
  color: var(--wc-text-dim);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.primary-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--wc-accent);
  color: #fff;
  font-size: 13px;
}

.secondary-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  color: var(--wc-text);
  font-size: 13px;
}
</style>
