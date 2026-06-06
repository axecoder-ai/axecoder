<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '../../i18n'
import type { SearchHit, SearchOptions } from '../../types/axecoder'

defineProps<{
  visible: boolean
  projectName: string
}>()

const emit = defineEmits<{
  search: [query: string, opts: SearchOptions, gen: number]
  replace: [query: string, replacement: string, opts: SearchOptions]
  open: [hit: SearchHit]
}>()

const { t } = useI18n()

const query = ref('')
const replaceText = ref('')
const replaceExpanded = ref(true)
const caseSensitive = ref(false)
const wholeWord = ref(false)
const useRegex = ref(false)
const includeGlob = ref('')
const excludeGlob = ref('')
const hits = ref<SearchHit[]>([])
const searching = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const expandedFiles = ref<Record<string, boolean>>({})
let searchGen = 0
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const searchOpts = computed((): SearchOptions => ({
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
  regex: useRegex.value,
  include: includeGlob.value.trim() || undefined,
  exclude: excludeGlob.value.trim() || undefined,
}))

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

const resultsSummary = computed(() => {
  if (!groups.value.length) return ''
  return t('searchPanel.resultsSummary', {
    count: hits.value.length,
    files: groups.value.length,
  })
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

const anyResultExpanded = computed(() =>
  groups.value.some((g) => isExpanded(g.file)),
)

const toggleFile = (file: string) => {
  if (expandedFiles.value[file]) {
    const next = { ...expandedFiles.value }
    delete next[file]
    expandedFiles.value = next
  } else {
    expandedFiles.value = { ...expandedFiles.value, [file]: true }
  }
}

const toggleAllResults = () => {
  if (anyResultExpanded.value) {
    expandedFiles.value = {}
    return
  }
  const exp: Record<string, boolean> = {}
  for (const g of groups.value) exp[g.file] = true
  expandedFiles.value = exp
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
  if (!needle || useRegex.value) return safe
  const lower = raw.toLowerCase()
  const nLower = needle.toLowerCase()
  let out = ''
  let i = 0
  while (i < raw.length) {
    const idx = caseSensitive.value
      ? raw.indexOf(needle, i)
      : lower.indexOf(nLower, i)
    if (idx < 0) {
      out += escapeHtml(raw.slice(i))
      break
    }
    const len = needle.length
    out += escapeHtml(raw.slice(i, idx))
    out += `<mark class="match-hl">${escapeHtml(raw.slice(idx, idx + len))}</mark>`
    i = idx + len
  }
  return out
}

const runSearchNow = () => {
  const q = query.value.trim()
  if (!q) {
    hits.value = []
    searching.value = false
    return
  }
  searching.value = true
  const gen = ++searchGen
  emit('search', q, searchOpts.value, gen)
}

const scheduleSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined
    runSearchNow()
  }, 300)
}

watch(query, () => scheduleSearch())
watch([caseSensitive, wholeWord, useRegex, includeGlob, excludeGlob], () => {
  if (query.value.trim()) scheduleSearch()
})

const setHits = (list: SearchHit[], gen?: number) => {
  if (gen !== undefined && gen !== searchGen) return
  hits.value = list
  searching.value = false
  const exp: Record<string, boolean> = {}
  for (const h of list) exp[h.file] = true
  expandedFiles.value = exp
}

const setQuery = (q: string) => {
  query.value = q
  if (q.trim()) scheduleSearch()
}

const focusInput = () => {
  searchInput.value?.focus()
}

const onReplaceAll = () => {
  const q = query.value.trim()
  if (!q) return
  emit('replace', q, replaceText.value, searchOpts.value)
}

const clearSearch = () => {
  query.value = ''
  replaceText.value = ''
  hits.value = []
  searching.value = false
}

const refreshSearch = () => {
  if (query.value.trim()) runSearchNow()
}

defineExpose({ setHits, focusInput, setQuery })
</script>

