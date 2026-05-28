<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SearchHit } from '../../types/writcraft'

defineProps<{
  visible: boolean
  projectName: string
}>()

const emit = defineEmits<{
  search: [query: string]
  open: [hit: SearchHit]
}>()

const query = ref('')
const hits = ref<SearchHit[]>([])
const searching = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
/** 用对象而非 Set，避免 Vue 对 Set.has 追踪不稳定导致展开区不刷新 */
const expandedFiles = ref<Record<string, boolean>>({})

type SearchFileGroup = {
  file: string
  fileName: string
  hits: SearchHit[]
}

const groups = computed((): SearchFileGroup[] => {
  const map = new Map<string, SearchHit[]>()
  for (const h of hits.value) {
    const list = map.get(h.file) ?? []
    list.push(h)
    map.set(h.file, list)
  }
  const out: SearchFileGroup[] = []
  for (const [file, fileHits] of map) {
    fileHits.sort((a, b) => a.line - b.line || a.col - b.col)
    out.push({
      file,
      fileName: file.split(/[/\\]/).pop() || file,
      hits: fileHits,
    })
  }
  out.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' }))
  return out
})

const fileKind = (name: string) => {
  const n = name.toLowerCase()
  if (n.endsWith('.md')) return 'kind-md'
  if (/\.(png|jpe?g|gif|webp|ico|svg)$/.test(n)) return 'kind-image'
  if (n.endsWith('.vue')) return 'kind-vue'
  if (n.endsWith('.ts')) return 'kind-ts'
  if (n.endsWith('.sh')) return 'kind-sh'
  return 'kind-file'
}

const isExpanded = (file: string) => !!expandedFiles.value[file]

const toggleFile = (file: string) => {
  if (expandedFiles.value[file]) {
    const next = { ...expandedFiles.value }
    delete next[file]
    expandedFiles.value = next
  } else {
    expandedFiles.value = { ...expandedFiles.value, [file]: true }
  }
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const highlightLine = (text: string, q: string) => {
  const raw = text.trim() || ' '
  const safe = escapeHtml(raw)
  const needle = q.trim()
  if (!needle) return safe
  const lower = raw.toLowerCase()
  const nLower = needle.toLowerCase()
  let out = ''
  let i = 0
  while (i < raw.length) {
    const idx = lower.indexOf(nLower, i)
    if (idx < 0) {
      out += escapeHtml(raw.slice(i))
      break
    }
    out += escapeHtml(raw.slice(i, idx))
    out += `<mark class="match-hl">${escapeHtml(raw.slice(idx, idx + needle.length))}</mark>`
    i = idx + needle.length
  }
  return out
}

const runSearch = async () => {
  searching.value = true
  try {
    emit('search', query.value)
  } finally {
    searching.value = false
  }
}

const setHits = (list: SearchHit[]) => {
  hits.value = list
  const exp: Record<string, boolean> = {}
  for (const h of list) exp[h.file] = true
  expandedFiles.value = exp
}

const focusInput = () => {
  searchInput.value?.focus()
}

defineExpose({ setHits, focusInput })
</script>

<template>
  <aside v-show="visible" class="search-panel">
    <div class="panel-header">
      <span class="panel-title">搜索</span>
      <span class="sub" :title="projectName">{{ projectName || '未打开项目' }}</span>
    </div>
    <div class="search-box">
      <input
        ref="searchInput"
        v-model="query"
        type="text"
        placeholder="在项目中搜索..."
        @keydown.enter="runSearch"
      />
      <button type="button" :disabled="searching" @click="runSearch">搜索</button>
    </div>
    <div class="results">
      <p v-if="!groups.length && query.trim()" class="empty">无结果</p>
      <section v-for="group in groups" :key="group.file" class="file-group">
        <button
          type="button"
          class="file-row"
          :title="group.file"
          @click="toggleFile(group.file)"
        >
          <span class="chevron" :class="{ open: isExpanded(group.file) }">›</span>
          <span class="file-icon" :class="fileKind(group.fileName)" />
          <span class="file-name">{{ group.fileName }}</span>
          <span class="match-badge">{{ group.hits.length }}</span>
        </button>
        <ul v-show="isExpanded(group.file)" class="match-list">
          <li
            v-for="(hit, i) in group.hits"
            :key="`${hit.line}:${hit.col}:${i}`"
            class="match-row"
            @click="emit('open', hit)"
          >
            <span class="match-loc">{{ hit.line }}</span>
            <span class="match-text" v-html="highlightLine(hit.text, query)" />
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.search-panel {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--wc-sidebar);
  min-height: 0;
}

.panel-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--wc-border);
  flex-shrink: 0;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--wc-text-muted);
}

.sub {
  display: block;
  font-size: 12px;
  margin-top: 4px;
  color: var(--wc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-box {
  display: flex;
  gap: 6px;
  padding: 8px;
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  font-size: 12px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  color: var(--wc-text);
}

.search-box button {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
  background: var(--wc-active);
  color: var(--wc-text);
}

.results {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.empty {
  padding: 12px;
  color: var(--wc-text-muted);
  font-size: 12px;
}

.file-group {
  margin: 0;
}

.file-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 4px;
  font-size: 13px;
  text-align: left;
  color: var(--wc-text);
  border: none;
  background: transparent;
  cursor: pointer;
}

.file-row:hover {
  background: var(--wc-hover);
}

.chevron {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
  font-size: 14px;
  color: var(--wc-text-muted);
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(90deg);
}

.file-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.file-icon.kind-file {
  background: var(--wc-text-muted);
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M4 1h6l4 4v10H4V1zm5 1v3h3'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-icon.kind-md {
  border-radius: 2px;
  background-color: #519aba;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='M8 11.5 4.5 8h7L8 11.5z'/%3E%3C/svg%3E");
  background-size: 10px 10px;
  background-position: center;
  background-repeat: no-repeat;
}

.file-icon.kind-ts {
  border-radius: 2px;
  background-color: #3178c6;
  mask: none;
  background-image: none;
  position: relative;
}

.file-icon.kind-ts::after {
  content: 'TS';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.file-icon.kind-sh {
  border-radius: 2px;
  background-color: #6b8e23;
  mask: none;
  background-image: none;
  position: relative;
}

.file-icon.kind-sh::after {
  content: '$';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
}

.file-icon.kind-image {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='2' y='5' width='7' height='7' rx='1' fill='none' stroke='%23a855f7' stroke-width='1'/%3E%3Crect x='5' y='2' width='7' height='7' rx='1' fill='%23252526' stroke='%23a855f7' stroke-width='1'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-icon.kind-vue {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%2342b883' d='M8 2.5L2 13h3.5l.5-1h4l.5 1H14L8 2.5zm0 3.2l2.8 5.3H5.2L8 5.7z'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--wc-search-badge-bg, var(--wc-accent));
  color: var(--wc-search-badge-fg, #fff);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

.match-list {
  list-style: none;
  margin: 0;
  padding: 0 0 2px;
}

.match-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 8px 2px 36px;
  font-size: 12px;
  font-family: var(--wc-font-mono);
  cursor: pointer;
  color: var(--wc-text-muted);
}

.match-loc {
  flex-shrink: 0;
  min-width: 2.5em;
  text-align: right;
  color: var(--wc-text-dim);
}

.match-row:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.match-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-text :deep(.match-hl) {
  background: var(--wc-search-match-bg, rgba(55, 148, 255, 0.28));
  color: var(--wc-text);
  border-radius: 2px;
  padding: 0 1px;
}
</style>
