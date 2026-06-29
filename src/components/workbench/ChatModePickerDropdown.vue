<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  CHAT_MODE_OPTIONS,
  canPickChatMode,
  chatModeIcon,
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
                  <span class="codicon" :class="`codicon-${m.icon}`" />
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
              <span
                v-if="m.id === activeModeId"
                class="codicon codicon-check check"
                aria-hidden="true"
              />
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
                <span class="codicon" :class="`codicon-${m.icon}`" />
              </span>
              <span class="mode-name">{{ m.label }}</span>
              <span
                v-if="m.id === activeModeId"
                class="codicon codicon-check check"
                aria-hidden="true"
              />
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
        <span class="codicon" :class="`codicon-${chatModeIcon(activeModeId)}`" />
      </span>
      <span class="trigger-label">{{ triggerLabel }}</span>
      <span class="codicon codicon-chevron-down chevron" aria-hidden="true" />
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
  font-size: 12px;
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

.mode-icon .codicon {
  font-size: 14px;
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
  font-size: 14px;
}

.mode-auto-plan {
  flex-shrink: 0;
}
</style>
