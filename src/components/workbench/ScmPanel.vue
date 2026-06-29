<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { appConfirm } from '../../utils/appConfirm'
import FileIcon from './FileIcon.vue'

const props = defineProps<{
  visible: boolean
  projectRoot: string
}>()

const emit = defineEmits<{
  openDiff: [file: string, diffText: string, staged?: boolean]
  openFile: [path: string]
}>()

type GitChange = { code: string; file: string }

const branch = ref('')
const tracking = ref<string | null>(null)
const ahead = ref(0)
const behind = ref(0)
const changes = ref<GitChange[]>([])
const error = ref('')
const loading = ref(false)
const commitMessage = ref('')
const amend = ref(false)
const treeView = ref(false)
const repoOpen = ref(true)
const stagedOpen = ref(true)
const changesOpen = ref(true)
const mergeOpen = ref(true)
const branchMenuOpen = ref(false)
const moreMenuOpen = ref(false)
const branches = ref<string[]>([])
const busy = ref(false)

const indexStatus = (code: string) => code[0] || ' '
const worktreeStatus = (code: string) => code[1] || ' '

const isStagedEntry = (code: string) => {
  const x = indexStatus(code)
  return x !== ' ' && x !== '?'
}

const isUnstagedEntry = (code: string) => {
  if (indexStatus(code) === '?' && worktreeStatus(code) === '?') return true
  return worktreeStatus(code) !== ' '
}

const isMergeEntry = (code: string) => code.includes('U')

const statusLabel = (code: string, staged: boolean) => {
  const c = staged ? indexStatus(code) : worktreeStatus(code)
  if (c === '?') return 'U'
  return c.trim() || 'M'
}

const repoName = computed(() => {
  const root = props.projectRoot
  if (!root) return ''
  const parts = root.replace(/[/\\]+$/, '').split(/[/\\]/)
  return parts[parts.length - 1] || root
})

const stagedChanges = computed(() => changes.value.filter((c) => isStagedEntry(c.code)))
const unstagedChanges = computed(() => changes.value.filter((c) => isUnstagedEntry(c.code)))
const mergeChanges = computed(() => changes.value.filter((c) => isMergeEntry(c.code)))

const sortChanges = (items: GitChange[]) =>
  [...items].sort((a, b) => a.file.localeCompare(b.file, undefined, { sensitivity: 'base' }))

const rowIndent = (file: string) => {
  if (!treeView.value) return undefined
  const depth = Math.max(0, file.split('/').length - 1)
  return { paddingLeft: `${8 + depth * 14}px` }
}

const fullPath = (file: string) => {
  const root = props.projectRoot.replace(/[/\\]+$/, '')
  const sep = root.includes('\\') ? '\\' : '/'
  return `${root}${sep}${file.replace(/^[/\\]+/, '')}`
}

const fileName = (file: string) => {
  const parts = file.split('/')
  return parts[parts.length - 1] || file
}

const onRowClick = (file: string, staged: boolean, e: MouseEvent) => {
  const t = e.target as HTMLElement
  if (t.closest('.scm-file-actions')) return
  void openDiff(file, staged)
}

const refresh = async () => {
  if (!props.projectRoot) {
    branch.value = ''
    tracking.value = null
    ahead.value = 0
    behind.value = 0
    changes.value = []
    error.value = 'Open a project first'
    return
  }
  loading.value = true
  error.value = ''
  const res = await window.axecoder.gitStatus(props.projectRoot)
  loading.value = false
  if (!res.ok) {
    error.value = res.error
    branch.value = ''
    tracking.value = null
    ahead.value = 0
    behind.value = 0
    changes.value = []
    return
  }
  branch.value = res.branch
  tracking.value = res.tracking
  ahead.value = res.ahead
  behind.value = res.behind
  changes.value = res.changes
}

const runGitAction = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
  if (!props.projectRoot || busy.value) return
  busy.value = true
  error.value = ''
  const res = await fn()
  busy.value = false
  if (!res.ok) error.value = res.error || 'Git command failed'
  await refresh()
}

const stage = (file: string) =>
  runGitAction(() => window.axecoder.gitStage(props.projectRoot, file))

const unstage = (file: string) =>
  runGitAction(() => window.axecoder.gitUnstage(props.projectRoot, file))

