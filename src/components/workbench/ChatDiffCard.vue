<script setup lang="ts">
import { computed } from 'vue'
import type { AgentPendingWrite } from '../../types/axecoder'

const props = defineProps<{
  pending: AgentPendingWrite
  busy?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  reject: []
}>()

const diffLines = computed(() => {
  const text = props.pending.patchText ?? ''
  if (!text.trim()) return [] as string[]
  return text.split(/\r?\n/)
})

const lineClass = (line: string) => {
  if (line.startsWith('@@')) return 'diff-line diff-hunk'
  if (line.startsWith('---') || line.startsWith('+++')) return 'diff-line diff-meta'
  if (line.startsWith('+')) return 'diff-line diff-add'
  if (line.startsWith('-')) return 'diff-line diff-del'
  return 'diff-line diff-ctx'
}
</script>

<template>
  <div class="diff-card">
    <div class="diff-head">
      <span class="diff-tool">{{ pending.tool }}</span>
      <span class="diff-summary">{{ pending.summary }}</span>
    </div>
    <div class="diff-body">
      <div v-for="(line, i) in diffLines" :key="i" :class="lineClass(line)">
        {{ line === '' ? ' ' : line }}
      </div>
    </div>
    <div class="diff-actions">
      <button type="button" class="btn-apply" :disabled="busy" @click="emit('confirm')">
        Apply
      </button>
      <button type="button" class="btn-reject" :disabled="busy" @click="emit('reject')">
        Reject
      </button>
    </div>
  </div>
</template>

<style scoped>
.diff-card {
  margin-top: 8px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  background: var(--wc-chat-box-bg);
  overflow: hidden;
}

.diff-head {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--wc-border);
}

.diff-tool {
  font-weight: 600;
  color: var(--wc-accent, #7aa2f7);
}

.diff-summary {
  color: var(--wc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diff-body {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
}

.diff-line {
  padding: 0 10px;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-ctx {
  color: var(--wc-text);
  background: transparent;
}

.diff-add {
  color: #7ee787;
  background: rgba(46, 160, 67, 0.2);
}

.diff-del {
  color: #ff7b72;
  background: rgba(248, 81, 73, 0.2);
}

.diff-hunk {
  color: var(--wc-accent, #7aa2f7);
  background: rgba(122, 162, 247, 0.08);
}

.diff-meta {
  color: var(--wc-text-muted);
  background: transparent;
}

.diff-actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--wc-border);
}

.btn-apply,
.btn-reject {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.btn-apply {
  background: var(--wc-accent, #7aa2f7);
  color: #fff;
}

.btn-apply:disabled,
.btn-reject:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-reject {
  background: transparent;
  border: 1px solid var(--wc-border);
  color: var(--wc-text-muted);
}
</style>
