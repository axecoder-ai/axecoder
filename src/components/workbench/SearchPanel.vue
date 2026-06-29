<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '../../i18n'
import type { SearchHit, SearchOptions } from '../../types/axecoder'
import FileIcon from './FileIcon.vue'

defineProps<{
  visible: boolean
  projectName: string
}>()

const emit = defineEmits<{
  search: [query: string, opts: SearchOptions, gen: number]
  replace: [query: string, replacement: string, opts: SearchOptions]
  replaceOne: [hit: SearchHit, query: string, replacement: string, opts: SearchOptions]
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

const onReplaceOneHit = (hit: SearchHit) => {
  const q = query.value.trim()
  if (!q) return
  emit('replaceOne', hit, q, replaceText.value, searchOpts.value)
}

const clearSearch = () => {
  query.value = ''
  replaceText.value = ''
  hits.value = []
  searching.value = false
}

const onReplaceAll = () => {
  const q = query.value.trim()
  if (!q) return
  emit('replace', q, replaceText.value, searchOpts.value)
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
          <span class="codicon codicon-clear-all" aria-hidden="true" />
        </button>
        <button type="button" class="tb-btn" :title="t('searchPanel.refreshSearch')" @click="refreshSearch">
          <span class="codicon codicon-refresh" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tb-btn"
          :title="anyResultExpanded ? t('searchPanel.collapseAllResults') : t('searchPanel.expandAllResults')"
          :disabled="!groups.length"
          @click="toggleAllResults"
        >
          <span
            class="codicon"
            :class="anyResultExpanded ? 'codicon-collapse-all' : 'codicon-expand-all'"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ on: caseSensitive }"
          :title="t('searchPanel.matchCase')"
          @click="caseSensitive = !caseSensitive"
        >
          <span class="codicon codicon-case-sensitive" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ on: wholeWord }"
          :title="t('searchPanel.matchWholeWord')"
          @click="wholeWord = !wholeWord"
        >
          <span class="codicon codicon-whole-word" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ on: useRegex }"
          :title="t('searchPanel.useRegex')"
          @click="useRegex = !useRegex"
        >
          <span class="codicon codicon-regex" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ on: includeGlob.trim() || excludeGlob.trim() }"
          :title="t('searchPanel.excludeGlob')"
        >
          <span class="codicon codicon-list-filter" aria-hidden="true" />
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
          <span class="codicon codicon-chevron-right" aria-hidden="true" />
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
              <span class="codicon codicon-replace" aria-hidden="true" />
            </button>
            <button type="button" class="tb-btn" :title="t('searchPanel.replaceAll')" @click="onReplaceAll">
              <span class="codicon codicon-replace-all" aria-hidden="true" />
            </button>
          </div>
        </div>
      <div class="field-row glob">
          <span class="codicon codicon-file field-glyph" aria-hidden="true" />
          <input
            v-model="includeGlob"
            type="text"
            class="field-input"
            :placeholder="t('searchPanel.includeGlob')"
          />
        </div>
        <div class="field-row glob">
          <span class="codicon codicon-exclude field-glyph" aria-hidden="true" />
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
            <span class="codicon codicon-chevron-right" aria-hidden="true" />
          </span>
          <FileIcon :name="group.fileName" />
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
            <button type="button" class="tb-btn replace-one" :title="t('searchPanel.replaceOne')" @click.stop="onReplaceOneHit(hit)">
              <span class="codicon codicon-replace" aria-hidden="true" />
            </button>
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
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--wc-sidebar);
  min-height: 0;
  overflow: hidden;
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

.tb-btn .codicon {
  font-size: 16px;
}

.field-chevron .codicon,
.file-chevron .codicon {
  font-size: 14px;
  transition: transform 0.12s ease;
}

.field-chevron.open .codicon,
.file-chevron.open .codicon {
  transform: rotate(90deg);
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

.field-chevron:hover {
  color: var(--wc-search-toggle-hover-fg);
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
  flex-shrink: 0;
  font-size: 16px;
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