const discard = async (file: string) => {
  const ok = await appConfirm(`Discard changes in "${file}"?`)
  if (!ok) return
  await runGitAction(() => window.axecoder.gitDiscard(props.projectRoot, file))
}

const openDiff = async (file: string, staged: boolean) => {
  if (!props.projectRoot) return
  const res = await window.axecoder.gitShow(props.projectRoot, file, staged)
  if (res.ok) {
    emit('openDiff', file, res.text, staged)
    return
  }
  error.value = res.error
}

const openFile = (file: string) => {
  emit('openFile', fullPath(file))
}

const commit = async () => {
  if (!props.projectRoot || !commitMessage.value.trim() || busy.value) return
  busy.value = true
  error.value = ''
  const res = await window.axecoder.gitCommit(
    props.projectRoot,
    commitMessage.value.trim(),
    amend.value || undefined,
  )
  busy.value = false
  if (res.ok) {
    commitMessage.value = ''
    amend.value = false
    await refresh()
  } else {
    error.value = res.error
  }
}

const onCommitKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    void commit()
  }
}

const sync = async () => {
  if (!props.projectRoot || busy.value) return
  busy.value = true
  error.value = ''
  if (behind.value > 0) {
    const pullRes = await window.axecoder.gitPull(props.projectRoot)
    if (!pullRes.ok) {
      busy.value = false
      error.value = pullRes.error
      return
    }
  }
  if (ahead.value > 0 || behind.value === 0) {
    const pushRes = await window.axecoder.gitPush(props.projectRoot)
    if (!pushRes.ok) {
      busy.value = false
      error.value = pushRes.error
      await refresh()
      return
    }
  }
  busy.value = false
  await refresh()
}

const openBranchMenu = async () => {
  if (!props.projectRoot) return
  branchMenuOpen.value = !branchMenuOpen.value
  moreMenuOpen.value = false
  if (branchMenuOpen.value) {
    const res = await window.axecoder.gitBranches(props.projectRoot)
    branches.value = res.ok ? res.branches : []
  }
}

const checkoutBranch = async (b: string) => {
  branchMenuOpen.value = false
  await runGitAction(() => window.axecoder.gitCheckout(props.projectRoot, b))
}

const gitPull = () => runGitAction(() => window.axecoder.gitPull(props.projectRoot))
const gitPush = () => runGitAction(() => window.axecoder.gitPush(props.projectRoot))
const gitFetch = () => runGitAction(() => window.axecoder.gitFetch(props.projectRoot))
const gitStash = () => runGitAction(() => window.axecoder.gitStash(props.projectRoot))
const gitStashPop = () => runGitAction(() => window.axecoder.gitStashPop(props.projectRoot))
const gitUnstageAll = () => runGitAction(() => window.axecoder.gitUnstageAll(props.projectRoot))

const closeMenus = () => {
  branchMenuOpen.value = false
  moreMenuOpen.value = false
}

const onBodyPointerDown = (e: PointerEvent) => {
  const t = e.target as HTMLElement
  if (t.closest('.scm-menu-anchor') || t.closest('.scm-change-item')) return
  closeMenus()
}

