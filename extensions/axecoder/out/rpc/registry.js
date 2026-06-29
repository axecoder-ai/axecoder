"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRpcHandlers = void 0;
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const agent_checkpoint_1 = require("@axecoder/core/agent/agent-checkpoint");
const chat_file_context_1 = require("@axecoder/core/frontend/utils/chat-file-context");
const agent_path_1 = require("@axecoder/core/agent/agent-path");
const agent_at_refs_1 = require("@axecoder/core/agent/agent-at-refs");
const workshop_store_1 = require("@axecoder/core/workshop/workshop-store");
const draw_io_store_1 = require("@axecoder/core/draw-io/draw-io-store");
const ai_trace_store_1 = require("@axecoder/core/ai-trace-store");
const axecoder_dir_1 = require("@axecoder/core/axecoder-dir");
const agent = __importStar(require("../services/agent-service"));
const chat = __importStar(require("../services/chat-service"));
const session = __importStar(require("../services/session-service"));
const workshop = __importStar(require("../services/workshop-service"));
const models = __importStar(require("../services/models-service"));
const settings = __importStar(require("../services/settings-service"));
const metrics = __importStar(require("../services/metrics-service"));
const expandChatUserWithFiles = async (projectRoot, text, filePaths) => {
    const root = typeof projectRoot === 'string' ? projectRoot.trim() : '';
    const paths = Array.isArray(filePaths) ? filePaths.filter((p) => typeof p === 'string' && p) : [];
    if (!root || !paths.length)
        return typeof text === 'string' ? text : '';
    return (0, chat_file_context_1.buildUserMessageWithFiles)(text, paths, root, async (p) => {
        const resolved = (0, agent_path_1.resolvePathInProject)(root, p);
        if (!resolved)
            throw new Error('outside project');
        return { content: await promises_1.default.readFile(resolved, 'utf-8') };
    });
};
const createRpcHandlers = () => ({
    listAllSessions: (projectRoot) => session.listAllSessions(projectRoot),
    suggestChatSessionTitle: (modelId, messages, currentTitle) => session.suggestTitle(modelId, messages, currentTitle),
    agentSend: (projectRoot, modelId, messages, chatMode, assigneeUserId, roleWorkflowInvoke, reasoningEffort, clientChatId) => agent.agentSend(projectRoot, modelId, messages, chatMode, assigneeUserId, roleWorkflowInvoke, reasoningEffort, clientChatId),
    agentStop: (sessionId) => agent.agentStop(sessionId),
    agentConfirmWrite: (sessionId, pendingId) => agent.agentConfirmWrite(sessionId, pendingId),
    agentConfirmAllWrites: (sessionId) => agent.agentConfirmAllWrites(sessionId),
    agentRejectWrite: (sessionId, pendingId, reason) => agent.agentRejectWrite(sessionId, pendingId, reason),
    agentRejectAllWrites: (sessionId, reason) => agent.agentRejectAllWrites(sessionId, reason),
    agentConfirmBash: (sessionId, pendingId) => agent.agentConfirmBash(sessionId, pendingId),
    agentRejectBash: (sessionId, pendingId, reason) => agent.agentRejectBash(sessionId, pendingId, reason),
    agentAnswerQuestions: (sessionId, pendingId, answers) => agent.agentAnswerQuestions(sessionId, pendingId, answers),
    agentBuildPlan: (sessionId, pendingId) => agent.agentBuildPlan(sessionId, pendingId),
    agentDismissPlan: (sessionId, pendingId) => agent.agentDismissPlan(sessionId, pendingId),
    agentComposePlanBuild: (projectRoot, planPath) => agent.agentComposePlanBuild(projectRoot, planPath),
    agentRunUserShell: (projectRoot, command) => agent.agentRunUserShell(projectRoot, command),
    chatCompact: (messages) => agent.chatCompact(messages),
    agentHooksHelp: () => agent.agentHooksHelp(),
    agentListMcp: (projectRoot) => agent.agentListMcp(projectRoot),
    agentListSkills: (projectRoot) => agent.agentListSkills(projectRoot),
    agentLoadSkill: (projectRoot, skillName) => agent.agentLoadSkill(projectRoot, skillName),
    agentListCustomCommands: (projectRoot) => agent.agentListCustomCommands(projectRoot),
    agentLoadCustomCommand: (projectRoot, commandName) => agent.agentLoadCustomCommand(projectRoot, commandName),
    agentListBuiltinCommands: () => agent.agentListBuiltinCommands(),
    agentLoadBuiltinCommand: (commandName) => agent.agentLoadBuiltinCommand(commandName),
    agentListBuiltinSkills: () => agent.agentListBuiltinSkills(),
    agentLoadBuiltinSkill: (skillName) => agent.agentLoadBuiltinSkill(skillName),
    agentListOutputStyles: (projectRoot) => agent.agentListOutputStyles(projectRoot),
    agentSetOutputStyle: (styleId) => agent.agentSetOutputStyle(styleId),
    agentPlanModeHelp: () => agent.agentPlanModeHelp(),
    agentRewindHelp: (projectRoot) => agent.agentRewindHelp(projectRoot),
    agentListSessions: () => agent.agentListSessions(),
    agentListCheckpoints: (sessionId) => agent.agentListCheckpoints(sessionId),
    agentRewind: (sessionId, checkpointId) => agent.agentRewind(sessionId, checkpointId),
    agentListBackgroundTasks: (sessionId) => agent.agentListBackgroundTasks(sessionId),
    agentResolveBackgroundTasks: (projectRoot, taskIds) => agent.agentResolveBackgroundTasks(projectRoot, taskIds),
    agentReadMemory: () => agent.agentReadMemory(),
    agentWriteMemory: (text) => agent.agentWriteMemory(text),
    agentInitAgentsMd: async (projectRoot) => {
        const root = typeof projectRoot === 'string' ? projectRoot.trim() : '';
        if (!root)
            return { ok: false, error: 'No project open' };
        const filePath = node_path_1.default.join(node_path_1.default.resolve(root), 'AGENTS.md');
        try {
            await promises_1.default.access(filePath);
            return { ok: true, path: filePath, created: false };
        }
        catch {
            await promises_1.default.writeFile(filePath, agent_checkpoint_1.AGENTS_MD_TEMPLATE, 'utf-8');
            return { ok: true, path: filePath, created: true };
        }
    },
    agentDesignSlash: (projectRoot, args) => agent.agentDesignSlash(projectRoot, args),
    agentProjectMemory: (projectRoot) => agent.agentProjectMemory(projectRoot),
    getChatSessions: (projectRoot) => chat.getChatSessionsHandler(projectRoot),
    getChatSession: (projectRoot, sessionId) => chat.getChatSessionHandler(projectRoot, sessionId),
    saveChatSession: (projectRoot, session) => chat.saveChatSessionHandler(projectRoot, session),
    deleteChatSession: (projectRoot, sessionId) => chat.deleteChatSessionHandler(projectRoot, sessionId),
    chatBranchTree: (projectRoot, currentId) => chat.chatBranchTree(projectRoot, currentId),
    chatForkBranch: (projectRoot, sourceSessionId, args) => chat.chatForkBranch(projectRoot, sourceSessionId, args),
    chatSwitchBranch: (projectRoot, ref, currentId) => chat.chatSwitchBranch(projectRoot, ref, currentId),
    expandChatUserWithFiles,
    expandChatAtRefs: (projectRoot, text, skipTokens) => (0, agent_at_refs_1.expandAtRefs)(projectRoot, text, skipTokens ?? []),
    listAtRefDir: (projectRoot, relDir) => (0, agent_at_refs_1.listAtRefDir)(projectRoot, relDir),
    saveChatPastedImage: (sessionId, base64, mimeType) => chat.saveChatPastedImageHandler(sessionId, base64, mimeType),
    resolveChatImageRefs: (refs) => chat.resolveChatImageRefsHandler(refs),
    getChatImagePreview: (ref) => chat.getChatImagePreview(ref),
    aiChat: (modelId, messages, streamId, reasoningEffort) => chat.aiChat(modelId, messages, streamId, reasoningEffort),
    getWorkshopSessions: (projectRoot) => workshop.getWorkshopSessions(projectRoot),
    getWorkshopSession: (projectRoot, workshopId) => workshop.getWorkshopSessionHandler(projectRoot, workshopId),
    saveWorkshopSession: (projectRoot, session) => workshop.saveWorkshopSessionHandler(projectRoot, session),
    deleteWorkshopSession: (projectRoot, workshopId) => workshop.deleteWorkshopSessionHandler(projectRoot, workshopId),
    workshopStartRun: (projectRoot, workshopId, userBrief, modelId) => workshop.workshopStartRun(projectRoot, workshopId, userBrief, modelId),
    workshopSendMessage: (projectRoot, workshopId, text, modelId, _mode, displayText, imageRefs, preferredAssigneeUserId, orchestrationChatMode) => workshop.workshopSendMessage(projectRoot, workshopId, text, modelId, _mode, displayText, imageRefs, preferredAssigneeUserId, orchestrationChatMode),
    workshopSendUserAnswer: (projectRoot, workshopId, answer) => workshop.workshopSendUserAnswer(projectRoot, workshopId, answer),
    workshopStop: (workshopId) => workshop.workshopStop(workshopId),
    drawIoGetDiagram: async (projectRoot, workshopId) => {
        const root = typeof projectRoot === 'string' ? projectRoot : '';
        const wid = typeof workshopId === 'string' ? workshopId.trim() : '';
        if (!root || !wid)
            return { ok: false, error: 'Invalid args' };
        const { session } = await (0, workshop_store_1.getWorkshopSession)(root, wid);
        if (!session)
            return { ok: false, error: 'Workshop not found' };
        return { ok: true, xml: (0, draw_io_store_1.getWorkshopDiagramXml)(session) };
    },
    listModels: () => models.listModelsHandler(),
    saveModel: (input) => models.saveModelHandler(input),
    deleteModel: (id) => models.deleteModelHandler(id),
    toggleModel: (id, enabled) => models.toggleModelHandler(id, enabled),
    setActiveModel: (id) => models.setActiveModelHandler(id),
    pingModel: (id) => models.pingModelHandler(id),
    getProviderCapabilities: () => models.getProviderCapabilities(),
    getSettings: () => settings.getSettings(),
    setSettings: (partial) => settings.setSettings(partial),
    permissionsGet: (projectRoot) => settings.permissionsGet(projectRoot),
    permissionsSetGlobal: (input) => settings.permissionsSetGlobal(input),
    permissionsSetProject: (projectRoot, input) => settings.permissionsSetProject(projectRoot, input),
    permissionsWriteProjectJson: (projectRoot, jsonText) => settings.permissionsWriteProjectJson(projectRoot, jsonText),
    permissionsWriteGlobalJson: (jsonText) => settings.permissionsWriteGlobalJson(jsonText),
    pickCompletionSound: () => settings.pickCompletionSoundHandler(),
    getCompletionSoundDataUrl: () => settings.getCompletionSoundDataUrlHandler(),
    pickProfileAvatar: () => settings.pickProfileAvatarHandler(),
    listUsers: () => settings.listUsersHandler(),
    saveUser: (input) => settings.saveUserHandler(input),
    deleteUser: (id) => settings.deleteUserHandler(id),
    getUserAvatarDataUrl: (avatarPath) => settings.getUserAvatarDataUrlHandler(avatarPath),
    pickUserAvatar: (userId) => settings.pickUserAvatarHandler(userId),
    listAvailableSkills: (projectRoot) => settings.listAvailableSkillsHandler(projectRoot),
    listRules: (projectRoot) => settings.listRulesHandler(projectRoot),
    readRule: (scope, fileName, projectRoot) => settings.readRuleHandler(scope, fileName, projectRoot),
    saveRule: (input) => settings.saveRuleHandler(input),
    deleteRule: (scope, fileName, projectRoot) => settings.deleteRuleHandler(scope, fileName, projectRoot),
    getRulesThirdPartyImport: () => settings.getRulesThirdPartyImport(),
    setRulesThirdPartyImport: (enabled) => settings.setRulesThirdPartyImport(enabled),
    listSkills: (projectRoot) => settings.listSkillsHandler(projectRoot),
    readSkill: (scope, folderName, projectRoot) => settings.readSkillHandler(scope, folderName, projectRoot),
    saveSkill: (input) => settings.saveSkillHandler(input),
    deleteSkill: (scope, folderName, projectRoot) => settings.deleteSkillHandler(scope, folderName, projectRoot),
    listMcpPlugins: (projectRoot) => settings.listMcpPluginsHandler(projectRoot),
    connectMcpPlugin: (id, projectRoot) => settings.connectMcpPluginHandler(id, projectRoot),
    disconnectMcpPlugin: (id) => settings.disconnectMcpPluginHandler(id),
    setMcpPluginEnabled: (id, enabled, projectRoot) => settings.setMcpPluginEnabledHandler(id, enabled, projectRoot),
    setMcpPluginApiKey: (id, apiKey) => settings.setMcpPluginApiKeyHandler(id, apiKey),
    testMcpPlugin: (id) => settings.testMcpPluginHandler(id),
    readFile: (filePath) => settings.readFileHandler(filePath),
    writeFile: (filePath, content) => settings.writeFileHandler(filePath, content),
    openFolder: () => settings.openFolder(),
    getRecentFiles: () => settings.getRecentFiles(),
    getRecentProjects: () => settings.getRecentProjects(),
    revealInFinder: (targetPath) => settings.revealInFinder(targetPath),
    listProjectFiles: (rootPath) => settings.listProjectFilesHandler(rootPath),
    search: (rootPath, query, opts) => settings.searchHandler(rootPath, query, opts),
    searchReplace: (rootPath, query, replacement, opts) => settings.searchReplaceHandler(rootPath, query, replacement, opts),
    searchReplaceOne: (rootPath, hit, query, replacement, opts) => settings.searchReplaceOneHandler(rootPath, hit, query, replacement, opts),
    gitStatus: (cwd) => settings.gitStatus(cwd),
    gitStage: (cwd, file) => settings.gitStage(cwd, file),
    gitUnstage: (cwd, file) => settings.gitUnstage(cwd, file),
    gitStageAll: (cwd) => settings.gitStageAll(cwd),
    gitCommit: (cwd, message, amend) => settings.gitCommit(cwd, message, amend),
    gitDiff: (cwd, staged) => settings.gitDiff(cwd, staged),
    gitShow: (cwd, file, staged) => settings.gitShow(cwd, file, staged),
    gitForgeStatus: (cwd) => settings.gitForgeStatus(cwd),
    gitCommitPushPrPrompt: (cwd) => settings.gitCommitPushPrPrompt(cwd),
    gitOpenUrl: (url) => settings.gitOpenUrl(url),
    codeGraphStatus: (projectRoot) => settings.codeGraphStatus(projectRoot),
    codeGraphIndex: (projectRoot) => settings.codeGraphIndex(projectRoot),
    outputAppend: (channel, line) => settings.outputAppend(channel, line),
    outputClear: (channel) => settings.outputClear(channel),
    outputListChannels: () => settings.outputListChannels(),
    outputGetLines: (channel) => settings.outputGetLines(channel),
    getAiMetricsSnapshot: (filter) => metrics.getAiMetricsSnapshotHandler(filter),
    getAiTraceState: () => (0, ai_trace_store_1.getAiTraceState)(),
    setAiTraceRecording: (on) => {
        (0, ai_trace_store_1.setAiTraceRecording)(!!on);
        return (0, ai_trace_store_1.getAiTraceState)();
    },
    clearAiTrace: () => {
        (0, ai_trace_store_1.clearAiTraceEvents)();
        return (0, ai_trace_store_1.getAiTraceState)();
    },
    saveAiTrace: async () => {
        const list = (0, ai_trace_store_1.getAiTraceEventsForExport)();
        if (!list.length)
            return { ok: false, error: 'No trace events to save' };
        const dir = node_path_1.default.join((0, axecoder_dir_1.getAxecoderDir)(), 'ai-traces');
        await promises_1.default.mkdir(dir, { recursive: true });
        const filePath = node_path_1.default.join(dir, `trace-${Date.now()}.jsonl`);
        const body = list.map((row) => JSON.stringify(row)).join('\n') + '\n';
        await promises_1.default.writeFile(filePath, body, 'utf8');
        return { ok: true, path: filePath };
    },
    getWindowLayout: async () => ({
        fullscreen: false,
        platform: process.platform,
    }),
    getWindowRole: async () => 'main',
    isCompanionWindowOpen: async () => false,
    openCompanionWindow: async () => false,
    closeCompanionWindow: async () => false,
    isMetricsWindowDetached: async () => false,
    openMetricsWindow: async () => false,
    closeMetricsWindow: async () => false,
    isTraceWindowDetached: async () => false,
    openTraceWindow: async () => false,
    closeTraceWindow: async () => false,
    getWorkspaceRoot: async () => {
        const { getWorkspaceRoot: root } = await Promise.resolve().then(() => __importStar(require('../host/broadcast')));
        return root();
    },
    getLastProject: async () => null,
    openProject: async (rootPath) => {
        if (typeof rootPath === 'string' && rootPath) {
            return { rootPath, tree: null };
        }
        return settings.openFolder();
    },
    confirmQuit: async () => undefined,
    watchStart: async () => ({ ok: true }),
    watchStop: async () => ({ ok: true }),
    terminalStart: async () => ({ ok: true }),
    terminalCreate: async () => ({ ok: false, error: 'Use VS Code integrated terminal' }),
    terminalClose: async () => ({ ok: true }),
    terminalList: async () => ({ ok: true, tabs: [], activeTabId: '' }),
    terminalSetActive: async () => ({ ok: true }),
    terminalWrite: async () => ({ ok: false }),
    terminalResize: async () => ({ ok: false }),
    terminalInterrupt: async () => ({ ok: false }),
    terminalStop: async () => ({ ok: true }),
    terminalSetFocused: async () => ({ ok: true }),
    lspEnsureProject: async () => ({ ok: true }),
    lspDidOpen: async () => ({ ok: true, version: 1 }),
    lspDidChange: async () => ({ ok: true, version: 1 }),
    lspDidClose: async () => ({ ok: true }),
    lspHover: async () => ({ ok: true, result: null }),
    lspDefinition: async () => ({ ok: true, result: null }),
    lspReferences: async () => ({ ok: true, result: [] }),
    lspCompletion: async () => ({ ok: true, result: null }),
    lspFormat: async () => ({ ok: true, result: null }),
    lspWorkspaceSymbol: async () => ({ ok: true, result: [] }),
    lspRefreshDiagnostics: async () => ({ ok: true }),
    settingsReadWorkspace: async () => ({ ok: true, settings: {} }),
    settingsMergeWorkspace: async () => settings.getSettings(),
    settingsReadKeybindings: async () => ({ ok: true, entries: [] }),
    settingsWriteKeybindings: async () => ({ ok: true }),
    setWindowBackgroundTheme: async () => true,
});
exports.createRpcHandlers = createRpcHandlers;
//# sourceMappingURL=registry.js.map