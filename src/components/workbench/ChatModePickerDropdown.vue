<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  CHAT_MODE_OPTIONS,
  canPickChatMode,
  chatModeLabel,
  type ChatModeId,
} from '../../utils/chat-modes'
import SwitchToggle from './SwitchToggle.vue'

const props = defineProps<{
  activeModeId: ChatModeId
  /** 当前 Agent/Workshop 会话是否已有消息（有则锁定 multi-agent 互切） */
  hasSessionMessages?: boolean
  /** Agent 自动规划（settings.agentAutoPlan） */
  agentAutoPlanOn?: boolean
}>()

const emit = defineEmits<{
  select: [id: ChatModeId]
  'toggle-auto-plan': [on: boolean]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const popoverLeft = ref(0)
const popoverBottom = ref(0)
const POPOVER_W = 200

const triggerLabel = computed(() => chatModeLabel(props.activeModeId))

const syncPopoverPos = () => {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - POPOVER_W - 8
  popoverLeft.value = Math.max(8, Math.min(r.left, maxLeft))
  popoverBottom.value = window.innerHeight - r.top + 8
}

const toggle = () => {
  open.value = !open.value
  if (open.value) void nextTick(syncPopoverPos)
}

watch(open, (v) => {
  if (v) void nextTick(syncPopoverPos)
})

const isModeDisabled = (id: ChatModeId) =>
  !canPickChatMode(props.activeModeId, id, !!props.hasSessionMessages)

const pick = (id: ChatModeId) => {
  if (isModeDisabled(id)) return
  emit('select', id)
  open.value = false
}

const onAutoPlanToggle = (on: boolean) => {
  emit('toggle-auto-plan', on)
}

const onDocClick = (e: MouseEvent) => {
  if (!open.value) return
  const t = e.target as Node
  if (rootRef.value?.contains(t)) return
  if (popoverRef.value?.contains(t)) return
  open.value = false
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) open.value = false
}