const onDocClick = (e: MouseEvent) => {
  const t = e.target as HTMLElement
  if (!t.closest('.scm-menu-anchor')) closeMenus()
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

watch(
  () => [props.visible, props.projectRoot] as const,
  () => {
    if (props.visible || props.projectRoot) void refresh()
  },
  { immediate: true },
)

defineExpose({ refresh })
</script>

<template>
  <aside v-show="visible" class="scm-panel">
    <div class="scm-header">
      <span class="scm-header-title">Source Control</span>
      <div class="scm-toolbar">
        <button
          type="button"
          class="scm-icon-btn"
          title="Commit"
          :disabled="!commitMessage.trim() || busy"
          @click="commit"
        >
          <span class="codicon codicon-check" />
        </button>
        <button type="button" class="scm-icon-btn" title="Refresh" :disabled="busy" @click="refresh">
          <span class="codicon codicon-refresh" />
        </button>
        <div class="scm-menu-anchor">
          <button
            type="button"
            class="scm-icon-btn"
            title="More Actions..."
            @click.stop="moreMenuOpen = !moreMenuOpen; branchMenuOpen = false"
          >
            <span class="codicon codicon-ellipsis" />
          </button>
          <div v-if="moreMenuOpen" class="scm-dropdown" @click.stop>
            <button type="button" @click="gitPull">Pull</button>
            <button type="button" @click="gitPush">Push</button>
            <button type="button" @click="gitFetch">Fetch</button>
            <button type="button" @click="sync">Sync</button>
            <div class="scm-dropdown-sep" />
            <button type="button" @click="gitStash">Stash</button>
            <button type="button" @click="gitStashPop">Stash Pop</button>
            <div class="scm-dropdown-sep" />
            <button type="button" @click="gitUnstageAll">
              Unstage All Changes
            </button>
          </div>
        </div>
        <button
          type="button"
          class="scm-icon-btn"
          :title="treeView ? 'View as List' : 'View as Tree'"
          @click="treeView = !treeView"
        >
          <span class="codicon" :class="treeView ? 'codicon-list-flat' : 'codicon-list-tree'" />
        </button>
      </div>
    </div>

    <div class="scm-body" @pointerdown="onBodyPointerDown">
      <div v-if="loading && !changes.length" class="scm-hint">Loading…</div>
      <div v-else-if="error" class="scm-hint scm-error">{{ error }}</div>

      <template v-if="projectRoot">
        <section class="scm-section">
          <button type="button" class="scm-section-header" @click="repoOpen = !repoOpen">
            <span class="codicon" :class="repoOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
            <span>Repositories</span>
          </button>
          <div v-show="repoOpen" class="scm-repo-block">
            <div class="scm-repo-row">
              <span class="scm-repo-name">{{ repoName }}</span>
              <div class="scm-menu-anchor scm-branch-anchor">
                <button type="button" class="scm-branch-btn" @click.stop="openBranchMenu">
                  <span class="codicon codicon-git-branch" />
                  {{ branch }}
                </button>
                <div v-if="branchMenuOpen" class="scm-dropdown scm-branch-menu" @click.stop>
                  <button
                    v-for="b in branches"
                    :key="b"
                    type="button"
                    :class="{ active: b === branch }"
                    @click="checkoutBranch(b)"
                  >
                    {{ b }}
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="scm-sync-btn"
                :title="tracking ? `Sync with ${tracking}` : 'Publish Branch'"
                :disabled="busy"
                @click="sync"
              >
                <span class="codicon codicon-sync" />
                <span v-if="behind" class="scm-sync-badge behind">{{ behind }}↓</span>
                <span v-if="ahead" class="scm-sync-badge ahead">{{ ahead }}↑</span>
              </button>
            </div>

            <div class="scm-commit-box">
              <textarea
                v-model="commitMessage"
                class="scm-commit-input"
                rows="1"
                placeholder="Message (Ctrl+Enter to commit on macOS: ⌘+Enter)"
                @keydown="onCommitKeydown"
              />
              <label class="scm-amend">
                <input v-model="amend" type="checkbox" />
                Amend
              </label>
              <button
                type="button"
                class="scm-commit-btn"
                :disabled="!commitMessage.trim() || busy"
                @click="commit"
              >
                <span class="codicon codicon-check" />
                Commit
              </button>
            </div>
          </div>
        </section>

        <section v-if="mergeChanges.length" class="scm-section">
          <button type="button" class="scm-section-header" @click="mergeOpen = !mergeOpen">
            <span class="codicon" :class="mergeOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
            <span>Merge Changes</span>
            <span class="scm-count">{{ mergeChanges.length }}</span>
          </button>
          <ul v-show="mergeOpen" class="scm-change-list">
            <li
              v-for="(c, i) in mergeChanges"
              :key="'m' + i"
              class="scm-change-item"
            >
              <span class="scm-status scm-status-conflict">{{ statusLabel(c.code, false) }}</span>
              <button type="button" class="scm-file-label" :title="c.file" @click="openDiff(c.file, false)">
                <FileIcon :name="fileName(c.file)" />
                <span class="scm-file-text">
                  <span class="scm-file-base">{{ fileName(c.file) }}</span>
                </span>
              </button>
              <div class="scm-file-actions">
                <button type="button" title="Open File" @click.stop="openFile(c.file)">
                  <span class="codicon codicon-go-to-file" />
                </button>
                <button type="button" title="Open Changes" @click.stop="openDiff(c.file, false)">
                  <span class="codicon codicon-diff" />
                </button>
              </div>
            </li>
          </ul>
        </section>

        <section v-if="stagedChanges.length" class="scm-section">
          <button type="button" class="scm-section-header" @click="stagedOpen = !stagedOpen">
            <span class="codicon" :class="stagedOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
            <span>Staged Changes</span>
            <span class="scm-count">{{ stagedChanges.length }}</span>
          </button>
          <template v-if="stagedOpen">
            <ul class="scm-change-list">
              <li
                v-for="(c, i) in sortChanges(stagedChanges)"
                :key="'s' + i"
                class="scm-change-item"
                :style="rowIndent(c.file)"
                @click="onRowClick(c.file, true, $event)"
              >
                <span class="scm-status">{{ statusLabel(c.code, true) }}</span>
                <button type="button" class="scm-file-label" :title="c.file" @click.stop="openDiff(c.file, true)">
                  <FileIcon :name="fileName(c.file)" />
                  <span class="scm-file-text">
                    <span class="scm-file-base">{{ fileName(c.file) }}</span>
                  </span>
                </button>
                <div class="scm-file-actions">
                  <button type="button" title="Unstage Changes" @click.stop="unstage(c.file)">
                    <span class="codicon codicon-remove" />
                  </button>
                  <button type="button" title="Discard Changes" @click.stop="discard(c.file)">
                    <span class="codicon codicon-discard" />
                  </button>
                  <button type="button" title="Open File" @click.stop="openFile(c.file)">
                    <span class="codicon codicon-go-to-file" />
                  </button>
                  <button type="button" title="Open Changes" @click.stop="openDiff(c.file, true)">
                    <span class="codicon codicon-diff" />
                  </button>
                </div>
              </li>
            </ul>
          </template>
        </section>

        <section class="scm-section">
          <button type="button" class="scm-section-header" @click="changesOpen = !changesOpen">
            <span class="codicon" :class="changesOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
            <span>Changes</span>
            <span class="scm-count">{{ unstagedChanges.length }}</span>
          </button>
          <template v-if="changesOpen">
            <ul v-if="unstagedChanges.length" class="scm-change-list">
              <li
                v-for="(c, i) in sortChanges(unstagedChanges)"
                :key="'u' + i"
                class="scm-change-item"
                :style="rowIndent(c.file)"
                @click="onRowClick(c.file, false, $event)"
              >
                <span class="scm-status" :class="{ 'scm-status-added': indexStatus(c.code) === '?' }">
                  {{ statusLabel(c.code, false) }}
                </span>
                <button type="button" class="scm-file-label" :title="c.file" @click.stop="openDiff(c.file, false)">
                  <FileIcon :name="fileName(c.file)" />
                  <span class="scm-file-text">
                    <span class="scm-file-base">{{ fileName(c.file) }}</span>
                  </span>
                </button>
                <div class="scm-file-actions">
                  <button type="button" title="Stage Changes" @click.stop="stage(c.file)">
                    <span class="codicon codicon-add" />
                  </button>
                  <button type="button" title="Discard Changes" @click.stop="discard(c.file)">
                    <span class="codicon codicon-discard" />
                  </button>
                  <button type="button" title="Open File" @click.stop="openFile(c.file)">
                    <span class="codicon codicon-go-to-file" />
                  </button>
                  <button type="button" title="Open Changes" @click.stop="openDiff(c.file, false)">
                    <span class="codicon codicon-diff" />
                  </button>
                </div>
              </li>
            </ul>
            <div v-else class="scm-hint">No changes</div>
          </template>
        </section>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.scm-panel {
  width: 100%;
  height: 100%;
  background: var(--wc-sidebar);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.scm-header {
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--wc-border);
  flex-shrink: 0;
}

.scm-header-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--wc-text-muted);
  text-transform: uppercase;
}

