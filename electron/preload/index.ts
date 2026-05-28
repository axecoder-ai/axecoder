import { ipcRenderer, contextBridge } from 'electron'
import type { MenuChannel } from '../../src/types/writcraft'

/** Electron IPC 只能传可 structured clone 的值；Vue 响应式对象会报 could not be cloned */
const cloneForIpc = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const menuChannels: MenuChannel[] = [
  'menu:save',
  'menu:saveAs',
  'menu:closeTab',
  'menu:newFile',
  'menu:openFile',
  'menu:find',
  'menu:findInFiles',
  'menu:toggleChat',
  'menu:toggleAgents',
  'menu:toggleTerminal',
  'menu:commandPalette',
]

contextBridge.exposeInMainWorld('writcraft', {
  getWindowLayout: () =>
    ipcRenderer.invoke('window:getLayout') as Promise<{ fullscreen: boolean; platform: string }>,
  onWindowLayout: (callback: (layout: { fullscreen: boolean; platform: string }) => void) => {
    const listener = (_: unknown, layout: { fullscreen: boolean; platform: string }) => callback(layout)
    ipcRenderer.on('window:layout', listener)
    return () => ipcRenderer.off('window:layout', listener)
  },
  getLastProject: () => ipcRenderer.invoke('fs:getLastProject') as Promise<string | null>,
  openProject: (rootPath?: string) =>
    ipcRenderer.invoke('fs:openProject', rootPath) as Promise<{ rootPath: string; tree: import('../main/fs-ipc').FileNode } | null>,
  openFolder: () =>
    ipcRenderer.invoke('fs:openFolder') as Promise<{ rootPath: string; tree: import('../main/fs-ipc').FileNode } | null>,
  openFile: () =>
    ipcRenderer.invoke('fs:openFile') as Promise<{ path: string; content: string } | null>,
  onOpenProject: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('project:open', listener)
    return () => ipcRenderer.off('project:open', listener)
  },
  onMenuAction: (callback: (channel: MenuChannel) => void) => {
    const listeners = menuChannels.map((ch) => {
      const listener = () => callback(ch)
      ipcRenderer.on(ch, listener)
      return { ch, listener }
    })
    return () => {
      for (const { ch, listener } of listeners) ipcRenderer.off(ch, listener)
    }
  },
  onBeforeQuit: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('app:beforeQuit', listener)
    return () => ipcRenderer.off('app:beforeQuit', listener)
  },
  onFileChanged: (callback: (payload: { kind: string; path: string }) => void) => {
    const listener = (_: unknown, payload: { kind: string; path: string }) => callback(payload)
    ipcRenderer.on('fs:fileChanged', listener)
    return () => ipcRenderer.off('fs:fileChanged', listener)
  },
  confirmQuit: () => ipcRenderer.send('app:confirmQuit'),
  readTree: (rootPath: string) =>
    ipcRenderer.invoke('fs:readTree', rootPath) as Promise<{ rootPath: string; tree: import('../main/fs-ipc').FileNode }>,
  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readFile', filePath) as Promise<{ content: string }>,
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content) as Promise<{ ok: true }>,
  saveAs: (content: string, defaultPath?: string) =>
    ipcRenderer.invoke('fs:saveAs', content, defaultPath) as Promise<{ path: string } | null>,
  createFile: (parentPath: string, name: string) =>
    ipcRenderer.invoke('fs:createFile', parentPath, name) as Promise<{ path: string }>,
  createDir: (parentPath: string, name: string) =>
    ipcRenderer.invoke('fs:createDir', parentPath, name) as Promise<{ path: string }>,
  delete: (targetPath: string) => ipcRenderer.invoke('fs:delete', targetPath) as Promise<{ ok: true }>,
  rename: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('fs:rename', oldPath, newPath) as Promise<{ path: string }>,
  copy: (srcPath: string, destPath: string, onConflict?: import('../../src/types/writcraft').ConflictAction) =>
    ipcRenderer.invoke('fs:copy', srcPath, destPath, onConflict) as Promise<{ path: string; skipped?: true }>,
  move: (srcPath: string, destPath: string, onConflict?: import('../../src/types/writcraft').ConflictAction) =>
    ipcRenderer.invoke('fs:move', srcPath, destPath, onConflict) as Promise<{ path: string; skipped?: true }>,
  revealInFinder: (targetPath: string) =>
    ipcRenderer.invoke('fs:revealInFinder', targetPath) as Promise<{ ok: true }>,
  exportMarkdownPdf: (filePath: string) =>
    ipcRenderer.invoke('fs:exportMarkdownPdf', filePath) as Promise<
      { ok: true; path: string } | { cancelled: true }
    >,
  exportMarkdownDocx: (filePath: string) =>
    ipcRenderer.invoke('fs:exportMarkdownDocx', filePath) as Promise<
      { ok: true; path: string } | { cancelled: true }
    >,
  search: (rootPath: string, query: string) =>
    ipcRenderer.invoke('fs:search', rootPath, query) as Promise<{ hits: import('../../src/types/writcraft').SearchHit[] }>,
  readBackgroundMaterials: (projectRoot: string) =>
    ipcRenderer.invoke('fs:readBackgroundMaterials', cloneForIpc(projectRoot)) as Promise<
      import('../../src/types/writcraft').BackgroundMaterialsResult
    >,
  initBackground: (projectRoot: string, modelId?: string) =>
    ipcRenderer.invoke('fs:initBackground', cloneForIpc(projectRoot), modelId) as Promise<
      import('../../src/types/writcraft').InitBackgroundResult
    >,
  onBackgroundInitProgress: (
    callback: (payload: import('../../src/types/writcraft').BackgroundInitProgressPayload) => void,
  ) => {
    const listener = (
      _: unknown,
      payload: import('../../src/types/writcraft').BackgroundInitProgressPayload,
    ) => callback(payload)
    ipcRenderer.on('background:initProgress', listener)
    return () => ipcRenderer.off('background:initProgress', listener)
  },
  getRecentFiles: () => ipcRenderer.invoke('fs:getRecentFiles') as Promise<{ files: string[] }>,
  getRecentProjects: () =>
    ipcRenderer.invoke('fs:getRecentProjects') as Promise<{ projects: string[] }>,
  watchStart: (rootPath: string) => ipcRenderer.invoke('fs:watchStart', rootPath) as Promise<{ ok: true }>,
  watchStop: () => ipcRenderer.invoke('fs:watchStop') as Promise<{ ok: true }>,
  getSettings: () => ipcRenderer.invoke('fs:getSettings') as Promise<import('../../src/types/writcraft').AppSettings>,
  setSettings: (partial: Partial<import('../../src/types/writcraft').AppSettings>) =>
    ipcRenderer.invoke('fs:setSettings', partial) as Promise<import('../../src/types/writcraft').AppSettings>,
  listModels: () =>
    ipcRenderer.invoke('models:list') as Promise<import('../../src/types/writcraft').ModelsFile>,
  saveModel: (input: import('../../src/types/writcraft').ModelSaveInput) =>
    ipcRenderer.invoke('models:save', input) as Promise<import('../../src/types/writcraft').ModelsMutationResult>,
  deleteModel: (id: string) =>
    ipcRenderer.invoke('models:delete', id) as Promise<import('../../src/types/writcraft').ModelsMutationResult>,
  toggleModel: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('models:toggle', id, enabled) as Promise<
      import('../../src/types/writcraft').ModelsMutationResult
    >,
  setActiveModel: (id: string) =>
    ipcRenderer.invoke('models:setActive', id) as Promise<import('../../src/types/writcraft').ModelsMutationResult>,
  expandChatUserWithFiles: (projectRoot: string, text: string, filePaths: string[]) =>
    ipcRenderer.invoke(
      'chat:expandUserWithFiles',
      cloneForIpc(projectRoot),
      cloneForIpc(text),
      cloneForIpc(filePaths),
    ) as Promise<string>,
  aiChat: (modelId: string, messages: import('../../src/types/writcraft').AiChatMessage[]) =>
    ipcRenderer.invoke(
      'ai:chat',
      modelId,
      JSON.parse(JSON.stringify(messages)),
    ) as Promise<import('../../src/types/writcraft').AiChatResult>,
  agentSend: (
    projectRoot: string,
    modelId: string,
    messages: import('../../src/types/writcraft').AiChatMessage[],
  ) =>
    ipcRenderer.invoke(
      'agent:send',
      cloneForIpc(projectRoot),
      modelId,
      JSON.parse(JSON.stringify(messages)),
    ) as Promise<import('../../src/types/writcraft').AgentSendResult>,
  agentConfirmWrite: (sessionId: string, pendingId: string) =>
    ipcRenderer.invoke('agent:confirmWrite', sessionId, pendingId) as Promise<
      import('../../src/types/writcraft').AgentContinueResult
    >,
  agentRejectWrite: (sessionId: string, pendingId: string, reason?: string) =>
    ipcRenderer.invoke('agent:rejectWrite', sessionId, pendingId, reason) as Promise<
      import('../../src/types/writcraft').AgentContinueResult
    >,
  onAgentProgress: (callback: (payload: import('../../src/types/writcraft').AgentProgressPayload) => void) => {
    const listener = (_: unknown, payload: import('../../src/types/writcraft').AgentProgressPayload) =>
      callback(payload)
    ipcRenderer.on('agent:progress', listener)
    return () => ipcRenderer.off('agent:progress', listener)
  },
  gitStatus: (cwd: string) =>
    ipcRenderer.invoke('git:status', cwd) as Promise<import('../../src/types/writcraft').GitStatusResult>,
  terminalStart: (cwd: string) => ipcRenderer.invoke('terminal:start', cwd) as Promise<{ ok: true }>,
  terminalWrite: (data: string) => ipcRenderer.invoke('terminal:write', data) as Promise<{ ok: boolean }>,
  terminalStop: () => ipcRenderer.invoke('terminal:stop') as Promise<{ ok: true }>,
  onTerminalData: (callback: (text: string) => void) => {
    const listener = (_: unknown, text: string) => callback(text)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.off('terminal:data', listener)
  },
  getChatSessions: (projectRoot: string) =>
    ipcRenderer.invoke('chat:getSessions', projectRoot) as Promise<{
      sessions: import('../../src/types/writcraft').ChatSessionMeta[]
    }>,
  getChatSession: (projectRoot: string, sessionId: string) =>
    ipcRenderer.invoke('chat:getSession', projectRoot, sessionId) as Promise<{
      session: import('../../src/types/writcraft').ChatSession | null
    }>,
  saveChatSession: (projectRoot: string, session: import('../../src/types/writcraft').ChatSession) =>
    ipcRenderer.invoke('chat:saveSession', cloneForIpc(projectRoot), cloneForIpc(session)) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  deleteChatSession: (projectRoot: string, sessionId: string) =>
    ipcRenderer.invoke('chat:deleteSession', projectRoot, sessionId) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
})

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  },
}

function useLoading() {
  const styleContent = `
@keyframes donkey-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
  z-index: 9;
}
.app-loading-donkey {
  width: 80px;
  height: 80px;
  animation: donkey-bounce 1.1s ease-in-out infinite;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML =
    '<img class="app-loading-donkey" src="./donkey-loading.png" width="80" height="80" alt="" />'

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
