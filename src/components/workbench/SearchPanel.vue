<script setup lang="ts">
import { ref } from 'vue'
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
      <span class="sub">{{ projectName || '未打开项目' }}</span>
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
    <ul class="hit-list">
      <li
        v-for="(hit, i) in hits"
        :key="`${hit.file}:${hit.line}:${i}`"
        class="hit-item"
        @click="emit('open', hit)"
      >
        <span class="hit-file">{{ hit.file.split(/[/\\]/).pop() }}</span>
        <span class="hit-loc">:{{ hit.line }}</span>
        <span class="hit-text">{{ hit.text.trim() }}</span>
      </li>
      <li v-if="!hits.length && query" class="empty">无结果</li>
    </ul>
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
}

.search-box input {
  flex: 1;
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
  background: var(--wc-active);
  color: var(--wc-text);
}

.hit-list {
  flex: 1;
  overflow: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}

.hit-item {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--wc-border);
}

.hit-item:hover {
  background: var(--wc-hover);
}

.hit-file {
  color: #519aba;
}

.hit-loc {
  color: var(--wc-text-muted);
}

.hit-text {
  display: block;
  margin-top: 2px;
  color: var(--wc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  padding: 12px;
  color: var(--wc-text-muted);
  font-size: 12px;
}
</style>