.scm-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.scm-icon-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--wc-text-muted);
}

.scm-icon-btn:hover:not(:disabled) {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.scm-icon-btn:disabled {
  opacity: 0.4;
}

.scm-icon-btn .codicon {
  font-size: 16px;
}

.scm-body {
  flex: 1;
  overflow: auto;
  font-size: 13px;
  -webkit-overflow-scrolling: touch;
}

.scm-section {
  border-bottom: 1px solid var(--wc-border);
}

.scm-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--wc-text-muted);
}

.scm-section-header:hover {
  background: var(--wc-hover);
}

.scm-section-header .codicon {
  font-size: 14px;
}

.scm-count {
  margin-left: auto;
  font-weight: 400;
  opacity: 0.8;
}

.scm-repo-block {
  padding: 0 8px 8px;
}

.scm-repo-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.scm-repo-name {
  font-weight: 600;
  color: var(--wc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 40%;
}

.scm-menu-anchor {
  position: relative;
}

.scm-branch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--wc-accent);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scm-branch-btn:hover {
  background: var(--wc-hover);
}

.scm-sync-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--wc-text-muted);
  position: relative;
}

.scm-sync-btn:hover:not(:disabled) {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.scm-sync-badge {
  font-size: 10px;
  line-height: 1;
}

.scm-sync-badge.behind {
  color: #75beff;
}

.scm-sync-badge.ahead {
  color: #89d185;
}

.scm-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 180px;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  box-shadow: var(--wc-popover-shadow);
  padding: 4px 0;
}

