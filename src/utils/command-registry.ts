import type { PaletteCommand } from '../components/workbench/CommandPalette.vue'

export type RegistryCommand = PaletteCommand & {
  run: () => void | Promise<void>
}

const commands: RegistryCommand[] = []

export const registerCommand = (cmd: RegistryCommand) => {
  const idx = commands.findIndex((c) => c.id === cmd.id)
  if (idx >= 0) commands[idx] = cmd
  else commands.push(cmd)
}

export const getCommands = (): PaletteCommand[] =>
  commands.map(({ id, label, shortcut }) => ({ id, label, shortcut }))

export const fuzzyFilterCommands = (query: string, list: PaletteCommand[]): PaletteCommand[] => {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const scored = list
    .map((c) => {
      const label = c.label.toLowerCase()
      let score = -1
      if (label.startsWith(q)) score = 100
      else if (label.includes(q)) score = 50
      else {
        let qi = 0
        for (let i = 0; i < label.length && qi < q.length; i++) {
          if (label[i] === q[qi]) qi++
        }
        if (qi === q.length) score = 20
      }
      return { c, score }
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
  return scored.map((x) => x.c)
}

export const runCommandById = async (id: string) => {
  const cmd = commands.find((c) => c.id === id)
  if (cmd) await cmd.run()
}

export type WorkbenchCommandHandlers = {
  save: () => void | Promise<void>
  saveAll: () => void | Promise<void>
  saveAs: () => void | Promise<void>
  closeTab: () => void | Promise<void>
  openProject: () => void | Promise<void>
  openFile: () => void | Promise<void>
  newFile: () => void
  find: () => void
  findInFiles: () => void
  quickOpen: () => void | Promise<void>
  formatDocument: () => void | Promise<void>
  splitHorizontal: () => void
  splitVertical: () => void
  closeSplit: () => void
  scmStageAll: () => void | Promise<void>
  toggleTerminal: () => void
  toggleChat: () => void
  toggleScm: () => void
  settings: () => void | Promise<void>
  toggleMetrics?: () => void
  toggleTrace?: () => void | Promise<void>
}

export const setupWorkbenchCommands = (h: WorkbenchCommandHandlers) => {
  const defs: Omit<RegistryCommand, 'run'>[] = [
    { id: 'save', label: 'Save', shortcut: '⌘S' },
    { id: 'saveAll', label: 'Save All', shortcut: '' },
    { id: 'saveAs', label: 'Save As', shortcut: '⌘⇧S' },
    { id: 'closeTab', label: 'Close Editor', shortcut: '⌘W' },
    { id: 'openProject', label: 'Open Project', shortcut: '⌘O' },
    { id: 'openFile', label: 'Open File', shortcut: '⌘⇧O' },
    { id: 'newFile', label: 'New File', shortcut: '⌘N' },
    { id: 'find', label: 'Find', shortcut: '⌘F' },
    { id: 'findInFiles', label: 'Find in Files', shortcut: '⌘⇧F' },
    { id: 'quickOpen', label: 'Quick Open', shortcut: '⌘P' },
    { id: 'formatDocument', label: 'Format Document', shortcut: '⇧⌥F' },
    { id: 'splitHorizontal', label: 'Split Editor Right', shortcut: '' },
    { id: 'splitVertical', label: 'Split Editor Down', shortcut: '' },
    { id: 'closeSplit', label: 'Close Split', shortcut: '' },
    { id: 'scmStageAll', label: 'SCM: Stage All', shortcut: '' },
    { id: 'toggleTerminal', label: 'Toggle Terminal', shortcut: '⌃`' },
    { id: 'toggleChat', label: 'Toggle AI Panel', shortcut: '' },
    { id: 'toggleScm', label: 'Source Control', shortcut: '⌃⇧G' },
    { id: 'settings', label: 'Settings', shortcut: '' },
    { id: 'toggleMetrics', label: 'Toggle Metrics', shortcut: '' },
    { id: 'toggleTrace', label: 'Toggle Trace', shortcut: '' },
  ]
  const runs: Record<string, () => void | Promise<void>> = {
    save: h.save,
    saveAll: h.saveAll,
    saveAs: h.saveAs,
    closeTab: h.closeTab,
    openProject: h.openProject,
    openFile: h.openFile,
    newFile: h.newFile,
    find: h.find,
    findInFiles: h.findInFiles,
    quickOpen: h.quickOpen,
    formatDocument: h.formatDocument,
    splitHorizontal: h.splitHorizontal,
    splitVertical: h.splitVertical,
    closeSplit: h.closeSplit,
    scmStageAll: h.scmStageAll,
    toggleTerminal: h.toggleTerminal,
    toggleChat: h.toggleChat,
    toggleScm: h.toggleScm,
    settings: h.settings,
    toggleMetrics: h.toggleMetrics ?? (() => {}),
    toggleTrace: h.toggleTrace ?? (() => {}),
  }
  for (const d of defs) {
    registerCommand({ ...d, run: runs[d.id]! })
  }
}
