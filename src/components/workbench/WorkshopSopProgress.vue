<script setup lang="ts">
import { computed } from 'vue'
import type { SopPipelinePhase } from '../../types/axecoder'
import { useI18n } from '../../i18n'

const props = defineProps<{
  phase?: SopPipelinePhase
}>()

const { t } = useI18n()

const stepDefs: { id: SopPipelinePhase; lite: string }[] = [
  { id: 'requirement', lite: '#60a5fa' },
  { id: 'prd', lite: '#a78bfa' },
  { id: 'design', lite: '#22d3ee' },
  { id: 'tasks', lite: '#fb923c' },
  { id: 'implement', lite: '#4ade80' },
  { id: 'qa', lite: '#facc15' },
  { id: 'done', lite: '#34d399' },
]

const steps = computed(() =>
  stepDefs.map((s) => ({
    ...s,
    label: t(`workshop.sopPhase.${s.id}`),
  })),
)

const current = computed(() => props.phase ?? 'idle')

const stepState = (id: SopPipelinePhase) => {
  const order = steps.value.map((s) => s.id)
  const cur = current.value === 'idle' ? 'requirement' : current.value
  const ci = order.indexOf(cur)
  const si = order.indexOf(id)
  if (si < ci) return 'done'
  if (si === ci) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="sop-progress" role="list" :aria-label="t('workshop.sopProgress')">
    <div
      v-for="s in steps"
      :key="s.id"
      class="sop-step"
      :class="stepState(s.id)"
      :style="{ '--lite': s.lite }"
      role="listitem"
    >
      <span class="dot" />
      <span class="label">{{ s.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.sop-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.25));
  font-size: 11px;
}
.sop-step {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted, #666);
}
.sop-step.done {
  color: var(--text-secondary, #aaa);
}
.sop-step.active {
  color: var(--text-primary, #eee);
  font-weight: 600;
}
.dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--lite) 28%, transparent);
  box-shadow: none;
  transition:
    background 0.25s,
    box-shadow 0.25s;
}
.sop-step.done .dot {
  background: var(--lite);
  box-shadow:
    0 0 4px color-mix(in srgb, var(--lite) 70%, transparent),
    0 0 8px color-mix(in srgb, var(--lite) 35%, transparent);
}
.sop-step.active .dot {
  background: var(--lite);
  box-shadow:
    0 0 4px var(--lite),
    0 0 10px color-mix(in srgb, var(--lite) 75%, transparent),
    0 0 18px color-mix(in srgb, var(--lite) 40%, transparent);
  animation: sop-lite-pulse 2.2s ease-in-out infinite;
}
.sop-step.active .label {
  text-shadow: 0 0 12px color-mix(in srgb, var(--lite) 45%, transparent);
}
@keyframes sop-lite-pulse {
  0%,
  100% {
    box-shadow:
      0 0 4px var(--lite),
      0 0 10px color-mix(in srgb, var(--lite) 75%, transparent),
      0 0 18px color-mix(in srgb, var(--lite) 40%, transparent);
  }
  50% {
    box-shadow:
      0 0 6px var(--lite),
      0 0 14px color-mix(in srgb, var(--lite) 90%, transparent),
      0 0 24px color-mix(in srgb, var(--lite) 55%, transparent);
  }
}
</style>
