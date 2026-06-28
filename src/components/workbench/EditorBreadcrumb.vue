<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  projectRoot: string
  activePath: string | null
}>()

const emit = defineEmits<{
  navigate: [path: string]
}>()

const segments = computed(() => {
  const root = props.projectRoot.replace(/[/\\]+$/, '')
  const path = props.activePath
  if (!root || !path || !path.startsWith(root)) return []
  const rel = path.slice(root.length).replace(/^[/\\]+/, '')
  if (!rel) return [{ label: root.split(/[/\\]/).pop() || root, path: root }]
  const parts = rel.split(/[/\\]/)
  const out: { label: string; path: string }[] = []
  let acc = root
  const sep = root.includes('\\') ? '\\' : '/'
  for (const part of parts) {
    acc = acc.endsWith(sep) ? acc + part : acc + sep + part
    out.push({ label: part, path: acc })
  }
  return out
})
</script>

<template>
  <nav v-if="segments.length" class="breadcrumb">
    <template v-for="(seg, i) in segments" :key="seg.path">
      <span v-if="i > 0" class="sep">›</span>
      <button type="button" class="crumb" @click="emit('navigate', seg.path)">{{ seg.label }}</button>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 22px;
  font-size: 11px;
  background: var(--wc-panel);
  border-bottom: 1px solid var(--wc-border);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}

.crumb {
  color: var(--wc-text-muted);
  padding: 0 2px;
  border-radius: 3px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crumb:hover {
  color: var(--wc-text);
  background: var(--wc-hover);
}

.sep {
  color: var(--wc-text-dim);
  user-select: none;
}
</style>
