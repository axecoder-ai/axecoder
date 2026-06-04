<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AgentPendingAskUser } from '../../types/axecoder'

const props = defineProps<{
  pending: AgentPendingAskUser
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [answers: Record<string, string | string[]>]
}>()

const single = ref<Record<string, string>>({})
const multi = ref<Record<string, string[]>>({})

const canSubmit = computed(() =>
  props.pending.questions.every((q) => {
    if (q.allow_multiple) {
      return (multi.value[q.id]?.length ?? 0) > 0
    }
    return !!single.value[q.id]
  }),
)

const toggleMulti = (questionId: string, optionId: string) => {
  const cur = multi.value[questionId] ?? []
  if (cur.includes(optionId)) {
    multi.value[questionId] = cur.filter((id) => id !== optionId)
  } else {
    multi.value[questionId] = [...cur, optionId]
  }
}

const onSubmit = () => {
  const answers: Record<string, string | string[]> = {}
  for (const q of props.pending.questions) {
    if (q.allow_multiple) {
      answers[q.id] = [...(multi.value[q.id] ?? [])]
    } else {
      answers[q.id] = single.value[q.id] ?? ''
    }
  }
  emit('submit', answers)
}
</script>

<template>
  <div class="ask-card">
    <div class="ask-head">Your input needed</div>
    <div v-for="q in pending.questions" :key="q.id" class="ask-block">
      <p class="ask-prompt">{{ q.prompt }}</p>
      <div v-if="q.allow_multiple" class="ask-options">
        <label v-for="opt in q.options" :key="opt.id" class="ask-option">
          <input
            type="checkbox"
            :disabled="busy"
            :checked="(multi[q.id] ?? []).includes(opt.id)"
            @change="toggleMulti(q.id, opt.id)"
          />
          <span>{{ opt.label }}</span>
        </label>
      </div>
      <div v-else class="ask-options">
        <label v-for="opt in q.options" :key="opt.id" class="ask-option">
          <input
            v-model="single[q.id]"
            type="radio"
            :name="`ask-${pending.id}-${q.id}`"
            :value="opt.id"
            :disabled="busy"
          />
          <span>{{ opt.label }}</span>
        </label>
      </div>
    </div>
    <div class="ask-actions">
      <button type="button" class="btn-submit" :disabled="busy || !canSubmit" @click="onSubmit">
        Submit
      </button>
    </div>
  </div>
</template>

<style scoped>
.ask-card {
  margin-top: 8px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  background: var(--wc-chat-box-bg);
  overflow: hidden;
}

.ask-head {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--wc-border);
  color: var(--wc-accent, #7aa2f7);
}

.ask-block {
  padding: 10px;
  border-bottom: 1px solid var(--wc-border);
}

.ask-block:last-of-type {
  border-bottom: none;
}

.ask-prompt {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--wc-text);
}

.ask-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ask-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--wc-text);
  cursor: pointer;
}

.ask-actions {
  padding: 8px 10px;
  border-top: 1px solid var(--wc-border);
}

.btn-submit {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  background: var(--wc-accent, #7aa2f7);
  color: #fff;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