<template>
  <aside v-show="visible" class="search-panel">
    <div class="search-form">
      <div class="toolbar">
        <span class="toolbar-spacer" />
        <button type="button" class="tb-btn" :title="t('searchPanel.clearSearch')" @click="clearSearch">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M12 2H8.5L8 1H5l-.5 1H2v1h10V2zm-1 2H5l1 9h4l1-9z"/></svg>
        </button>
        <button type="button" class="tb-btn" :title="t('searchPanel.refreshSearch')" @click="refreshSearch">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.5 2a4.5 4.5 0 0 1 3.2 7.7L13 11h2.5v1H10v-3.5h1v2.2l1.2-1.2A3.5 3.5 0 1 0 8 11.5H7a4.5 4.5 0 0 1 4.5-9.5zM4.5 14A4.5 4.5 0 0 1 1.3 6.3L3 5H.5V4H5v3.5H4V5.3L2.8 6.5A3.5 3.5 0 1 0 8 4.5h1A4.5 4.5 0 0 1 4.5 14z"/></svg>
        </button>
        <button
          type="button"
          class="tb-btn"
          :title="anyResultExpanded ? t('searchPanel.collapseAllResults') : t('searchPanel.expandAllResults')"
          :disabled="!groups.length"
          @click="toggleAllResults"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 5.5 8 10l5-4.5v1.8L8 11.7 3 7.3V5.5zm10 5L8 10 3 10.5V8.7L8 13.1l5-4.4v1.8z"/></svg>
        </button>
        <button
          type="button"
          class="tb-btn text"
          :class="{ on: caseSensitive }"
          :title="t('searchPanel.matchCase')"
          @click="caseSensitive = !caseSensitive"
        >
          Aa
        </button>
        <button
          type="button"
          class="tb-btn text whole"
          :class="{ on: wholeWord }"
          :title="t('searchPanel.matchWholeWord')"
          @click="wholeWord = !wholeWord"
        >
          ab
        </button>
        <button
          type="button"
          class="tb-btn text"
          :class="{ on: useRegex }"
          :title="t('searchPanel.useRegex')"
          @click="useRegex = !useRegex"
        >
          .*
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ on: includeGlob.trim() || excludeGlob.trim() }"
          :title="t('searchPanel.excludeGlob')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 3.5h12v1H2v-1zm0 3h12v1H2v-1zm0 3h8v1H2v-1z"/></svg>
        </button>
      </div>

      <div class="field-row search-row">
        <button
          type="button"
          class="field-chevron"
          :class="{ open: replaceExpanded }"
          :title="t('searchPanel.toggleReplace')"
          @click.stop="replaceExpanded = !replaceExpanded"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6 4.5 10 8l-4 3.5V4.5z"/></svg>
        </button>
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="field-input"
          :placeholder="t('searchPanel.placeholder')"
          @keydown.enter="runSearchNow"
        />
      </div>

      <div v-show="replaceExpanded" class="field-row replace-row">
          <span class="field-indent" aria-hidden="true" />
          <input
            v-model="replaceText"
            type="text"
            class="field-input"
            :placeholder="t('searchPanel.replacePlaceholder')"
            @keydown.enter="onReplaceAll"
          />
          <div class="row-actions">
            <button type="button" class="tb-btn" :title="t('searchPanel.replaceOne')" @click="onReplaceAll">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 3h5.5L12 5.5V12H4V3zm1 1v7h6V6H9V4H5zm7.5-.5L11 2H6L5.5 2.5H3v1h9.5z"/></svg>
            </button>
            <button type="button" class="tb-btn" :title="t('searchPanel.replaceAll')" @click="onReplaceAll">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.5 2a4.5 4.5 0 0 1 3.2 7.7L13 11h2.5v1H10v-3.5h1v2.2l1.2-1.2A3.5 3.5 0 1 0 8 11.5H7a4.5 4.5 0 0 1 4.5-9.5zM4.5 14A4.5 4.5 0 0 1 1.3 6.3L3 5H.5V4H5v3.5H4V5.3L2.8 6.5A3.5 3.5 0 1 0 8 4.5h1A4.5 4.5 0 0 1 4.5 14z"/></svg>
            </button>
          </div>
        </div>
      <div class="field-row glob">
          <svg class="field-glyph" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2h8l3 3v9H3V2zm7 1v3h3M5 8h6M5 10h4"/></svg>
          <input
            v-model="includeGlob"
            type="text"
            class="field-input"
            :placeholder="t('searchPanel.includeGlob')"
          />
        </div>
        <div class="field-row glob">
          <svg class="field-glyph exclude" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 3h12v1H2V3zm0 3h8.5L8.8 8.8 8 8l-.8.8L5.5 7H2V6zm0 3h4.5L5.2 11.8 4.4 12.6 3.6 11.8 2 10.2V9zm12 4H2v-1h12v1z"/></svg>
          <input
            v-model="excludeGlob"
            type="text"
            class="field-input"
            :placeholder="t('searchPanel.excludeGlob')"
          />
        </div>
    </div>

    <div class="results">
      <p v-if="searching" class="results-meta">{{ t('searchPanel.searching') }}</p>
      <p v-else-if="!groups.length && query.trim()" class="results-meta">{{ t('searchPanel.noResults') }}</p>
      <p v-else-if="resultsSummary" class="results-meta">{{ resultsSummary }}</p>

      <section
        v-for="group in groups"
        :key="group.file"
        class="file-group"
        :class="{ open: isExpanded(group.file) }"
      >
        <button
          type="button"
          class="file-row"
          :title="group.file"
          @click="toggleFile(group.file)"
        >
          <span class="file-chevron" :class="{ open: isExpanded(group.file) }">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6 4.5 10 8l-4 3.5V4.5z"/></svg>
          </span>
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
  font-size: 13px;
  line-height: 1.4;
}

