import { ipcRenderer, contextBridge } from 'electron'
import type { MenuChannel } from '../../src/types/axecoder'

/** Electron IPC 只能传可 structured clone 的值；Vue 响应式对象会报 could not be cloned */
const cloneForIpc = <T>(value: T): T => {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

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
  'menu:quickOpen',
]

contextBridge.exposeInMainWorld('axecoder', {
  getWindowLayout: () =>
    ipcRenderer.invoke('window:getLayout') as Promise<{ fullscreen: boolean; platform: string }>,
  onWindowLayout: (callback: (layout: { fullscreen: boolean; platform: string }) => void) => {
    const listener = (_: unknown, layout: { fullscreen: boolean; platform: string }) => callback(layout)
    ipcRenderer.on('window:layout', listener)
    return () => ipcRenderer.off('window:layout', listener)
  },
  getWindowRole: () =>
    ipcRenderer.invoke('window:getRole') as Promise<'main' | 'companion' | 'metrics' | 'trace'>,
  isCompanionWindowOpen: () => ipcRenderer.invoke('window:isCompanionOpen') as Promise<boolean>,
  openCompanionWindow: () => ipcRenderer.invoke('window:openCompanion') as Promise<boolean>,
  closeCompanionWindow: () => ipcRenderer.invoke('window:closeCompanion') as Promise<boolean>,
  onCompanionWindowState: (callback: (open: boolean) => void) => {
    const listener = (_: unknown, open: boolean) => callback(open)
    ipcRenderer.on('window:companionState', listener)
    return () => ipcRenderer.off('window:companionState', listener)
  },
  isMetricsWindowDetached: () => ipcRenderer.invoke('window:isMetricsDetached') as Promise<boolean>,
  openMetricsWindow: () => ipcRenderer.invoke('window:openMetrics') as Promise<boolean>,
  closeMetricsWindow: () => ipcRenderer.invoke('window:closeMetrics') as Promise<boolean>,
  setWindowBackgroundTheme: (theme: import('../../src/types/axecoder').AppTheme) =>
    ipcRenderer.invoke('window:setBackgroundTheme', theme) as Promise<boolean>,
  onMetricsWindowDetached: (callback: (detached: boolean) => void) => {
    const listener = (_: unknown, detached: boolean) => callback(detached)
    ipcRenderer.on('window:metricsDetached', listener)
    return () => ipcRenderer.off('window:metricsDetached', listener)
  },
  getAiMetricsSnapshot: (filter?: string | import('../../src/types/axecoder').AiMetricsFilter) =>
    ipcRenderer.invoke('aiMetrics:getSnapshot', filter) as Promise<
      import('../../src/types/axecoder').AiMetricsSnapshot
    >,
  onAiMetricsUpdate: (callback: (snapshot: import('../../src/types/axecoder').AiMetricsSnapshot) => void) => {
    const listener = (_: unknown, snapshot: import('../../src/types/axecoder').AiMetricsSnapshot) =>
      callback(snapshot)
    ipcRenderer.on('aiMetrics:update', listener)
    return () => ipcRenderer.off('aiMetrics:update', listener)
  },
  onAiMetricsActivity: (
    callback: (lines: import('../../src/types/axecoder').AiMetricsActivityLine[]) => void,
  ) => {
    const listener = (_: unknown, lines: import('../../src/types/axecoder').AiMetricsActivityLine[]) =>
      callback(lines)
    ipcRenderer.on('aiMetrics:activity', listener)
    return () => ipcRenderer.off('aiMetrics:activity', listener)
  },
  isTraceWindowDetached: () => ipcRenderer.invoke('window:isTraceDetached') as Promise<boolean>,
  openTraceWindow: () => ipcRenderer.invoke('window:openTrace') as Promise<boolean>,
  closeTraceWindow: () => ipcRenderer.invoke('window:closeTrace') as Promise<boolean>,
  onTraceWindowDetached: (callback: (detached: boolean) => void) => {
    const listener = (_: unknown, detached: boolean) => callback(detached)
    ipcRenderer.on('window:traceDetached', listener)
    return () => ipcRenderer.off('window:traceDetached', listener)
  },
  getAiTraceState: () =>
    ipcRenderer.invoke('aiTrace:getState') as Promise<import('../../src/types/axecoder').AiTraceState>,
  setAiTraceRecording: (on: boolean) =>
    ipcRenderer.invoke('aiTrace:setRecording', on) as Promise<import('../../src/types/axecoder').AiTraceState>,
  clearAiTrace: () =>
    ipcRenderer.invoke('aiTrace:clear') as Promise<import('../../src/types/axecoder').AiTraceState>,
  saveAiTrace: () =>
    ipcRenderer.invoke('aiTrace:save') as Promise<
      { ok: true; path: string } | { ok: false; error: string }
    >,
  onAiTraceUpdate: (callback: (state: import('../../src/types/axecoder').AiTraceState) => void) => {
    const listener = (_: unknown, state: import('../../src/types/axecoder').AiTraceState) => callback(state)
    ipcRenderer.on('aiTrace:update', listener)
    return () => ipcRenderer.off('aiTrace:update', listener)
  },
  getStartupProjectPath: () =>
    ipcRenderer.invoke('app:getStartupProjectPath') as Promise<string | null>,
  getLastProject: () => ipcRenderer.invoke('fs:getLastProject') as Promise<string | null>,
  openProject: (rootPath?: string) =>
    ipcRenderer.invoke('fs:openProject', rootPath) as Promise<{ rootPath: string; tree: import('../main/fs-ipc').FileNode } | null>,
  openFolder: () =>
    ipcRenderer.invoke('fs:openFolder') as Promise<{ rootPath: string; tree: import('../main/fs-ipc').FileNode } | null>,
  codeGraphStatus: (projectRoot: string) =>
    ipcRenderer.invoke('codegraph:status', projectRoot) as Promise<import('../../src/types/axecoder').CodeGraphPublicStatus>,
  codeGraphIndex: (projectRoot: string) =>
    ipcRenderer.invoke('codegraph:index', projectRoot) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  openFile: () =>
    ipcRenderer.invoke('fs:openFile') as Promise<{ path: string; content: string } | null>,
  onOpenProject: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('project:open', listener)
    return () => ipcRenderer.off('project:open', listener)
  },
  onOpenProjectAt: (callback: (projectPath: string) => void) => {
    const listener = (_: unknown, projectPath: string) => callback(projectPath)
    ipcRenderer.on('project:openAt', listener)
    return () => ipcRenderer.off('project:openAt', listener)
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
  readFileBase64: (filePath: string) =>
    ipcRenderer.invoke('fs:readFileBase64', filePath) as Promise<{ base64: string; mimeType: string }>,
  previewDocx: (filePath: string) =>
    ipcRenderer.invoke('fs:previewDocx', filePath) as Promise<{ html: string }>,
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
  copy: (srcPath: string, destPath: string, onConflict?: import('../../src/types/axecoder').ConflictAction) =>
    ipcRenderer.invoke('fs:copy', srcPath, destPath, onConflict) as Promise<{ path: string; skipped?: true }>,
  move: (srcPath: string, destPath: string, onConflict?: import('../../src/types/axecoder').ConflictAction) =>
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
  search: (rootPath: string, query: string, opts?: import('../../src/types/axecoder').SearchOptions) =>
    ipcRenderer.invoke('fs:search', rootPath, query, opts) as Promise<{ hits: import('../../src/types/axecoder').SearchHit[] }>,
  searchReplace: (
    rootPath: string,
    query: string,
    replacement: string,
    opts?: import('../../src/types/axecoder').SearchOptions,
  ) =>
    ipcRenderer.invoke('fs:searchReplace', rootPath, query, replacement, opts) as Promise<
      import('../../src/types/axecoder').SearchReplaceResult
    >,
  listProjectFiles: (rootPath: string) =>
    ipcRenderer.invoke('fs:listProjectFiles', rootPath) as Promise<{ files: string[] }>,
  getRecentFiles: () => ipcRenderer.invoke('fs:getRecentFiles') as Promise<{ files: string[] }>,
  getRecentProjects: () =>
    ipcRenderer.invoke('fs:getRecentProjects') as Promise<{ projects: string[] }>,
  watchStart: (rootPath: string) => ipcRenderer.invoke('fs:watchStart', rootPath) as Promise<{ ok: true }>,
  watchStop: () => ipcRenderer.invoke('fs:watchStop') as Promise<{ ok: true }>,
  getSettings: () => ipcRenderer.invoke('fs:getSettings') as Promise<import('../../src/types/axecoder').AppSettings>,
  setSettings: (partial: Partial<import('../../src/types/axecoder').AppSettings>) =>
    ipcRenderer.invoke('fs:setSettings', partial) as Promise<import('../../src/types/axecoder').AppSettings>,
  permissionsGet: (projectRoot: string) =>
    ipcRenderer.invoke('permissions:get', projectRoot) as Promise<
      | { ok: true; data: import('../../src/types/axecoder').PermissionsView }
      | { ok: false; error: string }
    >,
  permissionsSetGlobal: (input: {
    agentPermissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
    allow?: string[]
    ask?: string[]
    deny?: string[]
  }) =>
    ipcRenderer.invoke('permissions:setGlobal', input) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  permissionsSetProject: (
    projectRoot: string,
    input: Partial<import('../../src/types/axecoder').PermissionsPolicy>,
  ) =>
    ipcRenderer.invoke('permissions:setProject', projectRoot, input) as Promise<
      | { ok: true; data: import('../../src/types/axecoder').PermissionsPolicy }
      | { ok: false; error: string }
    >,
  permissionsWriteProjectJson: (projectRoot: string, jsonText: string) =>
    ipcRenderer.invoke('permissions:writeProjectJson', projectRoot, jsonText) as Promise<
      | { ok: true; data: import('../../src/types/axecoder').PermissionsPolicy }
      | { ok: false; error: string }
    >,
  permissionsWriteGlobalJson: (jsonText: string) =>
    ipcRenderer.invoke('permissions:writeGlobalJson', jsonText) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  onThemeChange: (callback: (theme: import('../../src/types/axecoder').AppTheme) => void) => {
    const listener = (_: unknown, theme: import('../../src/types/axecoder').AppTheme) => callback(theme)
    ipcRenderer.on('settings:theme', listener)
    return () => ipcRenderer.off('settings:theme', listener)
  },
  pickCompletionSound: () =>
    ipcRenderer.invoke('fs:pickCompletionSound') as Promise<
      import('../../src/types/axecoder').PickCompletionSoundResult
    >,
  getCompletionSoundDataUrl: () =>
    ipcRenderer.invoke('fs:getCompletionSoundDataUrl') as Promise<
      import('../../src/types/axecoder').CompletionSoundDataUrlResult
    >,
  pickProfileAvatar: () =>
    ipcRenderer.invoke('fs:pickProfileAvatar') as Promise<
      import('../../src/types/axecoder').PickProfileAvatarResult
    >,
  listModels: () =>
    ipcRenderer.invoke('models:list') as Promise<import('../../src/types/axecoder').ModelsFile>,
  saveModel: (input: import('../../src/types/axecoder').ModelSaveInput) =>
    ipcRenderer.invoke('models:save', input) as Promise<import('../../src/types/axecoder').ModelsMutationResult>,
  deleteModel: (id: string) =>
    ipcRenderer.invoke('models:delete', id) as Promise<import('../../src/types/axecoder').ModelsMutationResult>,
  toggleModel: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('models:toggle', id, enabled) as Promise<
      import('../../src/types/axecoder').ModelsMutationResult
    >,
  setActiveModel: (id: string) =>
    ipcRenderer.invoke('models:setActive', id) as Promise<import('../../src/types/axecoder').ModelsMutationResult>,
  pingModel: (id: string) =>
    ipcRenderer.invoke('models:ping', id) as Promise<import('../../src/types/axecoder').ModelPingResult>,
  getProviderCapabilities: () =>
    ipcRenderer.invoke('models:getProviderCapabilities') as Promise<
      Record<import('../../src/types/axecoder').ModelProvider, import('../../src/types/axecoder').AiProviderCapabilities>
    >,
  listMcpPlugins: (projectRoot?: string) =>
    ipcRenderer.invoke('mcpPlugins:list', projectRoot ? cloneForIpc(projectRoot) : undefined) as Promise<
      import('../../src/types/axecoder').McpPluginsListResult
    >,
  connectMcpPlugin: (id: string, projectRoot?: string) =>
    ipcRenderer.invoke(
      'mcpPlugins:connect',
      id,
      projectRoot ? cloneForIpc(projectRoot) : undefined,
    ) as Promise<import('../../src/types/axecoder').McpPluginMutationResult>,
  disconnectMcpPlugin: (id: string) =>
    ipcRenderer.invoke('mcpPlugins:disconnect', id) as Promise<
      import('../../src/types/axecoder').McpPluginMutationResult
    >,
  setMcpPluginEnabled: (id: string, enabled: boolean, projectRoot?: string) =>
    ipcRenderer.invoke(
      'mcpPlugins:setEnabled',
      id,
      enabled,
      projectRoot ? cloneForIpc(projectRoot) : undefined,
    ) as Promise<import('../../src/types/axecoder').McpPluginMutationResult>,
  setMcpPluginApiKey: (id: string, apiKey: string) =>
    ipcRenderer.invoke('mcpPlugins:setApiKey', id, apiKey) as Promise<
      import('../../src/types/axecoder').McpPluginMutationResult
    >,
  testMcpPlugin: (id: string) =>
    ipcRenderer.invoke('mcpPlugins:test', id) as Promise<
      import('../../src/types/axecoder').McpPluginTestResult
    >,
  listUsers: () =>
    ipcRenderer.invoke('users:list') as Promise<import('../../src/types/axecoder').UsersFile>,
  saveUser: (input: import('../../src/types/axecoder').UserSaveInput) =>
    ipcRenderer.invoke('users:save', input) as Promise<import('../../src/types/axecoder').UsersMutationResult>,
  deleteUser: (id: string) =>
    ipcRenderer.invoke('users:delete', id) as Promise<import('../../src/types/axecoder').UsersMutationResult>,
  getUserAvatarDataUrl: (avatarPath: string) =>
    ipcRenderer.invoke('users:getAvatarDataUrl', avatarPath) as Promise<
      import('../../src/types/axecoder').UsersAvatarDataUrlResult
    >,
  pickUserAvatar: (userId: string) =>
    ipcRenderer.invoke('users:pickAvatar', userId) as Promise<
      import('../../src/types/axecoder').UsersPickAvatarResult
    >,
  listAvailableSkills: (projectRoot?: string | null) =>
    ipcRenderer.invoke('users:listAvailableSkills', cloneForIpc(projectRoot ?? '')) as Promise<
      import('../../src/types/axecoder').UsersAvailableSkillsResult
    >,
  listRules: (projectRoot?: string | null) =>
    ipcRenderer.invoke('rules:list', projectRoot) as Promise<
      import('../../src/types/axecoder').RulesMutationResult
    >,
  readRule: (scope: import('../../src/types/axecoder').RuleScope, fileName: string, projectRoot?: string) =>
    ipcRenderer.invoke('rules:read', scope, fileName, projectRoot) as Promise<
      import('../../src/types/axecoder').RulesReadResult
    >,
  saveRule: (input: import('../../src/types/axecoder').RuleSaveInput) =>
    ipcRenderer.invoke('rules:save', input) as Promise<
      import('../../src/types/axecoder').RulesMutationResult
    >,
  deleteRule: (
    scope: import('../../src/types/axecoder').RuleScope,
    fileName: string,
    projectRoot?: string,
  ) =>
    ipcRenderer.invoke('rules:delete', scope, fileName, projectRoot) as Promise<
      import('../../src/types/axecoder').RulesMutationResult
    >,
  getRulesThirdPartyImport: () =>
    ipcRenderer.invoke('rules:getThirdPartyImport') as Promise<
      { ok: true; enabled: boolean } | { ok: false; error: string }
    >,
  setRulesThirdPartyImport: (enabled: boolean) =>
    ipcRenderer.invoke('rules:setThirdPartyImport', enabled) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  listSkills: (projectRoot?: string | null) =>
    ipcRenderer.invoke('skills:list', projectRoot) as Promise<
      import('../../src/types/axecoder').SkillsMutationResult
    >,
  readSkill: (
    scope: import('../../src/types/axecoder').SkillScope,
    folderName: string,
    projectRoot?: string,
  ) =>
    ipcRenderer.invoke('skills:read', scope, folderName, projectRoot) as Promise<
      import('../../src/types/axecoder').SkillsReadResult
    >,
  saveSkill: (input: import('../../src/types/axecoder').SkillSaveInput) =>
    ipcRenderer.invoke('skills:save', input) as Promise<
      import('../../src/types/axecoder').SkillsMutationResult
    >,
  deleteSkill: (
    scope: 'user' | 'project',
    folderName: string,
    projectRoot?: string,
  ) =>
    ipcRenderer.invoke('skills:delete', scope, folderName, projectRoot) as Promise<
      import('../../src/types/axecoder').SkillsMutationResult
    >,
  expandChatUserWithFiles: (projectRoot: string, text: string, filePaths: string[]) =>
    ipcRenderer.invoke(
      'chat:expandUserWithFiles',
      cloneForIpc(projectRoot),
      cloneForIpc(text),
      cloneForIpc(filePaths),
    ) as Promise<string>,
  expandChatAtRefs: (projectRoot: string, text: string, skipTokens?: string[]) =>
    ipcRenderer.invoke(
      'chat:expandAtRefs',
      cloneForIpc(projectRoot),
      cloneForIpc(text),
      cloneForIpc(skipTokens ?? []),
    ) as Promise<{ ok: true; text: string; errors: string[] } | { ok: false; error: string }>,
  listAtRefDir: (projectRoot: string, relDir: string) =>
    ipcRenderer.invoke('chat:listAtRefDir', cloneForIpc(projectRoot), cloneForIpc(relDir)) as Promise<
      | { ok: true; entries: { name: string; isDir: boolean }[] }
      | { ok: false; error: string }
    >,
  saveChatPastedImage: (sessionId: string, base64: string, mimeType: string) =>
    ipcRenderer.invoke(
      'chat:savePastedImage',
      cloneForIpc(sessionId),
      cloneForIpc(base64),
      cloneForIpc(mimeType),
    ) as Promise<
      | { ok: true; ref: import('../../src/types/axecoder').ChatImageRef; dataUrl: string }
      | { ok: false; error: string }
    >,
  resolveChatImageRefs: (refs: import('../../src/types/axecoder').ChatImageRef[]) =>
    ipcRenderer.invoke('chat:resolveImageRefs', cloneForIpc(refs)) as Promise<
      | { ok: true; images: import('../../src/types/axecoder').AiChatImagePart[] }
      | { ok: false; error: string }
    >,
  getChatImagePreview: (ref: import('../../src/types/axecoder').ChatImageRef) =>
    ipcRenderer.invoke('chat:imagePreview', cloneForIpc(ref)) as Promise<
      | { ok: true; dataUrl: string }
      | { ok: false; error: string }
    >,
  aiChat: (
    modelId: string,
    messages: import('../../src/types/axecoder').AiChatMessage[],
    streamId?: string,
    reasoningEffort?: string,
  ) =>
    ipcRenderer.invoke(
      'ai:chat',
      modelId,
      cloneForIpc(messages),
      streamId,
      reasoningEffort,
    ) as Promise<import('../../src/types/axecoder').AiChatResult>,
  onAiStream: (callback: (payload: import('../../src/types/axecoder').AiStreamPayload) => void) => {
    const listener = (_: unknown, payload: import('../../src/types/axecoder').AiStreamPayload) =>
      callback(payload)
    ipcRenderer.on('ai:stream', listener)
    return () => ipcRenderer.off('ai:stream', listener)
  },
  agentSend: (
    projectRoot: string,
    modelId: string,
    messages: import('../../src/types/axecoder').AiChatMessage[],
    chatMode?: import('../../src/types/axecoder').ChatModeId,
    assigneeUserId?: string,
    roleWorkflowInvoke?: boolean,
    reasoningEffort?: string,
    clientChatId?: string,
  ) =>
    ipcRenderer.invoke(
      'agent:send',
      cloneForIpc(projectRoot),
      modelId,
      cloneForIpc(messages),
      chatMode,
      cloneForIpc(assigneeUserId),
      roleWorkflowInvoke === true,
      reasoningEffort,
      cloneForIpc(clientChatId),
    ) as Promise<import('../../src/types/axecoder').AgentSendResult>,
  agentStop: (sessionId: string) =>
    ipcRenderer.invoke('agent:stop', sessionId) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  agentRunUserShell: (projectRoot: string, command: string) =>
    ipcRenderer.invoke('agent:runUserShell', cloneForIpc(projectRoot), command) as Promise<
      | { ok: true; text: string; exitCode: number | null }
      | { ok: false; error: string }
    >,
  chatCompact: (messages: import('../../src/types/axecoder').AiChatMessage[]) =>
    ipcRenderer.invoke('chat:compact', JSON.parse(JSON.stringify(messages))) as Promise<
      | { ok: true; messages: import('../../src/types/axecoder').AiChatMessage[]; summary: string }
      | { ok: false; error: string }
    >,
  agentHooksHelp: () =>
    ipcRenderer.invoke('agent:hooksHelp') as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  agentListMcp: (projectRoot?: string) =>
    ipcRenderer.invoke('agent:listMcp', projectRoot ? cloneForIpc(projectRoot) : undefined) as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  agentListSkills: (projectRoot: string) =>
    ipcRenderer.invoke('agent:listSkills', cloneForIpc(projectRoot)) as Promise<
      | {
          ok: true
          skills: { name: string; path: string; source: string }[]
        }
      | { ok: false; error: string }
    >,
  agentLoadSkill: (projectRoot: string, skillName: string) =>
    ipcRenderer.invoke('agent:loadSkill', cloneForIpc(projectRoot), skillName) as Promise<
      | { ok: true; name: string; text: string; path: string }
      | { ok: false; error: string }
    >,
  agentListCustomCommands: (projectRoot: string) =>
    ipcRenderer.invoke('agent:listCustomCommands', cloneForIpc(projectRoot)) as Promise<
      | {
          ok: true
          commands: { name: string; path: string; description: string; source: string }[]
          dirs: string[]
        }
      | { ok: false; error: string }
    >,
  agentLoadCustomCommand: (projectRoot: string, commandName: string) =>
    ipcRenderer.invoke('agent:loadCustomCommand', cloneForIpc(projectRoot), commandName) as Promise<
      | { ok: true; name: string; text: string; path: string }
      | { ok: false; error: string }
    >,
  agentListBuiltinCommands: () =>
    ipcRenderer.invoke('agent:listBuiltinCommands') as Promise<
      | {
          ok: true
          commands: { name: string; path: string; description: string; source: string }[]
          dir: string
        }
      | { ok: false; error: string }
    >,
  agentLoadBuiltinCommand: (commandName: string) =>
    ipcRenderer.invoke('agent:loadBuiltinCommand', commandName) as Promise<
      | { ok: true; name: string; text: string; path: string }
      | { ok: false; error: string }
    >,
  agentListBuiltinSkills: () =>
    ipcRenderer.invoke('agent:listBuiltinSkills') as Promise<
      | {
          ok: true
          skills: { name: string; path: string; description: string; source: string }[]
          dir: string
        }
      | { ok: false; error: string }
    >,
  agentLoadBuiltinSkill: (skillName: string) =>
    ipcRenderer.invoke('agent:loadBuiltinSkill', skillName) as Promise<
      | { ok: true; name: string; text: string; path: string }
      | { ok: false; error: string }
    >,
  agentListOutputStyles: (projectRoot?: string) =>
    ipcRenderer.invoke('agent:listOutputStyles', projectRoot ? cloneForIpc(projectRoot) : undefined) as Promise<
      | {
          ok: true
          activeId: string
          styles: { id: string; name: string; description: string; source: string }[]
          dirs: string[]
        }
      | { ok: false; error: string }
    >,
  agentSetOutputStyle: (styleId: string) =>
    ipcRenderer.invoke('agent:setOutputStyle', styleId) as Promise<
      { ok: true; activeId: string } | { ok: false; error: string }
    >,
  agentPlanModeHelp: () =>
    ipcRenderer.invoke('agent:planModeHelp') as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  agentRewindHelp: (projectRoot: string) =>
    ipcRenderer.invoke('agent:rewindHelp', cloneForIpc(projectRoot)) as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  agentListSessions: () =>
    ipcRenderer.invoke('agent:listSessions') as Promise<{
      ok: true
      sessions: {
        id: string
        turn: number
        projectRoot: string
        modelId: string
        messageCount: number
      }[]
    }>,
  agentListCheckpoints: (sessionId: string) =>
    ipcRenderer.invoke('agent:listCheckpoints', sessionId) as Promise<
      | {
          ok: true
          checkpoints: {
            id: string
            turn: number
            label: string
            createdAt: number
            fileCount: number
          }[]
        }
      | { ok: false; error: string }
    >,
  agentRewind: (sessionId: string, checkpointId?: string) =>
    ipcRenderer.invoke('agent:rewind', sessionId, checkpointId) as Promise<
      | { ok: true; label: string; restoredFiles: number }
      | { ok: false; error: string }
    >,
  agentListBackgroundTasks: (sessionId?: string) =>
    ipcRenderer.invoke('agent:listBackgroundTasks', sessionId) as Promise<{
      ok: true
      tasks: {
        id: string
        description: string
        status: 'running' | 'completed' | 'failed' | 'stopped'
        startedAt: number
      }[]
    }>,
  agentResolveBackgroundTasks: (projectRoot: string, taskIds: string[]) =>
    ipcRenderer.invoke(
      'agent:resolveBackgroundTasks',
      cloneForIpc(projectRoot),
      cloneForIpc(taskIds),
    ) as Promise<
      | { ok: true; tasks: import('../../src/types/axecoder').BackgroundTaskSnapshot[] }
      | { ok: false; error: string }
    >,
  agentReadMemory: () =>
    ipcRenderer.invoke('agent:readMemory') as Promise<
      { ok: true; path: string; text: string } | { ok: false; error: string }
    >,
  agentWriteMemory: (text: string) =>
    ipcRenderer.invoke('agent:writeMemory', text) as Promise<
      { ok: true; path: string } | { ok: false; error: string }
    >,
  agentInitAgentsMd: (projectRoot: string) =>
    ipcRenderer.invoke('agent:initAgentsMd', cloneForIpc(projectRoot)) as Promise<
      { ok: true; path: string; created: boolean } | { ok: false; error: string }
    >,
  agentDesignSlash: (projectRoot: string, args: string) =>
    ipcRenderer.invoke('agent:designSlash', cloneForIpc(projectRoot), cloneForIpc(args)) as Promise<
      { ok: true; message: string } | { ok: false; error: string }
    >,
  agentConfirmWrite: (sessionId: string, pendingId: string) =>
    ipcRenderer.invoke('agent:confirmWrite', sessionId, pendingId) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentConfirmAllWrites: (sessionId: string) =>
    ipcRenderer.invoke('agent:confirmAllWrites', sessionId) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentRejectWrite: (sessionId: string, pendingId: string, reason?: string) =>
    ipcRenderer.invoke('agent:rejectWrite', sessionId, pendingId, reason) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentRejectAllWrites: (sessionId: string, reason?: string) =>
    ipcRenderer.invoke('agent:rejectAllWrites', sessionId, reason) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentConfirmBash: (sessionId: string, pendingId: string) =>
    ipcRenderer.invoke('agent:confirmBash', sessionId, pendingId) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentRejectBash: (sessionId: string, pendingId: string, reason?: string) =>
    ipcRenderer.invoke('agent:rejectBash', sessionId, pendingId, reason) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentAnswerQuestions: (
    sessionId: string,
    pendingId: string,
    answers: Record<string, string | string[]>,
  ) =>
    ipcRenderer.invoke(
      'agent:answerQuestions',
      sessionId,
      pendingId,
      JSON.parse(JSON.stringify(answers)),
    ) as Promise<import('../../src/types/axecoder').AgentContinueResult>,
  agentBuildPlan: (sessionId: string, pendingId: string) =>
    ipcRenderer.invoke('agent:buildPlan', sessionId, pendingId) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentDismissPlan: (sessionId: string, pendingId: string) =>
    ipcRenderer.invoke('agent:dismissPlan', sessionId, pendingId) as Promise<
      import('../../src/types/axecoder').AgentContinueResult
    >,
  agentComposePlanBuild: (projectRoot: string, planPath: string) =>
    ipcRenderer.invoke('agent:composePlanBuild', cloneForIpc(projectRoot), planPath) as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  onAgentProgress: (callback: (payload: import('../../src/types/axecoder').AgentProgressPayload) => void) => {
    const listener = (_: unknown, payload: import('../../src/types/axecoder').AgentProgressPayload) =>
      callback(payload)
    ipcRenderer.on('agent:progress', listener)
    return () => ipcRenderer.off('agent:progress', listener)
  },
  gitStatus: (cwd: string) =>
    ipcRenderer.invoke('git:status', cwd) as Promise<import('../../src/types/axecoder').GitStatusResult>,
  gitForgeStatus: (cwd: string) =>
    ipcRenderer.invoke('git:forgeStatus', cwd) as Promise<
      import('../../src/types/axecoder').GitForgeStatusResult
    >,
  gitCommitPushPrPrompt: (cwd: string) =>
    ipcRenderer.invoke('git:commitPushPrPrompt', cloneForIpc(cwd)) as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  gitOpenUrl: (url: string) =>
    ipcRenderer.invoke('git:openUrl', url) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  terminalStart: (cwd: string, cols?: number, rows?: number) =>
    ipcRenderer.invoke('terminal:start', cwd, cols, rows) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  terminalWrite: (data: string) => ipcRenderer.invoke('terminal:write', data) as Promise<{ ok: boolean }>,
  terminalResize: (cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', cols, rows) as Promise<{ ok: boolean }>,
  terminalInterrupt: () => ipcRenderer.invoke('terminal:interrupt') as Promise<{ ok: boolean }>,
  terminalStop: () => ipcRenderer.invoke('terminal:stop') as Promise<{ ok: true }>,
  terminalSetFocused: (focused: boolean) =>
    ipcRenderer.invoke('terminal:setFocused', focused) as Promise<{ ok: true }>,
  onTerminalData: (callback: (text: string) => void) => {
    const listener = (_: unknown, text: string) => callback(text)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.off('terminal:data', listener)
  },
  listAllSessions: (projectRoot: string) =>
    ipcRenderer.invoke('session:listAll', projectRoot) as Promise<{
      sessions: import('../../src/types/axecoder').SessionListItem[]
    }>,
  suggestChatSessionTitle: (
    modelId: string,
    messages: { role: 'user' | 'assistant'; text: string }[],
    currentTitle: string,
  ) =>
    ipcRenderer.invoke('session:suggestTitle', modelId, messages, currentTitle) as Promise<
      { ok: true; title: string } | { ok: false; error: string }
    >,
  getChatSessions: (projectRoot: string) =>
    ipcRenderer.invoke('chat:getSessions', projectRoot) as Promise<{
      sessions: import('../../src/types/axecoder').ChatSessionMeta[]
    }>,
  getChatSession: (projectRoot: string, sessionId: string) =>
    ipcRenderer.invoke('chat:getSession', projectRoot, sessionId) as Promise<{
      session: import('../../src/types/axecoder').ChatSession | null
    }>,
  saveChatSession: (projectRoot: string, session: import('../../src/types/axecoder').ChatSession) =>
    ipcRenderer.invoke('chat:saveSession', cloneForIpc(projectRoot), cloneForIpc(session)) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  deleteChatSession: (projectRoot: string, sessionId: string) =>
    ipcRenderer.invoke('chat:deleteSession', projectRoot, sessionId) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  chatBranchTree: (projectRoot: string, currentId?: string) =>
    ipcRenderer.invoke('chat:branchTree', cloneForIpc(projectRoot), currentId) as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  chatForkBranch: (projectRoot: string, sourceSessionId: string, args?: string) =>
    ipcRenderer.invoke(
      'chat:forkBranch',
      cloneForIpc(projectRoot),
      sourceSessionId,
      args ?? '',
    ) as Promise<
      | { ok: true; session: import('../../src/types/axecoder').ChatSession }
      | { ok: false; error: string }
    >,
  chatSwitchBranch: (projectRoot: string, ref: string, currentId?: string) =>
    ipcRenderer.invoke('chat:switchBranch', cloneForIpc(projectRoot), ref, currentId) as Promise<
      | {
          ok: true
          session: import('../../src/types/axecoder').ChatSession
          tree: string
        }
      | { ok: false; error: string }
    >,
  agentProjectMemory: (projectRoot: string) =>
    ipcRenderer.invoke('agent:projectMemory', cloneForIpc(projectRoot)) as Promise<
      { ok: true; text: string } | { ok: false; error: string }
    >,
  getWorkshopSessions: (projectRoot: string) =>
    ipcRenderer.invoke('workshop:getSessions', projectRoot) as Promise<{
      sessions: import('../../src/types/axecoder').WorkshopSessionMeta[]
    }>,
  getWorkshopSession: (projectRoot: string, workshopId: string) =>
    ipcRenderer.invoke('workshop:getSession', projectRoot, workshopId) as Promise<{
      session: import('../../src/types/axecoder').WorkshopSession | null
    }>,
  saveWorkshopSession: (
    projectRoot: string,
    session: import('../../src/types/axecoder').WorkshopSession,
  ) =>
    ipcRenderer.invoke('workshop:saveSession', cloneForIpc(projectRoot), cloneForIpc(session)) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  deleteWorkshopSession: (projectRoot: string, workshopId: string) =>
    ipcRenderer.invoke('workshop:deleteSession', projectRoot, workshopId) as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  workshopStartRun: (
    projectRoot: string,
    workshopId: string,
    userBrief: string,
    modelId: string,
  ) =>
    ipcRenderer.invoke(
      'workshop:startRun',
      cloneForIpc(projectRoot),
      cloneForIpc(workshopId),
      cloneForIpc(userBrief),
      cloneForIpc(modelId),
    ) as Promise<import('../../src/types/axecoder').WorkshopRunResult>,
  workshopSendMessage: (
    projectRoot: string,
    workshopId: string,
    text: string,
    modelId: string,
    displayText?: string,
    imageRefs?: import('../../src/types/axecoder').ChatImageRef[],
    preferredAssigneeUserId?: string,
    orchestrationChatMode?: string,
  ) =>
    ipcRenderer.invoke(
      'workshop:sendMessage',
      cloneForIpc(projectRoot),
      cloneForIpc(workshopId),
      cloneForIpc(text),
      cloneForIpc(modelId),
      undefined,
      cloneForIpc(displayText),
      cloneForIpc(imageRefs),
      cloneForIpc(preferredAssigneeUserId),
      cloneForIpc(orchestrationChatMode),
    ) as Promise<import('../../src/types/axecoder').WorkshopRunResult>,
  workshopSendUserAnswer: (projectRoot: string, workshopId: string, answer: string) =>
    ipcRenderer.invoke(
      'workshop:sendUserAnswer',
      cloneForIpc(projectRoot),
      cloneForIpc(workshopId),
      cloneForIpc(answer),
    ) as Promise<import('../../src/types/axecoder').WorkshopRunResult>,
  workshopStop: (workshopId: string) =>
    ipcRenderer.invoke('workshop:stop', cloneForIpc(workshopId)) as Promise<
      { ok: true; stopped: number } | { ok: false; error: string }
    >,
  onWorkshopProgress: (callback: (payload: import('../../src/types/axecoder').WorkshopProgressPayload) => void) => {
    const listener = (
      _: unknown,
      payload: import('../../src/types/axecoder').WorkshopProgressPayload,
    ) => callback(payload)
    ipcRenderer.on('workshop:progress', listener)
    return () => ipcRenderer.off('workshop:progress', listener)
  },
  drawIoGetDiagram: (projectRoot: string, workshopId: string) =>
    ipcRenderer.invoke(
      'drawIo:getDiagram',
      cloneForIpc(projectRoot),
      cloneForIpc(workshopId),
    ) as Promise<{ ok: true; xml: string } | { ok: false; error: string }>,
  onDrawIoDiagramUpdated: (
    callback: (payload: { workshopId: string; xml: string }) => void,
  ) => {
    const listener = (_: unknown, payload: { workshopId: string; xml: string }) => callback(payload)
    ipcRenderer.on('drawIo:diagramUpdated', listener)
    return () => ipcRenderer.off('drawIo:diagramUpdated', listener)
  },
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
