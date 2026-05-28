<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { ConflictAction, FileNode } from '../../types/writcraft'
import type { OutlineItem } from '../../utils/markdown-outline'

const props = defineProps<{
  visible: boolean
  activeFilePath: string | null
  outlineItems?: OutlineItem[]
  recentFiles?: string[]
}>()

const emit = defineEmits<{
  'open-file': [path: string]
  'project-opened': [rootPath: string]
  'file-renamed': [oldPath: string, newPath: string]
  'file-deleted': [path: string]
  'outline-jump': [line: number]
}>()

const outlineOpen = ref(true)
const timelineOpen = ref(false)
const treeSectionOpen = ref(true)

const TREE_PANE_HEIGHT_KEY = 'writcraft.explorer.treePaneHeight'
const TREE_PANE_MIN = 64
const BOTTOM_PANE_MIN = 80
const TREE_PANE_DEFAULT = 200

const explorerSplitRef = ref<HTMLElement | null>(null)
const treePaneHeight = ref(TREE_PANE_DEFAULT)
const treeSplitDragging = ref(false)
let treeSplitStartY = 0
let treeSplitStartHeight = TREE_PANE_DEFAULT

const clampTreePaneHeight = (height: number) => {
  const el = explorerSplitRef.value
  if (!el) return Math.max(TREE_PANE_MIN, height)
  const total = el.getBoundingClientRect().height
  const maxTree = Math.max(TREE_PANE_MIN, total - BOTTOM_PANE_MIN - 4)
  return Math.min(maxTree, Math.max(TREE_PANE_MIN, height))
}

const onTreeSplitPointerDown = (e: PointerEvent) => {
  treeSplitDragging.value = true
  treeSplitStartY = e.clientY
  treeSplitStartHeight = treePaneHeight.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onTreeSplitPointerMove = (e: PointerEvent) => {
  if (!treeSplitDragging.value) return
  const delta = e.clientY - treeSplitStartY
  treePaneHeight.value = clampTreePaneHeight(treeSplitStartHeight + delta)
}

const onTreeSplitPointerUp = (e: PointerEvent) => {
  if (!treeSplitDragging.value) return
  treeSplitDragging.value = false
  try {
    localStorage.setItem(TREE_PANE_HEIGHT_KEY, String(treePaneHeight.value))
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* already released */
  }
}

const rootPath = ref('')
const tree = ref<FileNode | null>(null)
const expanded = ref<Set<string>>(new Set())
const clipboard = ref<{ mode: 'copy' | 'cut'; path: string } | null>(null)

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuTarget = ref<FileNode | null>(null)

const PENDING_FILE = '__pending_file__'
const PENDING_FOLDER = '__pending_folder__'

const renamingPath = ref<string | null>(null)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

const creatingFile = ref<{ parentPath: string; name: string } | null>(null)
const newFileInput = ref<HTMLInputElement | null>(null)

const creatingFolder = ref<{ parentPath: string; name: string } | null>(null)
const newFolderInput = ref<HTMLInputElement | null>(null)

const dragPath = ref<string | null>(null)
const dropHighlightPath = ref<string | null>(null)

const fs = window.writcraft

const parentDir = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i > 0 ? p.slice(0, i) : p
}

const baseName = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

const joinPath = (dir: string, name: string) => {
  const sep = dir.includes('\\') ? '\\' : '/'
  return dir.endsWith(sep) ? dir + name : dir + sep + name
}

const refresh = async () => {
  if (!rootPath.value) return
  const res = await fs.readTree(rootPath.value)
  tree.value = res.tree
  expanded.value.add(res.rootPath)
}

const projectTitle = computed(() => {
  if (!rootPath.value) return '未打开项目'
  return baseName(rootPath.value)
})

const applyProject = (res: { rootPath: string; tree: FileNode }) => {
  rootPath.value = res.rootPath
  tree.value = res.tree
  expanded.value = new Set([res.rootPath])
  emit('project-opened', res.rootPath)
}

const openProject = async () => {
  const res = await fs.openProject()
  if (!res) return
  applyProject(res)
}

