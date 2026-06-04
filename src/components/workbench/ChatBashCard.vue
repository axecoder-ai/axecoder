<script setup lang="ts">
import type { AgentPendingBash } from '../../types/axecoder'

defineProps<{
  pending: AgentPendingBash
  busy?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  reject: []
}>()
</script>

<template>
  <div class="bash-card">
    <div class="bash-head">
      <span class="bash-tool">Bash</span>
      <span v-if="pending.description" class="bash-desc">{{ pending.description }}</span>
      <span class="bash-hint">{{
        pending.runInBackground ? 'Pending (background)' : 'Pending execution'
      }}</span>
    </div>
    <pre class="bash-command">{{ pending.command }}</pre>
    <div class="bash-actions">
      <button type="button" class="btn-run" :disabled="busy" @click="emit('confirm')">
        Run
      </button>
      <button type="button" class="btn-reject" :disabled="busy" @click="emit('reject')">
        Reject
      </button>
    </div>
  </div>
</template>

<style scoped>
.bash-card {
  margin-top: 8px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  background: var(--wc-chat-box-bg);
  overflow: hidden;
}

.bash-head {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--wc-border);
}

.bash-tool {
  font-weight: 600;
  color: var(--wc-accent, #7aa2f7);
}

.bash-desc {
  color: var(--wc-text);
  font-weight: 500;
}

.bash-hint {
  color: var(--wc-text-muted);
  margin-left: auto;
}

.bash-command {
  margin: 0;
  padding: 10px;
  max-height: 160px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--wc-text);
}

.bash-actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--wc-border);
}

.btn-run {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  background: var(--wc-accent, #7aa2f7);
  color: #fff;
  cursor: pointer;
}

.btn-reject {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--wc-border);
  background: transparent;
  color: var(--wc-text);
  cursor: pointer;
}

.btn-run:disabled,
.btn-reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
