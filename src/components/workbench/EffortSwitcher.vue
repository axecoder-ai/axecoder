<script setup lang="ts">
import { ref } from 'vue'
import {
  REASONING_EFFORT_LEVELS,
  effortLabel,
  type ReasoningEffortLevel,
} from '../../utils/chat-effort'

const props = defineProps<{
  modelValue: ReasoningEffortLevel
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [level: ReasoningEffortLevel]
}>()

const open = ref(false)

const pick = (level: ReasoningEffortLevel) => {
  open.value = false
  emit('update:modelValue', level)
}
</script>

<template>
  <div class="effort-sw" :class="{ open }">
    <button
      type="button"
      class="effort-sw-trigger"
      :class="{ explicit: modelValue !== 'auto' }"
      :disabled="disabled"
      :title="'推理力度 /effort'"
      @click="open = !open"
    >
      <span class="effort-sw-label">{{ effortLabel(modelValue) }}</span>
      <span class="effort-sw-caret">▾</span>
    </button>
    <div v-if="open" class="effort-sw-menu" @mouseleave="open = false">
      <button
        v-for="lvl in REASONING_EFFORT_LEVELS"
        :key="lvl"
        type="button"
        class="effort-sw-item"
        :class="{ current: lvl === modelValue }"
        @click="pick(lvl)"
      >
        {{ effortLabel(lvl) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.effort-sw {
  position: relative;
}

.effort-sw-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  background: var(--wc-surface);
  color: var(--wc-text-muted);
  font-size: 11px;
  cursor: pointer;
}

.effort-sw-trigger.explicit {
  color: var(--wc-accent);
  border-color: var(--wc-accent-dim, var(--wc-border));
}

.effort-sw-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.effort-sw-caret {
  font-size: 9px;
  opacity: 0.7;
}

.effort-sw-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  right: 0;
  min-width: 100px;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 20;
  padding: 4px 0;
}

.effort-sw-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 12px;
  color: var(--wc-text);
  cursor: pointer;
}

.effort-sw-item:hover,
.effort-sw-item.current {
  background: var(--wc-muted-surface);
}
</style>
