<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AgentTurnFileChange } from '../../types/axecoder'

const props = defineProps<{
  files: AgentTurnFileChange[]
  projectRoot: string
  busy?: boolean
  relativePath: (absPath: string) => string
}>()

const emit = defineEmits<{
  review: [file: AgentTurnFileChange]
  openFile: [filePath: string]
  undoAll: []
  dismiss: [filePath: string]
}>()

const expanded = ref(true)

const fileCountLabel = computed(() => {
  const n = props.files.length
  return n === 1 ? '1 File' : `${n} Files`
})

const statsLabel = (f: AgentTurnFileChange) => {
  const parts: string[] = []
  if (f.additions > 0) parts.push(`+${f.additions}`)
  if (f.deletions > 0) parts.push(`-${f.deletions}`)
  return parts.join(' ') || '0'
}
</script>

<template>
  <div class="turn-changes-bar">
    <div class="turn-changes-header">
      <button type="button" class="turn-changes-toggle" @click="expanded = !expanded">
        <span class="codicon" :class="expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
        <span class="turn-changes-count">{{ fileCountLabel }}</span>
      </button>
      <div class="turn-changes-actions">
        <button type="button" class="btn-undo" :disabled="busy" @click="emit('undoAll')">
          Undo All
        </button>
        <button
          type="button"
          class="btn-review"
          :disabled="busy || !files.length"
          @click="emit('review', files[0]!)"
        >
          Review
        </button>
      </div>
    </div>
    <div v-if="expanded" class="turn-changes-list">
      <div v-for="f in files" :key="f.filePath" class="turn-changes-row">
        <button
          type="button"
          class="turn-changes-file"
          :title="relativePath(f.filePath)"
          @click="emit('openFile', f.filePath)"
        >
          <span class="turn-changes-file-name">{{ relativePath(f.filePath) }}</span>
          <span class="turn-changes-stats">
            <span v-if="f.additions > 0" class="stat-add">{{ `+${f.additions}` }}</span>
            <span v-if="f.deletions > 0" class="stat-del">{{ `-${f.deletions}` }}</span>
            <span v-if="!f.additions && !f.deletions" class="stat-neutral">{{ statsLabel(f) }}</span>
          </span>
        </button>
        <button
          type="button"
          class="btn-diff"
          title="Open diff"
          :disabled="busy"
          @click="emit('review', f)"
        >
          <span class="codicon codicon-diff" />
        </button>
        <button
          type="button"
          class="btn-dismiss"
          title="Remove from list"
          :disabled="busy"
          @click="emit('dismiss', f.filePath)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.turn-changes-bar {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--wc-chat-box-border, var(--wc-border));
  flex-shrink: 0;
}

.turn-changes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 4px;
}

.turn-changes-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  color: var(--wc-text-muted);
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
}

.turn-changes-toggle:hover {
  color: var(--wc-text);
  background: var(--wc-muted-surface, rgba(255, 255, 255, 0.04));
}

.turn-changes-toggle .codicon {
  font-size: 11px;
}

.turn-changes-count {
  font-weight: 600;
  white-space: nowrap;
}

.turn-changes-list {
  display: flex;
  flex-direction: column;
  padding: 0 4px 6px;
  gap: 1px;
}

.turn-changes-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  border-radius: 4px;
}

.turn-changes-row:hover {
  background: var(--wc-hover, rgba(255, 255, 255, 0.04));
}

.turn-changes-file {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  min-width: 0;
}

.turn-changes-file-name {
  font-size: 12px;
  color: var(--wc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--wc-mono, ui-monospace, monospace);
}

.turn-changes-stats {
  display: flex;
  gap: 4px;
  font-size: 11px;
  flex-shrink: 0;
  font-family: var(--wc-mono, ui-monospace, monospace);
  font-weight: 500;
}

.stat-add {
  color: #3fb950;
}

.stat-del {
  color: #f85149;
}

.stat-neutral {
  color: var(--wc-text-dim);
}

.turn-changes-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-undo {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--wc-text-muted);
  cursor: pointer;
}

.btn-review {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  background: var(--wc-accent, #4a9eff);
  color: #fff;
  cursor: pointer;
}

.btn-undo:hover:not(:disabled) {
  color: var(--wc-text);
  background: var(--wc-muted-surface, rgba(255, 255, 255, 0.06));
}

.btn-review:hover:not(:disabled) {
  filter: brightness(1.08);
}

.btn-diff,
.btn-dismiss {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--wc-text-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-diff .codicon {
  font-size: 14px;
}

.turn-changes-row:hover .btn-diff,
.turn-changes-row:hover .btn-dismiss {
  opacity: 1;
}

.btn-diff:hover:not(:disabled),
.btn-dismiss:hover:not(:disabled) {
  background: var(--wc-hover, rgba(255, 255, 255, 0.08));
  color: var(--wc-text);
}

.btn-undo:disabled,
.btn-review:disabled,
.btn-diff:disabled,
.btn-dismiss:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