const openProjectAt = async (rootPath: string) => {
  const res = await fs.openProject(rootPath)
  if (!res) return
  applyProject(res)
}

const loadLastProject = async () => {
  const last = await fs.getLastProject()
  if (!last) return
  const res = await fs.openProject(last)
  if (!res) return
  applyProject(res)
}

const focusedNode = ref<FileNode | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const toggleExpand = (node: FileNode) => {
  const next = new Set(expanded.value)
  if (next.has(node.path)) next.delete(node.path)
  else next.add(node.path)
  expanded.value = next
}

const collapseAll = () => {
  if (!rootPath.value) return
  expanded.value = new Set([rootPath.value])
}

const fileKind = (name: string) => {
  const n = name.toLowerCase()
  if (n.endsWith('.md')) return 'kind-md'
  if (/\.(png|jpe?g|gif|webp|ico|svg)$/.test(n)) return 'kind-image'
  if (n.endsWith('.vue')) return 'kind-vue'
  return 'kind-file'
}

const onFileClick = async (node: FileNode) => {
  if (node.type !== 'file') return
  emit('open-file', node.path)
}

const closeMenu = () => {
  menuVisible.value = false
  menuTarget.value = null
}

const openMenu = (e: MouseEvent, node: FileNode | null) => {
  e.preventDefault()
  e.stopPropagation()
  menuTarget.value = node
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

const targetParent = () => {
  if (menuTarget.value?.type === 'directory') return menuTarget.value.path
  if (menuTarget.value?.type === 'file') return parentDir(menuTarget.value.path)
  return rootPath.value
}

const onNewFile = () => {
  if (!rootPath.value) return
  closeMenu()
  renamingPath.value = null
  creatingFolder.value = null
  const parent = targetParent()
  if (!parent) return
  expanded.value = new Set([...expanded.value, parent])
  creatingFile.value = { parentPath: parent, name: 'untitled.md' }
  nextTick(() => {
    newFileInput.value?.focus()
    newFileInput.value?.select()
  })
}

const commitNewFile = async () => {
  if (!creatingFile.value) return
  const { parentPath, name } = creatingFile.value
  const trimmed = name.trim()
  if (!trimmed) {
    creatingFile.value = null
    return
  }
  creatingFile.value = null
  try {
    const { path: filePath } = await fs.createFile(parentPath, trimmed)
    await refresh()
    expanded.value.add(parentPath)
    emit('open-file', filePath)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '创建失败'
    window.alert(msg)
    creatingFile.value = { parentPath, name: trimmed }
    nextTick(() => newFileInput.value?.focus())
  }
}

const cancelNewFile = () => {
  creatingFile.value = null
}

const onNewFolder = () => {
  if (!rootPath.value) return
  closeMenu()
  renamingPath.value = null
  creatingFile.value = null
  const parent = targetParent()
  if (!parent) return
  expanded.value = new Set([...expanded.value, parent])
  creatingFolder.value = { parentPath: parent, name: '新建文件夹' }
  nextTick(() => {
    newFolderInput.value?.focus()
    newFolderInput.value?.select()
  })
}

const commitNewFolder = async () => {
  if (!creatingFolder.value) return
  const { parentPath, name } = creatingFolder.value
  const trimmed = name.trim()
  if (!trimmed) {
    creatingFolder.value = null
    return
  }
  creatingFolder.value = null
  try {
    await fs.createDir(parentPath, trimmed)
    await refresh()
    expanded.value.add(parentPath)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '创建失败'
    window.alert(msg)
    creatingFolder.value = { parentPath, name: trimmed }
    nextTick(() => newFolderInput.value?.focus())
  }
}

const cancelNewFolder = () => {
  creatingFolder.value = null
}

const isDescendantOf = (ancestor: string, path: string) => {
  const sep = ancestor.includes('\\') ? '\\' : '/'
  return path === ancestor || path.startsWith(ancestor + sep)
}

const canDropOn = (src: string, destDir: string) => {
  if (src === destDir) return false
  if (isDescendantOf(src, destDir)) return false
  return true
}

const dropTargetDir = (node: FileNode) =>
  node.type === 'directory' ? node.path : parentDir(node.path)

const onDragStart = (e: DragEvent, node: FileNode) => {
  dragPath.value = node.path
  e.dataTransfer!.effectAllowed = 'copyMove'
  e.dataTransfer!.setData('text/plain', node.path)
  if (node.type === 'file') {
    e.dataTransfer!.setData('application/x-writcraft-file', node.path)
  }
}

const onDragEnd = () => {
  dragPath.value = null
  dropHighlightPath.value = null
}

const onDragOver = (e: DragEvent, destDir: string) => {
  if (!dragPath.value || !canDropOn(dragPath.value, destDir)) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dropHighlightPath.value = destDir
}

const onDragLeaveItem = (destDir: string) => {
  if (dropHighlightPath.value === destDir) dropHighlightPath.value = null
}

const onDrop = async (e: DragEvent, destDir: string) => {
  e.preventDefault()
  const src = dragPath.value
  dragPath.value = null
  dropHighlightPath.value = null
  if (!src || !canDropOn(src, destDir)) return
  const destPath = joinPath(destDir, baseName(src))
  if (src === destPath) return
  try {
    await fs.move(src, destPath)
    await refresh()
    expanded.value.add(destDir)
    if (props.activeFilePath === src) emit('open-file', destPath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '移动失败'
    window.alert(msg)
  }
}

const onCut = () => {
  if (!menuTarget.value) return
  clipboard.value = { mode: 'cut', path: menuTarget.value.path }
  closeMenu()
}

const onCopy = () => {
  if (!menuTarget.value) return
  clipboard.value = { mode: 'copy', path: menuTarget.value.path }
  closeMenu()
}

const pickConflictAction = (): ConflictAction | null => {
  const ans = window.prompt(
    '目标已存在。输入 skip（跳过）、rename（自动重命名）或 replace（替换）',
    'rename',
  )
  if (!ans) return null
  if (ans === 'skip' || ans === 'rename' || ans === 'replace') return ans
  window.alert('无效输入，请输入 skip、rename 或 replace')
  return pickConflictAction()
}

const transferWithConflict = async (
  src: string,
  dest: string,
  mode: 'copy' | 'cut',
) => {
  const run = (action?: ConflictAction) =>
    mode === 'copy' ? fs.copy(src, dest, action) : fs.move(src, dest, action)
  try {
    return await run()
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (!msg.includes('已存在')) throw e
    const action = pickConflictAction()
    if (!action) return null
    return await run(action)
  }
}

const onPaste = async () => {
  closeMenu()
  if (!clipboard.value) return
  const destDir = targetParent()
  const srcName = baseName(clipboard.value.path)
  const destPath = joinPath(destDir, srcName)
  const mode = clipboard.value.mode === 'copy' ? 'copy' : 'cut'
  const res = await transferWithConflict(clipboard.value.path, destPath, mode)
  if (!res) return
  if (mode === 'cut') clipboard.value = null
  await refresh()
  expanded.value.add(destDir)
  if (props.activeFilePath && mode === 'cut') {
    const old = props.activeFilePath
    if (baseName(old) === srcName) emit('file-renamed', old, res.path)
  }
}

const startRename = () => {
  if (!menuTarget.value) return
  creatingFile.value = null
  creatingFolder.value = null
  renamingPath.value = menuTarget.value.path
  renameValue.value = menuTarget.value.name
  closeMenu()
  nextTick(() => renameInput.value?.focus())
}

const commitRename = async () => {
  if (!renamingPath.value) return
  const oldPath = renamingPath.value
  const newName = renameValue.value.trim()
  renamingPath.value = null
  if (!newName || newName === baseName(oldPath)) return
  const newPath = joinPath(parentDir(oldPath), newName)
  await fs.rename(oldPath, newPath)
  await refresh()
  emit('file-renamed', oldPath, newPath)
  if (props.activeFilePath === oldPath) emit('open-file', newPath)
}

const cancelRename = () => {
  renamingPath.value = null
}

const onDelete = async () => {
  const target = menuTarget.value
  closeMenu()
  if (!target) return
  if (!window.confirm(`Delete "${target.name}"?`)) return
  try {
    await fs.delete(target.path)
    await refresh()
    emit('file-deleted', target.path)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    window.alert(msg)
  }
}

const onReveal = async () => {
  if (!menuTarget.value) return
  await fs.revealInFinder(menuTarget.value.path)
  closeMenu()
}

const onCopyPath = async () => {
  if (!menuTarget.value) return
  await navigator.clipboard.writeText(menuTarget.value.path)
  closeMenu()
}

const isMenuMdFile = () => {
  const t = menuTarget.value
  return t?.type === 'file' && t.name.toLowerCase().endsWith('.md')
}

const onExportPdf = async () => {
  if (!menuTarget.value || !isMenuMdFile()) return
  const src = menuTarget.value.path
  closeMenu()
  try {
    const res = await fs.exportMarkdownPdf(src)
    if ('cancelled' in res) return
    await fs.revealInFinder(res.path)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '导出 PDF 失败'
    window.alert(msg)
  }
}

const onExportDocx = async () => {
  if (!menuTarget.value || !isMenuMdFile()) return
  const src = menuTarget.value.path
  closeMenu()
  try {
    const res = await fs.exportMarkdownDocx(src)
    if ('cancelled' in res) return
    await fs.revealInFinder(res.path)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '导出 DOCX 失败'
    window.alert(msg)
  }
}

const flatNodes = computed(() => {
  const rows: { node: FileNode; depth: number; pending?: 'file' | 'folder' }[] = []
  const appendPending = (parentPath: string, depth: number) => {
    if (creatingFile.value?.parentPath === parentPath) {
      rows.push({
        node: { name: creatingFile.value.name, path: PENDING_FILE, type: 'file' },
        depth,
        pending: 'file',
      })
    }
    if (creatingFolder.value?.parentPath === parentPath) {
      rows.push({
        node: { name: creatingFolder.value.name, path: PENDING_FOLDER, type: 'directory' },
        depth,
        pending: 'folder',
      })
    }
  }
  const walk = (node: FileNode, depth: number) => {
    rows.push({ node, depth })
    if (node.type === 'directory' && expanded.value.has(node.path) && node.children) {
      for (const child of node.children) walk(child, depth + 1)
      appendPending(node.path, depth + 1)
    }
  }
  if (tree.value?.children) {
    for (const child of tree.value.children) walk(child, 0)
  }
  if (rootPath.value) appendPending(rootPath.value, 0)
  return rows
})

const onDocClick = () => closeMenu()

const onTreeKeydown = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  const node = focusedNode.value ?? menuTarget.value
  const meta = e.metaKey || e.ctrlKey
  if (meta && e.key === 'c' && node) {
    e.preventDefault()
    clipboard.value = { mode: 'copy', path: node.path }
    return
  }
  if (meta && e.key === 'v' && clipboard.value) {
    e.preventDefault()
    menuTarget.value = node
    void onPaste()
    return
  }
  if (meta && e.key === 'n') {
    e.preventDefault()
    onNewFile()
    return
  }
  if (!node) return
  if (e.key === 'F2') {
    e.preventDefault()
    menuTarget.value = node
    startRename()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    menuTarget.value = node
    void onDelete()
  }
}

defineExpose({
  openProject,
  openProjectAt,
  newFile: onNewFile,
  refresh,
  getRootPath: () => rootPath.value,
})

onMounted(() => {
  loadLastProject()
  document.addEventListener('click', onDocClick)
  panelRef.value?.addEventListener('keydown', onTreeKeydown)
  const saved = localStorage.getItem(TREE_PANE_HEIGHT_KEY)
  if (saved) {
    const n = Number(saved)
    if (Number.isFinite(n) && n >= TREE_PANE_MIN) treePaneHeight.value = n
  }
  nextTick(() => {
    treePaneHeight.value = clampTreePaneHeight(treePaneHeight.value)
  })
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  panelRef.value?.removeEventListener('keydown', onTreeKeydown)
})
</script>

<template>
  <aside
    v-show="visible"
    ref="panelRef"
    class="file-explorer"
    tabindex="0"
    @contextmenu="openMenu($event, null)"
    @click="panelRef?.focus()"
  >
    <div class="panel-header">
      <button type="button" class="section-toggle" :title="rootPath || ''" @click="treeSectionOpen = !treeSectionOpen">
        <span class="section-chevron" :class="{ open: treeSectionOpen }">›</span>
        <span class="panel-title">{{ projectTitle }}</span>
      </button>
      <div class="header-actions">
        <button type="button" class="hdr-btn" title="新建文件" :disabled="!rootPath" @click="onNewFile">
          <svg class="hdr-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4.5 1.5h5.2l3.3 3.3v8.7a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5z" stroke="currentColor" />
            <path d="M9.7 1.5V4.8h3.3" stroke="currentColor" />
            <path d="M10.5 11.5h2.5M11.75 10.25v2.5" stroke="currentColor" />
          </svg>
        </button>
        <button type="button" class="hdr-btn" title="新建文件夹" :disabled="!rootPath" @click="onNewFolder">
          <svg class="hdr-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4.5h4.2l1 1h5.8v6.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5z" stroke="currentColor" />
            <path d="M10.5 11.5h2.5M11.75 10.25v2.5" stroke="currentColor" />
          </svg>
        </button>
        <button type="button" class="hdr-btn" title="刷新" :disabled="!rootPath" @click="refresh">
          <svg class="hdr-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M13.2 2.8A6 6 0 1 0 12.8 9" stroke="currentColor" stroke-linecap="round" />
            <path d="M13.2 2.8V6h-3.2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button type="button" class="hdr-btn" title="全部折叠" :disabled="!rootPath" @click="collapseAll">
          <svg class="hdr-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="5.5" width="6" height="6" rx="0.5" stroke="currentColor" />
            <rect x="5.5" y="3" width="6" height="6" rx="0.5" stroke="currentColor" />
            <path d="M7.5 6h2" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </div>
    <div ref="explorerSplitRef" class="explorer-split">
    <div
      class="tree-pane"
      :style="{ height: `${treePaneHeight}px` }"
    >
    <div
      v-show="treeSectionOpen"
      class="tree"
      @dragover="rootPath && dragPath && onDragOver($event, rootPath)"
      @dragleave="onDragLeaveItem(rootPath)"
      @drop="rootPath && onDrop($event, rootPath)"
    >
      <div
        v-for="{ node, depth, pending } in flatNodes"
        :key="pending ? `pending-${pending}` : node.path"
        class="tree-item"
        :class="{
          active: !pending && activeFilePath === node.path,
          folder: node.type === 'directory',
          pending: !!pending,
          'drag-over': !pending && dropHighlightPath === dropTargetDir(node),
          dragging: dragPath === node.path,
        }"
        :style="{ paddingLeft: `${8 + depth * 12}px` }"
        :draggable="!pending"
        @click="
          !pending &&
            ((focusedNode = node),
            node.type === 'directory' ? toggleExpand(node) : onFileClick(node))
        "
        @contextmenu="!pending && openMenu($event, node)"
        @dragstart="!pending && onDragStart($event, node)"
        @dragend="onDragEnd"
        @dragover.stop="!pending && onDragOver($event, dropTargetDir(node))"
        @dragleave="!pending && onDragLeaveItem(dropTargetDir(node))"
        @drop.stop="!pending && onDrop($event, dropTargetDir(node))"
      >
        <span v-if="node.type === 'directory'" class="chevron" :class="{ open: expanded.has(node.path) }">›</span>
        <span v-else class="chevron placeholder" />
        <span v-if="node.type !== 'directory'" class="file-icon" :class="fileKind(node.name)" />
        <input
          v-if="pending === 'file' && creatingFile"
          ref="newFileInput"
          v-model="creatingFile.name"
          class="rename-input"
          @click.stop
          @keydown.enter="commitNewFile"
          @keydown.escape="cancelNewFile"
          @blur="commitNewFile"
        />
        <input
          v-else-if="pending === 'folder' && creatingFolder"
          ref="newFolderInput"
          v-model="creatingFolder.name"
          class="rename-input"
          @click.stop
          @keydown.enter="commitNewFolder"
          @keydown.escape="cancelNewFolder"
          @blur="commitNewFolder"
        />
        <input
          v-else-if="renamingPath === node.path"
          ref="renameInput"
          v-model="renameValue"
          class="rename-input"
          @click.stop
          @keydown.enter="commitRename"
          @keydown.escape="cancelRename"
          @blur="commitRename"
        />
        <span v-else class="file-name">{{ node.name }}</span>
      </div>
      <div v-if="!rootPath" class="tree-empty">
        <p>尚未打开项目</p>
        <button type="button" class="open-project-btn" @click="openProject">打开项目</button>
      </div>
      <div v-else-if="!flatNodes.length" class="tree-empty">项目为空</div>
    </div>
    </div>
    <div
      class="tree-outline-split-handle"
      :class="{ dragging: treeSplitDragging }"
      title="拖动调整文件树与大纲高度"
      @pointerdown="onTreeSplitPointerDown"
      @pointermove="onTreeSplitPointerMove"
      @pointerup="onTreeSplitPointerUp"
      @pointercancel="onTreeSplitPointerUp"
    />
    <div class="bottom-panels">
    <div class="panel-section">
      <button type="button" class="section-head" @click="outlineOpen = !outlineOpen">
        大纲 {{ outlineOpen ? '▾' : '▸' }}
      </button>
      <ul v-if="outlineOpen" class="outline-list">
        <li v-if="!outlineItems?.length" class="section-empty">当前文件无标题</li>
        <li
          v-for="(item, i) in outlineItems"
          :key="i"
          class="outline-item"
          :style="{ paddingLeft: `${12 + (item.level - 1) * 12}px` }"
          @click="emit('outline-jump', item.line)"
        >
          {{ item.text }}
        </li>
      </ul>
    </div>
    <div class="panel-section">
      <button type="button" class="section-head" @click="timelineOpen = !timelineOpen">
        时间线 {{ timelineOpen ? '▾' : '▸' }}
      </button>
      <ul v-if="timelineOpen" class="outline-list">
        <li v-if="!recentFiles?.length" class="section-empty">暂无最近文件</li>
        <li
          v-for="f in recentFiles"
          :key="f"
          class="outline-item recent"
          :title="f"
          @click="emit('open-file', f)"
        >
          {{ baseName(f) }}
        </li>
      </ul>
    </div>
    </div>
    </div>

    <ul
      v-if="menuVisible"
      class="context-menu"
      :style="{ left: `${menuX}px`, top: `${menuY}px` }"
      @click.stop
    >
      <li @click="openProject">Open Project…</li>
      <li class="sep" />
      <li :class="{ disabled: !rootPath }" @click="rootPath && onNewFile()">New File</li>
      <li :class="{ disabled: !rootPath }" @click="rootPath && onNewFolder()">New Folder</li>
      <li class="sep" />
      <li :class="{ disabled: !menuTarget }" @click="menuTarget && onCut()">Cut</li>
      <li :class="{ disabled: !menuTarget }" @click="menuTarget && onCopy()">Copy</li>
      <li :class="{ disabled: !clipboard }" @click="clipboard && onPaste()">Paste</li>
      <li class="sep" />
      <li :class="{ disabled: !menuTarget }" @click="menuTarget && startRename()">Rename…</li>
      <li :class="{ disabled: !menuTarget }" @click="menuTarget && onDelete()">Delete</li>
      <li v-if="isMenuMdFile()" class="sep" />
      <li v-if="isMenuMdFile()" @click="onExportPdf()">Export PDF…</li>
      <li v-if="isMenuMdFile()" @click="onExportDocx()">Export DOCX…</li>
      <li class="sep" />
      <li :class="{ disabled: !menuTarget }" @click="menuTarget && onReveal()">Reveal in Finder</li>
      <li :class="{ disabled: !menuTarget }" @click="menuTarget && onCopyPath()">Copy Path</li>
    </ul>
  </aside>
