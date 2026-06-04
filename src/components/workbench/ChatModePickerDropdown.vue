<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  CHAT_MODE_OPTIONS,
  chatModeLabel,
  type ChatModeId,
} from '../../utils/chat-modes'

const props = defineProps<{
  activeModeId: ChatModeId
}>()

const emit = defineEmits<{
  select: [id: ChatModeId]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const popoverLeft = ref(0)
const popoverBottom = ref(0)
const POPOVER_W = 240

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

const pick = (id: ChatModeId) => {
  emit('select', id)
  open.value = false
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
            <button type="button" class="mode-row" @click="pick(m.id)">
              <span class="mode-text">
                <span class="mode-name">{{ m.label }}</span>
                <span class="mode-desc">{{ m.description }}</span>
              </span>
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
      <svg class="agent-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          d="M4.5 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z M8 8c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4-1.5 4-3.5 4-3.5-1.5-3.5-4z"
        />
      </svg>
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
  max-width: 160px;
}

.trigger:hover,
.trigger.open {
  color: var(--wc-text);
  background: var(--wc-muted-surface-strong, var(--wc-muted-surface));
}

.agent-icon {
  flex-shrink: 0;
  opacity: 0.85;
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
  width: 240px;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 10000;
  overflow: hidden;
}

.mode-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 320px;
  overflow-y: auto;
}

.mode-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
}

.mode-row:hover {
  background: var(--wc-hover);
}

.mode-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mode-name {
  font-size: 13px;
  color: var(--wc-text);
}

.mode-desc {
  font-size: 11px;
  line-height: 1.35;
  color: var(--wc-text-dim);
}

.check {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--wc-text);
}
</style>
