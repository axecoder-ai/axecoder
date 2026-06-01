<script setup lang="ts">
import { computed } from 'vue'
import type { WorkshopRoleId } from '../../types/axecoder'
import { workshopRoleUi } from '../../utils/workshop-roles'

const props = defineProps<{
  roleId: WorkshopRoleId
  text: string
  relatedFiles?: string[]
  thinking?: boolean
  streaming?: boolean
  avatarUrl?: string
  nickname?: string
  roleTitle?: string
}>()

defineEmits<{
  openFile: [path: string]
}>()

const ui = computed(() => workshopRoleUi(props.roleId))
const displayNickname = computed(() => props.nickname?.trim() || ui.value.nickname)
const displayRoleTitle = computed(() => props.roleTitle?.trim() || ui.value.roleTitle)
const avatarLetter = computed(
  () => displayNickname.value.slice(0, 1) || ui.value.avatar.slice(0, 1),
)
const isUser = computed(() => props.roleId === 'user')
const isSystem = computed(() => props.roleId === 'system')
</script>

<template>
  <div class="ws-msg" :class="{ 'ws-msg--user': isUser, 'ws-msg--system': isSystem }">
    <div
      v-if="!isUser"
      class="ws-avatar"
      :class="{ 'ws-avatar--img': avatarUrl }"
      :style="avatarUrl ? undefined : { background: ui.color }"
      :title="`${displayNickname} · ${displayRoleTitle}`"
    >
      <img v-if="avatarUrl" :src="avatarUrl" alt="" />
      <span v-else>{{ avatarLetter }}</span>
    </div>
    <div class="ws-body">
      <div class="ws-meta">
        <span class="ws-nickname">{{ displayNickname }}</span>
        <span class="ws-role-badge">{{ displayRoleTitle }}</span>
      </div>
      <div v-if="thinking" class="ws-bubble ws-bubble--thinking">
        <span class="ws-dots"><span>.</span><span>.</span><span>.</span></span>
      </div>
      <div
        v-else
        class="ws-bubble"
        :class="{
          'ws-bubble--system': isSystem,
          'ws-bubble--user': isUser,
          'ws-bubble--streaming': streaming,
        }"
      >
        {{ text }}<span v-if="streaming" class="ws-cursor">▍</span>
      </div>
      <div v-if="relatedFiles?.length && !thinking" class="ws-files">
        <button
          v-for="f in relatedFiles"
          :key="f"
          type="button"
          class="ws-file-link"
          @click="$emit('openFile', f)"
        >
          更新：{{ f }}
        </button>
      </div>
    </div>
    <div
      v-if="isUser"
      class="ws-avatar ws-avatar--user"
      :class="{ 'ws-avatar--img': avatarUrl }"
      :style="avatarUrl ? undefined : { background: ui.color }"
      :title="`${displayNickname} · ${displayRoleTitle}`"
    >
      <img v-if="avatarUrl" :src="avatarUrl" alt="" />
      <span v-else>{{ avatarLetter }}</span>
    </div>
  </div>
</template>

<style scoped>
.ws-msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 88%;
}
.ws-msg--user {
  flex-direction: row;
  align-self: flex-end;
  margin-left: auto;
}
.ws-msg--user .ws-body {
  align-items: flex-end;
}
.ws-msg--user .ws-meta {
  flex-direction: row-reverse;
}
.ws-msg--system {
  max-width: 100%;
}
.ws-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.ws-avatar--img {
  background: var(--wc-muted-surface);
}
.ws-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ws-avatar--user {
  order: 2;
}
.ws-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.ws-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ws-nickname {
  font-size: 13px;
  font-weight: 600;
  color: var(--wc-text);
}
.ws-role-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--wc-muted-surface);
  color: var(--wc-text-muted);
  border: 1px solid var(--wc-border);
}
.ws-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  background: var(--wc-chat-box-bg);
  border: 1px solid var(--wc-chat-box-border);
  color: var(--wc-text);
  word-break: break-word;
}
.ws-bubble--user {
  background: var(--wc-accent);
  border-color: transparent;
  color: #fff;
}
.ws-bubble--system {
  background: transparent;
  border: none;
  color: var(--wc-text-dim);
  font-size: 12px;
  padding: 2px 0;
}
.ws-bubble--thinking {
  min-width: 52px;
}
.ws-bubble--streaming {
  white-space: pre-wrap;
}
.ws-cursor {
  animation: ws-blink 1s step-end infinite;
  opacity: 0.7;
}
@keyframes ws-blink {
  50% {
    opacity: 0;
  }
}
.ws-dots span {
  animation: ws-dot 1.2s infinite;
  opacity: 0.3;
}
.ws-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.ws-dots span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes ws-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}
.ws-files {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ws-file-link {
  font-size: 11px;
  color: var(--wc-accent);
  text-decoration: underline;
}
</style>