.scm-branch-menu {
  left: 0;
  right: auto;
  max-height: 160px;
  overflow: auto;
}

.scm-dropdown button {
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--wc-text);
}

.scm-dropdown button:hover {
  background: var(--wc-hover);
}

.scm-dropdown button.active {
  color: var(--wc-accent);
}

.scm-dropdown-sep {
  height: 1px;
  margin: 4px 0;
  background: var(--wc-border);
}

.scm-commit-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scm-commit-input {
  width: 100%;
  min-height: 26px;
  max-height: 120px;
  padding: 6px 8px;
  border: 1px solid var(--wc-search-field-border);
  border-radius: 2px;
  background: var(--wc-input-bg);
  color: var(--wc-text);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.4;
}

.scm-commit-input:focus {
  outline: 1px solid var(--wc-accent);
  border-color: var(--wc-accent);
}

.scm-amend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--wc-text-muted);
  cursor: pointer;
}

.scm-commit-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--wc-accent);
  color: #fff;
  border-radius: 2px;
  font-size: 12px;
}

.scm-commit-btn:disabled {
  opacity: 0.5;
}

.scm-change-list {
  list-style: none;
}

.scm-change-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 4px;
  min-height: 22px;
  position: relative;
  cursor: pointer;
}

.scm-change-item:hover {
  background: var(--wc-hover);
}

.scm-change-item:hover .scm-file-label {
  padding-right: 72px;
}

.scm-status {
  flex-shrink: 0;
  width: 16px;
  font-size: 12px;
  font-family: var(--wc-font-mono);
  color: #e8ab53;
  text-align: center;
}

.scm-status-added {
  color: #73c991;
}

.scm-status-conflict {
  color: #e51400;
}

.scm-file-label {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  text-align: left;
  color: var(--wc-text);
  overflow: hidden;
  padding-right: 2px;
}

.scm-file-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scm-file-dir {
  color: var(--wc-text-muted);
}

.scm-file-base {
  color: var(--wc-text);
}

.scm-file-label:hover {
  color: var(--wc-accent);
}

.scm-file-actions {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
}

.scm-change-item:hover .scm-file-actions,
.scm-change-item:focus-within .scm-file-actions {
  opacity: 1;
  pointer-events: auto;
}

.scm-file-actions button {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--wc-text-muted);
  flex-shrink: 0;
}

.scm-file-actions button:hover {
  background: var(--wc-active);
  color: var(--wc-text);
}

.scm-file-actions .codicon {
  font-size: 14px;
}

.scm-tree-dir-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 2px 8px;
  text-align: left;
  color: var(--wc-text);
}

.scm-tree-nested {
  padding-left: 12px;
}

.scm-hint {
  padding: 12px 16px;
  color: var(--wc-text-muted);
  font-size: 12px;
}

.scm-error {
  color: #f48771;
}

@media (max-width: 1024px) {
  .scm-repo-name {
    max-width: 100%;
  }

  .scm-branch-btn {
    max-width: 100%;
  }

  .scm-file-actions {
    opacity: 1;
    pointer-events: auto;
  }

  .scm-file-actions button {
    width: 44px;
    height: 44px;
  }
}
</style>
