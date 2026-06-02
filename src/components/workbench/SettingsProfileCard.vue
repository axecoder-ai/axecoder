<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AppSettings } from '../../types/axecoder'

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [partial: Partial<AppSettings>]
}>()

const nickname = ref('')
const avatarPreview = ref('')

const avatarFallback = computed(() => {
  const n = nickname.value.trim() || props.settings.profileDisplayName?.trim() || ''
  return n ? n.slice(0, 1).toUpperCase() : '?'
})

const loadAvatarPreview = async () => {
  const p = props.settings.profileAvatarPath?.trim() ?? ''
  if (!p) {
    avatarPreview.value = ''
    return
  }
  const res = await window.axecoder.getUserAvatarDataUrl(p)
  avatarPreview.value = res.ok && res.dataUrl ? res.dataUrl : ''
}

watch(
  () => props.settings,
  (s) => {
    nickname.value = s.profileDisplayName?.trim() ?? ''
    void loadAvatarPreview()
  },
  { immediate: true, deep: true },
)

const onPickAvatar = async () => {
  const res = await window.axecoder.pickProfileAvatar()
  if (!res.ok || res.cancelled) return
  avatarPreview.value = res.dataUrl
  emit('save', { profileAvatarPath: res.avatarPath })
}

const commitNickname = () => {
  const next = nickname.value.trim()
  const cur = props.settings.profileDisplayName?.trim() ?? ''
  if (next === cur) return
  emit('save', { profileDisplayName: next })
}
</script>

<template>
  <div class="profile-card">
    <button type="button" class="profile-avatar" title="Change avatar" @click="onPickAvatar">
      <img v-if="avatarPreview" :src="avatarPreview" alt="" />
      <span v-else>{{ avatarFallback }}</span>
    </button>
    <div class="profile-text">
      <input
        v-model="nickname"
        type="text"
        class="profile-nickname"
        placeholder="Set nickname"
        maxlength="64"
        @blur="commitNickname"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span class="profile-hint">Click avatar to change</span>
    </div>
  </div>
</template>

<style scoped>
.profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--wc-border);
}

.profile-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--wc-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wc-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.profile-avatar:hover {
  opacity: 0.9;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-nickname {
  width: 100%;
  font-size: 13px;
  font-weight: 500;
  color: var(--wc-text);
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
  border-radius: 4px;
}

.profile-nickname::placeholder {
  color: var(--wc-text-muted);
  font-weight: 400;
}

.profile-nickname:focus {
  background: var(--wc-hover);
  padding: 2px 4px;
  margin: -2px -4px;
}

.profile-hint {
  font-size: 11px;
  color: var(--wc-text-muted);
  line-height: 1.2;
}
</style>