const onResize = () => {
  if (open.value) syncPopoverPos()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="rootRef" class="picker-root">
    <Teleport to="body">
      <div
        v-if="open"
        ref="popoverRef"
        class="popover"
        :style="{ left: `${popoverLeft}px`, bottom: `${popoverBottom}px` }"
      >
        <ul class="mode-list">
          <li v-for="m in CHAT_MODE_OPTIONS" :key="m.id">
            <div
              v-if="m.id === 'agent'"
              class="mode-row mode-row--agent"
              :class="{ active: m.id === activeModeId }"
            >
              <button
                type="button"
                class="mode-row-main"
                :disabled="isModeDisabled(m.id)"
                :title="m.label"
                @click="pick(m.id)"
              >
                <span class="mode-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="14" height="14">
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.2"
                      d="M4.5 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z M8 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z"
                    />
                  </svg>
                </span>
                <span class="mode-name">{{ m.label }}</span>
              </button>
              <SwitchToggle
                class="mode-auto-plan"
                compact
                :model-value="!!agentAutoPlanOn"
                title="Auto Plan: complex tasks auto-enter read-only plan mode"
                @update:model-value="onAutoPlanToggle"
              />
              <svg
                v-if="m.id === activeModeId"
                class="check"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                />
              </svg>
            </div>
            <button
              v-else
              type="button"
              class="mode-row"
              :class="{ disabled: isModeDisabled(m.id), active: m.id === activeModeId }"
              :disabled="isModeDisabled(m.id)"
              :title="
                isModeDisabled(m.id)
                  ? 'Cannot change Multi-Agent mode after messages in this session'
                  : m.label
              "
              @click="pick(m.id)"
            >
              <span class="mode-icon" aria-hidden="true">
                <!-- Plan -->
                <svg v-if="m.id === 'plan'" viewBox="0 0 16 16" width="14" height="14">
                  <path
                    fill="currentColor"
                    d="M2.5 4.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm0 3.5a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm0 3.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75z"
                  />
                </svg>
                <!-- Draw.IO -->
                <svg v-else-if="m.id === 'draw-io'" viewBox="0 0 16 16" width="14" height="14">
                  <rect x="2" y="3" width="4" height="3.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <rect x="10" y="3" width="4" height="3.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <rect x="6" y="10" width="4" height="3.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <path fill="none" stroke="currentColor" stroke-width="1.2" d="M6 5h4 M8 6.5v3" />
                </svg>
                <!-- Multi-Agent -->
                <svg v-else-if="m.id === 'multi-agent'" viewBox="0 0 16 16" width="14" height="14">
                  <circle cx="5.5" cy="6" r="2.25" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <circle cx="10.5" cy="6" r="2.25" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    d="M2.5 13c0-1.8 1.3-3 3-3s3 1.2 3 3M7.5 13c0-1.8 1.3-3 3-3s3 1.2 3 3"
                  />
                </svg>
                <!-- Software Co. -->
                <svg v-else-if="m.id === 'software-company'" viewBox="0 0 16 16" width="14" height="14">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linejoin="round"
                    d="M4 13V7l4-2.5L12 7v6M4 13h8M6.5 13V10h1v3M8.5 13V10h1v3"
                  />
                </svg>
              </span>
              <span class="mode-name">{{ m.label }}</span>
              <svg
                v-if="m.id === activeModeId"
                class="check"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
    <button
      ref="triggerRef"
      type="button"
      class="trigger"
      :class="{ open }"
      :title="`Chat mode: ${triggerLabel}`"
      @click="toggle"
    >
      <span class="mode-icon trigger-icon" aria-hidden="true">
        <svg v-if="activeModeId === 'agent' || activeModeId === 'auto-plan'" viewBox="0 0 16 16" width="14" height="14">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            d="M4.5 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z M8 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z"
          />
        </svg>
        <svg v-else-if="activeModeId === 'plan' || activeModeId === 'planning'" viewBox="0 0 16 16" width="14" height="14">
          <path
            fill="currentColor"
            d="M2.5 4.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm0 3.5a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm0 3.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75z"
          />
        </svg>
        <svg v-else-if="activeModeId === 'draw-io'" viewBox="0 0 16 16" width="14" height="14">
          <rect x="2" y="3" width="4" height="3.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
          <rect x="10" y="3" width="4" height="3.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
          <rect x="6" y="10" width="4" height="3.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path fill="none" stroke="currentColor" stroke-width="1.2" d="M6 5h4 M8 6.5v3" />
        </svg>
        <svg v-else-if="activeModeId === 'multi-agent'" viewBox="0 0 16 16" width="14" height="14">
          <circle cx="5.5" cy="6" r="2.25" fill="none" stroke="currentColor" stroke-width="1.2" />
          <circle cx="10.5" cy="6" r="2.25" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path fill="none" stroke="currentColor" stroke-width="1.2" d="M2.5 13c0-1.8 1.3-3 3-3s3 1.2 3 3M7.5 13c0-1.8 1.3-3 3-3s3 1.2 3 3" />
        </svg>
        <svg v-else-if="activeModeId === 'software-company'" viewBox="0 0 16 16" width="14" height="14">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
            d="M4 13V7l4-2.5L12 7v6M4 13h8M6.5 13V10h1v3M8.5 13V10h1v3"
          />
        </svg>
      </span>
      <span class="trigger-label">{{ triggerLabel }}</span>
      <svg class="chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.427 6.427a.75.75 0 0 1 1.06-.02L8 8.88l2.513-2.473a.75.75 0 1 1 1.04 1.08l-3.02 2.96a.75.75 0 0 1-1.04 0l-3.02-2.96a.75.75 0 0 1-.02-1.06z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.picker-root {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  margin: 0;
  border: none;
  background: var(--wc-muted-surface);
  color: var(--wc-text-muted);
  font-size: 12px;
  line-height: 1.4;
  border-radius: 6px;
  cursor: pointer;
  max-width: 140px;
}

.trigger:hover,
.trigger.open {
  color: var(--wc-text);
  background: var(--wc-muted-surface-strong, var(--wc-muted-surface));
}

.trigger-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex-shrink: 0;
  opacity: 0.65;
}

.trigger.open .chevron {
  transform: rotate(180deg);
}

.popover {
  position: fixed;
  width: 200px;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 10000;
  overflow: hidden;
  padding: 4px;
}

.mode-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--wc-text);
}

.mode-row--agent {
  padding: 0 4px 0 0;
  gap: 4px;
}

.mode-row--agent:hover {
  background: var(--wc-hover);
}

.mode-row--agent.active {
  background: var(--wc-hover);
}

.mode-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 6px 4px 6px 8px;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
}

.mode-row-main:hover:not(:disabled) {
  background: var(--wc-hover);
}

.mode-row-main:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mode-row:hover:not(:disabled) {
  background: var(--wc-hover);
}

.mode-row.active {
  background: var(--wc-hover);
}

.mode-row.disabled,
.mode-row:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mode-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.85;
}

.mode-name {
  flex: 1;
  font-size: 13px;
  line-height: 1.2;
  min-width: 0;
}

.check {
  flex-shrink: 0;
  opacity: 0.9;
}

.mode-auto-plan {
  flex-shrink: 0;
}
</style>