.search-form {
  flex-shrink: 0;
  padding: 0 6px 6px;
  display: flex;
  flex-direction: column;
  gap: var(--wc-search-field-gap);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: var(--wc-search-toolbar-h);
  padding: 0 0 0 2px;
}

.toolbar-spacer {
  flex: 1;
  min-width: 4px;
}

.tb-btn {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--wc-search-toggle-fg);
  cursor: pointer;
}

.tb-btn svg {
  width: 16px;
  height: 16px;
}

.tb-btn.text {
  width: auto;
  min-width: 22px;
  padding: 0 3px;
  font-size: 11px;
  font-weight: 500;
  font-family: var(--wc-font-sans);
}

.tb-btn.whole.on {
  box-shadow: inset 0 -1px 0 var(--wc-search-toggle-on-fg);
}

.tb-btn:hover {
  background: var(--wc-search-toggle-hover-bg);
  color: var(--wc-search-toggle-hover-fg);
}

.tb-btn.on {
  background: var(--wc-search-toggle-on-bg);
  color: var(--wc-search-toggle-on-fg);
}

.tb-btn:disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.field-row.search-row {
  padding-left: 4px;
}

.field-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--wc-search-toggle-fg);
  cursor: pointer;
}

.field-chevron svg {
  width: 14px;
  height: 14px;
  transition: transform 0.12s ease;
}

.field-chevron:hover {
  color: var(--wc-search-toggle-hover-fg);
}

.field-chevron.open svg {
  transform: rotate(90deg);
}

.field-indent {
  width: 16px;
  flex-shrink: 0;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  min-height: var(--wc-search-field-h);
  padding: 0 4px 0 var(--wc-search-field-indent);
  border: 1px solid var(--wc-search-field-border);
  border-radius: var(--wc-search-field-radius);
  background: var(--wc-search-field-bg);
}

.field-row.replace-row {
  padding-left: 4px;
}

.field-row:focus-within {
  border-color: var(--wc-search-focus-border);
}

.field-row.glob {
  padding-left: 6px;
}

.field-glyph {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--wc-search-glyph-fg);
}

.field-input {
  flex: 1;
  min-width: 0;
  height: var(--wc-search-field-h);
  padding: 0;
  font-size: 13px;
  line-height: var(--wc-search-field-h);
  background: transparent;
  border: none;
  color: var(--wc-text);
}

.field-input::placeholder {
  color: var(--wc-text-dim);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0;
  margin-right: 2px;
}

.results {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.results-meta {
  padding: 10px 18px 4px;
  color: var(--wc-search-meta-fg);
  font-size: 13px;
  line-height: 1.4;
}

.file-group {
  margin: 0;
}

.file-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wc-search-toggle-fg);
}

.file-chevron svg {
  width: 14px;
  height: 14px;
  transition: transform 0.12s ease;
}

.file-chevron.open svg {
  transform: rotate(90deg);
}

.file-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px 0 4px;
  font-size: 13px;
  text-align: left;
  color: var(--wc-search-file-fg);
  border: none;
  background: transparent;
  cursor: pointer;
}

.file-row:hover {
  background: var(--wc-search-result-hover-bg);
}

.match-list {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.file-group.open .match-list::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--wc-search-tree-guide);
  pointer-events: none;
}

.file-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.file-icon.kind-file {
  background: var(--wc-search-toggle-fg);
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M4 1h6l4 4v10H4V1zm5 1v3h3'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-icon.kind-md {
  border-radius: 2px;
  background-color: #519aba;
}

.file-icon.kind-ts {
  border-radius: 2px;
  background-color: #3178c6;
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
}

.file-icon.kind-sh {
  border-radius: 2px;
  background-color: #6b8e23;
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

.file-icon.kind-vue {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%2342b883' d='M8 2.5L2 13h3.5l.5-1h4l.5 1H14L8 2.5zm0 3.2l2.8 5.3H5.2L8 5.7z'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-icon.kind-image {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='2' y='5' width='7' height='7' rx='1' fill='none' stroke='%23a855f7' stroke-width='1'/%3E%3C/svg%3E")
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
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--wc-search-badge-bg);
  color: var(--wc-search-badge-fg);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
}

.match-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px 0 36px;
  font-size: 13px;
  font-family: var(--wc-font-mono);
  cursor: pointer;
  color: var(--wc-search-result-fg);
}

.match-loc {
  flex-shrink: 0;
  min-width: 2.5em;
  text-align: right;
  color: var(--wc-search-loc-fg);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.match-row:hover {
  background: var(--wc-search-result-hover-bg);
  color: var(--wc-search-result-hover-fg);
}

.match-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-text :deep(.match-hl) {
  background: var(--wc-search-match-hl-bg);
  color: var(--wc-search-match-hl-fg);
  border-radius: 2px;
  padding: 0 1px;
  box-decoration-break: clone;
}
</style>
