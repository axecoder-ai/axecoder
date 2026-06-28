<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import { fuzzyFilterPaths, fuzzyScore } from '../../utils/quick-open-fuzzy'

export type QuickOpenItem = {
  label: string
  path: string
  line?: number
  col?: number
  kind: 'file' | 'symbol'
}

const props = defineProps<{
  visible: boolean
  paths: string[]
  projectRoot?: string
  recentFiles?: string[]
}>()

const emit = defineEmits<{
  close: []
  open: [relPath: string, line?: number, col?: number]
}>()

const { t } = useI18n()
const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const symbolItems = ref<QuickOpenItem[]>([])

const parseFileLineCol = (q: string): { filePart: string; line?: number; col?: number } => {
  const m = q.match(/^(.+?):(\d+)(?::(\d+))?$/)
  if (!m) return { filePart: q }
  return {
    filePart: m[1]!,
    line: Number(m[2]),
    col: m[3] ? Number(m[3]) : 1,
  }
}

const filtered = computed((): QuickOpenItem[] => {
  const raw = query.value.trim()
  if (!raw) {
    const recent = (props.recentFiles ?? []).slice(0, 8)
    return recent.map((p) => ({ label: p, path: p, kind: 'file' as const }))
  }
  if (raw.startsWith('@')) {
    return symbolItems.value
  }
  const { filePart, line, col } = parseFileLineCol(raw)
  const paths = fuzzyFilterPaths(filePart, props.paths, 50)
  const recentSet = new Set(props.recentFiles ?? [])
  const scored = paths.map((p) => {
    let score = fuzzyScore(filePart, p)
    if (recentSet.has(p)) score += 200
    return { label: line ? `${p}:${line}${col && col > 1 ? `:${col}` : ''}` : p, path: p, line, col, kind: 'file' as const, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map(({ label, path, line: ln, col: cl, kind }) => ({ label, path, line: ln, col: cl, kind }))
})

watch(query, async (q) => {
  if (!q.trim().startsWith('@') || !props.projectRoot) {
    symbolItems.value = []
    return
  }
  const symQ = q.trim().slice(1)
  const res = await window.axecoder.lspWorkspaceSymbol(props.projectRoot, symQ)
  const list = (res.result ?? []) as { name?: string; location?: { uri?: string; range?: { start?: { line?: number; character?: number } } } }[]
  symbolItems.value = list.slice(0, 40).map((s) => {
    const uri = s.location?.uri?.replace(/^file:\/\//, '') ?? ''
    const rel = uri.startsWith(props.projectRoot!)
      ? uri.slice(props.projectRoot!.length).replace(/^[/\\]+/, '')
      : uri
    const line = (s.location?.range?.start?.line ?? 0) + 1
    const col = (s.location?.range?.start?.character ?? 0) + 1
    return { label: `${s.name ?? 'symbol'} — ${rel}:${line}`, path: rel, line, col, kind: 'symbol' as const }
  })
})

watch(
  () => props.visible,
  (v) => {
    if (v) {
      query.value = ''
      selected.value = 0
      symbolItems.value = []
      nextTick(() => inputRef.value?.focus())
    }
  },
)

watch(filtered, () => {
  selected.value = 0
})

const runSelected = () => {
  const item = filtered.value[selected.value]
  if (!item) return
  emit('open', item.path, item.line, item.col)
  emit('close')
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selected.value = Math.min(selected.value + 1, filtered.value.length - 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selected.value = Math.max(selected.value - 1, 0)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    runSelected()
  }
}
</script>

<template>
  <div v-if="visible" class="palette-backdrop" @click.self="emit('close')">
    <div class="palette" @keydown="onKeydown">
      <input
        ref="inputRef"
        v-model="query"
        class="palette-input"
        :placeholder="t('quickOpen.placeholder')"
        @keydown="onKeydown"
      />
      <ul class="palette-list">
        <li
          v-for="(item, i) in filtered"
          :key="`${item.kind}:${item.path}:${item.line}:${i}`"
          :class="{ selected: i === selected }"
          @click="selected = i; runSelected()"
        >
          <span class="path">{{ item.label }}</span>
          <span v-if="item.kind === 'symbol'" class="sym-tag">@</span>
        </li>
        <li v-if="!filtered.length" class="empty">{{ t('quickOpen.empty') }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  padding-top: 80px;
  z-index: 200;
}

.palette {
  width: 560px;
  max-height: 420px;
  background: var(--wc-bg-dark);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--wc-border);
  background: var(--wc-input-bg);
}

.palette-list {
  list-style: none;
  overflow: auto;
  max-height: 340px;
}

.palette-list li {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.palette-list li.selected,
.palette-list li:hover {
  background: var(--wc-active);
}

.path {
  font-family: var(--wc-font-mono);
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sym-tag {
  font-size: 10px;
  color: var(--wc-accent);
  flex-shrink: 0;
}

.empty {
  color: var(--wc-text-muted);
  cursor: default;
}
</style>