</template>

<style scoped>
.file-explorer {
  width: 100%;
  background: var(--wc-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  position: relative;
}

.panel-header {
  position: relative;
  padding: 4px 8px 4px 8px;
  display: flex;
  align-items: center;
  min-height: 26px;
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
  padding: 2px 4px;
  border-radius: 4px;
  text-align: left;
}

.section-toggle:hover {
  background: var(--wc-hover);
}

.section-chevron {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
  font-size: 14px;
  color: var(--wc-text-muted);
  transition: transform 0.15s;
}

.section-chevron.open {
  transform: rotate(90deg);
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}

:global(.primary-side:hover) .header-actions {
  opacity: 1;
  pointer-events: auto;
}

.hdr-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--wc-text-muted);
}

.hdr-btn:hover:not(:disabled) {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.hdr-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.hdr-icon {
  width: 16px;
  height: 16px;
  display: block;
  stroke-width: 1;
}

.explorer-split {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tree-pane {
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px 8px;
}

.tree-outline-split-handle {
  flex-shrink: 0;
  height: 5px;
  margin: 0;
  cursor: row-resize;
  touch-action: none;
  user-select: none;
  position: relative;
  background: transparent;
}

.tree-outline-split-handle::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 2px;
  height: 1px;
  background: var(--wc-border);
}

.tree-outline-split-handle:hover::before,
.tree-outline-split-handle.dragging::before {
  background: var(--wc-border-light);
}

.bottom-panels {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--wc-text-muted);
  text-align: center;
}

