<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import type { WorkshopMessageKind, WorkshopRoleId } from '../../types/axecoder'
import AgentProgressStream from './AgentProgressStream.vue'
import type { AgentProgressStep } from '../../utils/agent-progress'

const md = new MarkdownIt()
const renderMarkdown = (text: string) => md.render(text)

const props = defineProps<{
  roleId: WorkshopRoleId
  text: string
  reasoningContent?: string
  relatedFiles?: string[]
  messageKind?: WorkshopMessageKind
  thinking?: boolean
  streaming?: boolean
  avatarUrl?: string
  nickname?: string
  roleTitle?: string
  unbound?: boolean
  liveProgress?: {
    steps: AgentProgressStep[]
    streamText: string
  }
}>()

const isReasoningLegacy = computed(() => props.messageKind === 'reasoning')
const showLiveProgress = computed(
  () => !!props.liveProgress && (props.liveProgress.steps.length > 0 || props.liveProgress.streamText),
)
const showBody = computed(() => {
  if (isReasoningLegacy.value) return false
  if (showLiveProgress.value) return !!props.text.trim()
  return !!(props.text.trim() || props.streaming || props.thinking)
})

defineEmits<{
  openFile: [path: string]
}>()

const displayNickname = computed(() => {
  if (props.unbound) return 'Not configured'
  const n = props.nickname?.trim()
  if (n) return n
  if (props.roleId === 'system') return 'System'
  return 'Not configured'
})
const displayRoleTitle = computed(() => {
  if (props.unbound) return 'Not configured in Users'
  const t = props.roleTitle?.trim()
  if (t) return t
  if (props.roleId === 'system') return 'Collaboration assistant'
  return ''
})
const avatarLetter = computed(() => displayNickname.value.slice(0, 1) || '?')
const isUser = computed(() => props.roleId === 'user')
const isSystem = computed(() => props.roleId === 'system')
const useMarkdown = computed(
  () => !isUser.value && !isSystem.value && !props.streaming,
)
</script>

<template>
  <div class="ws-msg" :class="{ 'ws-msg--user': isUser, 'ws-msg--system': isSystem }">
    <div
      v-if="!isUser"
      class="ws-avatar"
      :class="{
        'ws-avatar--img': avatarUrl,
        'ws-avatar--system': isSystem,
      }"
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
      <div v-if="thinking && !showBody" class="ws-bubble ws-bubble--thinking">
        <span class="ws-dots"><span>.</span><span>.</span><span>.</span></span>
      </div>
      <div
        v-if="showBody"
        class="ws-bubble"
        :class="{
          'ws-bubble--system': isSystem,
          'ws-bubble--user': isUser,
          'ws-bubble--streaming': streaming,
        }"
      >
        <div v-if="useMarkdown" class="ws-md" v-html="renderMarkdown(text)" />
        <template v-else>
          {{ text }}<span v-if="streaming" class="ws-cursor">▍</span>
        </template>
      </div>
      <div v-if="showLiveProgress" class="ws-live-progress">
        <AgentProgressStream
          :steps="liveProgress!.steps"
          stream-text=""
          :subagent-tasks="[]"
          :agent-mode="true"
          fallback-headline="Running…"
        />
      </div>
      <div v-if="relatedFiles?.length && showBody" class="ws-files">
        <button
          v-for="f in relatedFiles"
          :key="f"
          type="button"
          class="ws-file-link"
          @click="$emit('openFile', f)"
        >
          Update: {{ f }}
        </button>
      </div>
    </div>
    <div
      v-if="isUser"
      class="ws-avatar ws-avatar--user"
      :class="{ 'ws-avatar--img': avatarUrl }"
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
.ws-avatar:not(.ws-avatar--img) {
  background: var(--wc-muted-surface);
  color: var(--wc-text);
  border: 1px solid var(--wc-border);
}
.ws-avatar--system:not(.ws-avatar--img) {
  color: var(--wc-text-muted);
}
.ws-avatar--user:not(.ws-avatar--img) {
  background: var(--wc-accent);
  color: #fff;
  border: none;
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
  gap: 8px;
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
  padding: 14px 14px;
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
.ws-reasoning {
  font-size: 12px;
  color: var(--wc-text-dim);
  border-left: 2px solid var(--wc-border);
  padding-left: 8px;
  max-width: 100%;
}
.ws-reasoning-toggle {
  background: none;
  border: none;
  color: var(--wc-text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  text-decoration: underline;
}
.ws-reasoning-body {
  margin: 6px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  max-height: 240px;
  overflow: auto;
}
.ws-live-progress {
  font-size: 12px;
  max-width: 100%;
  margin-top: 4px;
}
.ws-md {
  line-height: 1.6;
  overflow-x: auto;
}
.ws-md :deep(p) {
  margin: 0 0 0.6em;
}
.ws-md :deep(p:last-child) {
  margin-bottom: 0;
}
.ws-md :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  background: var(--wc-code-block-bg);
  border-radius: 8px;
  overflow-x: auto;
  font-family: var(--wc-font-mono);
  font-size: 12px;
}
.ws-md :deep(code) {
  font-family: var(--wc-font-mono);
  font-size: 12px;
}
.ws-md :deep(ul),
.ws-md :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.4em;
}
.ws-md :deep(h1),
.ws-md :deep(h2),
.ws-md :deep(h3),
.ws-md :deep(h4) {
  margin: 1em 0 0.5em;
  font-weight: 600;
  line-height: 1.35;
}
.ws-md :deep(h1) {
  font-size: 1.35em;
}
.ws-md :deep(h2) {
  font-size: 1.2em;
}
.ws-md :deep(h3) {
  font-size: 1.1em;
}
.ws-md :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
  font-size: 12px;
}
.ws-md :deep(th),
.ws-md :deep(td) {
  border: 1px solid var(--wc-border);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}
.ws-md :deep(th) {
  background: var(--wc-muted-surface);
  font-weight: 600;
}
.ws-md :deep(blockquote) {
  margin: 0.6em 0;
  padding: 0.2em 0 0.2em 12px;
  border-left: 3px solid var(--wc-border);
  color: var(--wc-text-muted);
}
.ws-md :deep(hr) {
  margin: 1em 0;
  border: none;
  border-top: 1px solid var(--wc-border);
}
.ws-md :deep(a) {
  color: var(--wc-accent, #4a9eff);
  text-decoration: none;
}
.ws-md :deep(a:hover) {
  text-decoration: underline;
}
.ws-md :deep(:not(pre) > code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--wc-code-block-bg);
}
.ws-md :deep(pre code) {
  padding: 0;
  background: transparent;
}
</style>
