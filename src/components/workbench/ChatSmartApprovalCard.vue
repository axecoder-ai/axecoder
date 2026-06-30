<script setup lang="ts">
import type { AgentPendingSmartApproval } from '../../types/axecoder'

defineProps<{
  pending: AgentPendingSmartApproval
  busy?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  reject: []
}>()
</script>

<template>
  <div class="smart-card">
    <div class="smart-head">
      <span class="smart-tool">Smart Mode</span>
      <span class="smart-name">{{ pending.toolName }}</span>
      <span class="smart-hint">Auto-review flagged — approval required</span>
    </div>
    <p class="smart-reason">{{ pending.blockReason }}</p>
    <p v-if="pending.summary" class="smart-summary">{{ pending.summary }}</p>
    <pre class="smart-detail"><span class="io-label">DETAIL</span>{{ pending.detail }}</pre>
    <div class="smart-actions">
      <button type="button" class="btn-approve" :disabled="busy" @click="emit('confirm')">
        Approve
      </button>
      <button type="button" class="btn-reject" :disabled="busy" @click="emit('reject')">
        Reject
      </button>
    </div>
  </div>
</template>

<style scoped>
.smart-card {
  margin-top: 8px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  background: var(--wc-chat-box-bg);
  overflow: hidden;
}

.smart-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--wc-border);
}

.smart-tool {
  font-weight: 600;
  color: #e0af68;
}

.smart-name {
  color: var(--wc-accent, #7aa2f7);
  font-weight: 500;
}

.smart-hint {
  color: var(--wc-text-muted);
  margin-left: auto;
}

.smart-reason {
  margin: 0;
  padding: 8px 10px 0;
  font-size: 12px;
  color: var(--wc-text);
}

.smart-summary {
  margin: 4px 0 0;
  padding: 0 10px;
  font-size: 12px;
  color: var(--wc-text-muted);
}

.smart-detail {
  margin: 8px 0 0;
  padding: 10px;
  max-height: 160px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--wc-text);
}

.smart-actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px 10px;
}

.btn-approve {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #9ece6a;
  background: rgba(158, 206, 106, 0.15);
  color: var(--wc-text);
  cursor: pointer;
}

.btn-reject {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
  background: transparent;
  color: var(--wc-text-muted);
  cursor: pointer;
}

.io-label {
  display: block;
  font-size: 10px;
  color: var(--wc-text-muted);
  margin-bottom: 4px;
}
</style>
