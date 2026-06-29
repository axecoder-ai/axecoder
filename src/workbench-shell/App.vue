<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import FileExplorer from '../components/workbench/FileExplorer.vue'
import SearchPanel from '../components/workbench/SearchPanel.vue'
import ScmPanel from '../components/workbench/ScmPanel.vue'
import { currentViewIdFromHash, emitViewEvent } from './axecoder-shim'
import { registerViewHandlers } from './view-api'

const viewId = ref(currentViewIdFromHash())
const projectRoot = ref('')
const projectName = ref('')
const activeFilePath = ref<string | null>(null)

const syncHash = () => {
  viewId.value = currentViewIdFromHash()
}

onMounted(() => {
  window.addEventListener('hashchange', syncHash)
  syncHash()
})

const fileExplorerRef = ref<InstanceType<typeof FileExplorer> | null>(null)
const searchPanelRef = ref<InstanceType<typeof SearchPanel> | null>(null)
const scmPanelRef = ref<InstanceType<typeof ScmPanel> | null>(null)

const bindHandlers = () => {
  registerViewHandlers('explorer', {
    openProject: () => fileExplorerRef.value?.openProject(),
    openProjectAt: (p) => fileExplorerRef.value?.openProjectAt(String(p)),
    newFile: () => fileExplorerRef.value?.newFile(),
    refresh: () => fileExplorerRef.value?.refresh?.(),
  })
  registerViewHandlers('search', {
    setHits: (hits, gen) => searchPanelRef.value?.setHits(hits as never, gen as number | undefined),
    focusInput: () => searchPanelRef.value?.focusInput(),
    setQuery: (q) => searchPanelRef.value?.setQuery(String(q)),
  })
  registerViewHandlers('scm', {
    refresh: () => scmPanelRef.value?.refresh?.(),
  })
}

watch([fileExplorerRef, searchPanelRef, scmPanelRef], bindHandlers, { immediate: true })

const showExplorer = computed(() => viewId.value === 'explorer')
const showSearch = computed(() => viewId.value === 'search')
const showScm = computed(() => viewId.value === 'scm')

const onOpenFile = (path: string) => emitViewEvent('explorer', 'open-file', path)
const onProjectOpened = (root: string) => {
  projectRoot.value = root
  projectName.value = root.split(/[/\\]/).pop() ?? root
  emitViewEvent('explorer', 'project-opened', root)
}
const onFileRenamed = (oldPath: string, newPath: string) =>
  emitViewEvent('explorer', 'file-renamed', { oldPath, newPath })
const onFileDeleted = (path: string) => emitViewEvent('explorer', 'file-deleted', path)

const onSearch = (query: string, opts: unknown, gen: number) =>
  emitViewEvent('search', 'search', { query, opts, gen })
const onSearchReplace = (query: string, replacement: string, opts: unknown) =>
  emitViewEvent('search', 'replace', { query, replacement, opts })
const onSearchReplaceOne = (hit: unknown, query: string, replacement: string, opts: unknown) =>
  emitViewEvent('search', 'replaceOne', { hit, query, replacement, opts })
const onSearchOpen = (hit: unknown) => emitViewEvent('search', 'open', hit)

const onScmOpenDiff = (payload: unknown) => emitViewEvent('scm', 'open-diff', payload)
const onScmOpenFile = (path: string) => emitViewEvent('scm', 'open-file', path)
</script>

<template>
  <div class="shell-root">
    <FileExplorer
      v-show="showExplorer"
      ref="fileExplorerRef"
      :visible="showExplorer"
      :active-file-path="activeFilePath"
      @open-file="onOpenFile"
      @project-opened="onProjectOpened"
      @file-renamed="onFileRenamed"
      @file-deleted="onFileDeleted"
    />
    <SearchPanel
      v-show="showSearch"
      ref="searchPanelRef"
      :visible="showSearch"
      :project-name="projectName"
      @search="onSearch"
      @replace="onSearchReplace"
      @replaceOne="onSearchReplaceOne"
      @open="onSearchOpen"
    />
    <ScmPanel
      v-show="showScm"
      ref="scmPanelRef"
      :visible="showScm"
      :project-root="projectRoot"
      @open-diff="onScmOpenDiff"
      @open-file="onScmOpenFile"
    />
  </div>
</template>

<style scoped>
.shell-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--wc-sidebar);
}
</style>