.tree-empty p {
  margin: 0 0 12px;
}

.open-project-btn {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 4px;
  background: var(--wc-accent, #0e639c);
  color: #fff;
}

.open-project-btn:hover {
  opacity: 0.9;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}

.tree-item:hover {
  background: var(--wc-hover);
}

.tree-item.active {
  background: var(--wc-active);
}

.tree-item.pending {
  background: var(--wc-active);
}

.tree-item.dragging {
  opacity: 0.45;
}

.tree-item.drag-over {
  outline: 1px solid var(--wc-accent);
  outline-offset: -1px;
  background: var(--wc-active);
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

.chevron.placeholder {
  visibility: hidden;
}

.file-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.file-icon.kind-file {
  background: #8b8b8b;
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

.file-icon.kind-image {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='2' y='5' width='7' height='7' rx='1' fill='none' stroke='%23a855f7' stroke-width='1'/%3E%3Crect x='5' y='2' width='7' height='7' rx='1' fill='%23252526' stroke='%23a855f7' stroke-width='1'/%3E%3Cpath d='M6.5 7.5l1.2-1.2L9 7.5l.8-1 1.7 1.2V8.5H6.5v-1z' fill='%23c4b5fd'/%3E%3Ccircle cx='9.5' cy='4.5' r='.6' fill='%23c4b5fd'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-icon.kind-vue {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%2342b883' d='M8 2.5L2 13h3.5l.5-1h4l.5 1H14L8 2.5zm0 3.2l2.8 5.3H5.2L8 5.7z'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.rename-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  padding: 0 4px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-accent);
  border-radius: 2px;
  color: var(--wc-text);
}

.panel-section {
  flex-shrink: 0;
  border-top: 1px solid var(--wc-border);
  min-height: 0;
}

.bottom-panels .panel-section:first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-top: none;
}

.section-head {
  width: 100%;
  text-align: left;
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--wc-text-muted);
}

.section-head:hover {
  color: var(--wc-text);
}

.outline-list {
  list-style: none;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.outline-item {
  padding: 4px 16px;
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-item:hover {
  background: var(--wc-hover);
}

.outline-item.recent {
  color: var(--wc-text-muted);
}

.section-empty {
  padding: 6px 16px;
  font-size: 11px;
  color: var(--wc-text-dim);
}

.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 180px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--wc-bg-dark);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  font-size: 13px;
}

.context-menu li {
  padding: 6px 20px;
  cursor: pointer;
}

.context-menu li:hover:not(.disabled):not(.sep) {
  background: var(--wc-active);
}

.context-menu li.disabled {
  opacity: 0.4;
  cursor: default;
}

.context-menu li.sep {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background: var(--wc-border);
  cursor: default;
}
</style>
