<script setup lang="ts">
import { computed } from 'vue'
import type { AgentPendingPlan } from '../../types/axecoder'
import {
  extractPlanSteps,
  initialPlanStepStatuses,
  type PlanStepStatus,
} from '../../utils/plan-steps'

const props = defineProps<{
  pending: AgentPendingPlan
  busy?: boolean
  building?: boolean
  built?: boolean
  stepStatuses?: PlanStepStatus[]
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const steps = computed(() => extractPlanSteps(props.pending))

const statuses = computed(() => {
  if (props.stepStatuses?.length) return props.stepStatuses
  return initialPlanStepStatuses(steps.value.length)
})

const showActions = computed(() => !props.building && !props.built)
const showBody = computed(() => steps.value.length === 0)
</script>

<template>
  <div class="plan-card" :class="{ building, built }">
    <div class="plan-head">Implementation plan</div>
    <h4 class="plan-title">{{ pending.name }}</h4>
    <p v-if="pending.overview" class="plan-overview">{{ pending.overview }}</p>

    <ul v-if="steps.length" class="plan-steps">
      <li
        v-for="(step, i) in steps"
        :key="step.id"
        class="plan-step"
        :class="statuses[i] ?? 'pending'"
      >
        <span class="step-indicator" aria-hidden="true">
          <span v-if="statuses[i] === 'completed'" class="step-check">✓</span>
          <span v-else-if="statuses[i] === 'in_progress'" class="step-spinner" />
        </span>
        <span class="step-label">{{ step.label }}</span>
      </li>
    </ul>

    <pre v-if="showBody" class="plan-body">{{ pending.plan }}</pre>
    <p v-if="pending.filePath" class="plan-path">Saved to {{ pending.filePath }}</p>

    <div v-if="showActions" class="plan-actions">
      <button type="button" class="btn-dismiss" :disabled="busy" @click="emit('dismiss')">
        Dismiss
      </button>
    </div>
  </div>
</template>

<style scoped>
.plan-card {
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-subtle, #3a3a3a);
  border-radius: 10px;
  background: var(--bg-elevated, #1e1e1e);
}
.plan-card.building {
  border-color: rgba(233, 183, 112, 0.35);
}
.plan-head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
  margin-bottom: 6px;
}
.plan-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}
.plan-overview {
  margin: 0 0 10px;
  font-size: 13px;
  opacity: 0.88;
  line-height: 1.45;
}
.plan-steps {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plan-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.4;
}
.step-indicator {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.plan-step.in_progress .step-indicator {
  border-color: #e9b770;
  border-top-color: transparent;
  animation: plan-spin 0.75s linear infinite;
}
.plan-step.completed .step-indicator {
  border-color: #e9b770;
  background: rgba(233, 183, 112, 0.15);
}
.step-check {
  font-size: 10px;
  font-weight: 700;
  color: #e9b770;
  line-height: 1;
}
.step-spinner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e9b770;
  opacity: 0.85;
}
.step-label {
  flex: 1;
  min-width: 0;
}
.plan-step.completed .step-label {
  text-decoration: line-through;
  opacity: 0.55;
}
.plan-step.in_progress .step-label {
  color: #e9b770;
}
.plan-body {
  margin: 0 0 8px;
  padding: 8px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  background: var(--bg-base, #141414);
  border-radius: 4px;
}
.plan-path {
  margin: 0 0 8px;
  font-size: 11px;
  opacity: 0.65;
}
.plan-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.btn-dismiss {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, #444);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.btn-dismiss:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@keyframes plan-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
