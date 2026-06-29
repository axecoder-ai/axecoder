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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputGetLines = exports.outputListChannels = exports.outputClear = exports.outputAppend = exports.codeGraphIndex = exports.codeGraphStatus = exports.searchReplaceOneHandler = exports.searchReplaceHandler = exports.searchHandler = exports.revealInFinder = exports.getRecentProjects = exports.getRecentFiles = exports.openFolder = exports.writeFileHandler = exports.readFileHandler = exports.pickProfileAvatarHandler = exports.getCompletionSoundDataUrlHandler = exports.pickCompletionSoundHandler = exports.testMcpPluginHandler = exports.setMcpPluginApiKeyHandler = exports.setMcpPluginEnabledHandler = exports.disconnectMcpPluginHandler = exports.connectMcpPluginHandler = exports.listMcpPluginsHandler = exports.listAvailableSkillsHandler = exports.pickUserAvatarHandler = exports.getUserAvatarDataUrlHandler = exports.deleteUserHandler = exports.saveUserHandler = exports.listUsersHandler = exports.deleteSkillHandler = exports.saveSkillHandler = exports.readSkillHandler = exports.listSkillsHandler = exports.setRulesThirdPartyImport = exports.getRulesThirdPartyImport = exports.deleteRuleHandler = exports.saveRuleHandler = exports.readRuleHandler = exports.listRulesHandler = exports.permissionsWriteGlobalJson = exports.permissionsWriteProjectJson = exports.permissionsSetProject = exports.permissionsSetGlobal = exports.permissionsGet = exports.listProjectFilesHandler = exports.setSettings = exports.getSettings = void 0;
const vscode = __importStar(require("vscode"));
const config_store_1 = require("@axecoder/core/config-store");
const broadcast_1 = require("../host/broadcast");
const search_utils_1 = require("@axecoder/core/search-utils");
const agent_permissions_1 = require("@axecoder/core/agent/agent-permissions");
const axecoder_dir_1 = require("@axecoder/core/axecoder-dir");
const project_permissions_store_1 = require("@axecoder/core/project-permissions-store");
const rules_store_1 = require("@axecoder/core/rules/rules-store");
const skills_store_1 = require("@axecoder/core/skills/skills-store");
const users_store_1 = require("@axecoder/core/users-store");
const users_available_skills_1 = require("@axecoder/core/users-available-skills");
const mcp_plugins_list_1 = require("@axecoder/core/mcp-plugins-list");
const completion_sound_1 = require("@axecoder/core/completion-sound");
const profile_avatar_1 = require("@axecoder/core/profile-avatar");
const toPermissionsView = async (projectRoot) => {
    const cfg = await (0, config_store_1.getConfig)();
    return {
        global: (0, agent_permissions_1.buildGlobalPermissionsPolicy)(cfg),
        globalPath: (0, axecoder_dir_1.axecoderPath)('config.json'),
        project: await (0, project_permissions_store_1.getProjectPermissions)(projectRoot),
        projectPath: projectRoot?.trim() ? (0, project_permissions_store_1.getProjectPermissionsPath)(projectRoot) : '',
        agentPermissionMode: cfg.agentPermissionMode ?? 'default',
    };
};
const getSettings = async () => (0, config_store_1.getConfig)();
exports.getSettings = getSettings;
const setSettings = async (partial) => {
    const next = await (0, config_store_1.setConfig)(partial);
    if (partial.theme !== undefined) {
        (0, broadcast_1.broadcastToWebviews)('settings:theme', next.theme);
    }
    return next;
};
exports.setSettings = setSettings;
const listProjectFilesHandler = async (rootPath) => ({
    files: await (0, search_utils_1.listProjectFiles)(rootPath),
});
exports.listProjectFilesHandler = listProjectFilesHandler;
const permissionsGet = async (projectRoot) => {
    try {
        return { ok: true, data: await toPermissionsView(projectRoot ?? '') };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
};
exports.permissionsGet = permissionsGet;
const permissionsSetGlobal = async (input) => {
    try {
        const partial = {};
        if (input.agentPermissionMode)
            partial.agentPermissionMode = input.agentPermissionMode;
        if (input.allow)
            partial.agentPermissionAllowRules = input.allow;
        if (input.ask)
            partial.agentPermissionAskRules = input.ask;
        if (input.deny)
            partial.agentPermissionDenyRules = input.deny;
        await (0, config_store_1.setConfig)(partial);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.permissionsSetGlobal = permissionsSetGlobal;
const permissionsSetProject = async (projectRoot, input) => {
    try {
        const data = await (0, project_permissions_store_1.setProjectPermissions)(projectRoot, input);
        return { ok: true, data };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.permissionsSetProject = permissionsSetProject;
const permissionsWriteProjectJson = async (projectRoot, jsonText) => {
    try {
        const parsed = JSON.parse(jsonText);
        const data = await (0, project_permissions_store_1.setProjectPermissions)(projectRoot, parsed);
        return { ok: true, data };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.permissionsWriteProjectJson = permissionsWriteProjectJson;
const permissionsWriteGlobalJson = async (jsonText) => {
    try {
        const parsed = JSON.parse(jsonText);
        await (0, config_store_1.setConfig)(parsed);
        return { ok: true, data: await (0, config_store_1.getConfig)() };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.permissionsWriteGlobalJson = permissionsWriteGlobalJson;
const listRulesHandler = async (projectRoot) => (0, rules_store_1.listRules)(projectRoot);
exports.listRulesHandler = listRulesHandler;
const readRuleHandler = async (scope, fileName, projectRoot) => (0, rules_store_1.readRule)(scope, fileName, projectRoot);
exports.readRuleHandler = readRuleHandler;
const saveRuleHandler = async (input) => (0, rules_store_1.saveRule)(input);
exports.saveRuleHandler = saveRuleHandler;
const deleteRuleHandler = async (scope, fileName, projectRoot) => (0, rules_store_1.deleteRule)(scope, fileName, projectRoot);
exports.deleteRuleHandler = deleteRuleHandler;
const getRulesThirdPartyImport = async () => ({
    ok: true,
    enabled: await (0, rules_store_1.getThirdPartyImport)(),
});
exports.getRulesThirdPartyImport = getRulesThirdPartyImport;
const setRulesThirdPartyImport = async (enabled) => {
    await (0, rules_store_1.setThirdPartyImport)(enabled);
    return { ok: true };
};
exports.setRulesThirdPartyImport = setRulesThirdPartyImport;
const listSkillsHandler = async (projectRoot) => (0, skills_store_1.listSkills)(projectRoot);
exports.listSkillsHandler = listSkillsHandler;
const readSkillHandler = async (scope, folderName, projectRoot) => (0, skills_store_1.readSkill)(scope, folderName, projectRoot);
exports.readSkillHandler = readSkillHandler;
const saveSkillHandler = async (input) => (0, skills_store_1.saveSkill)(input);
exports.saveSkillHandler = saveSkillHandler;
const deleteSkillHandler = async (scope, folderName, projectRoot) => (0, skills_store_1.deleteSkill)(scope, folderName, projectRoot);
exports.deleteSkillHandler = deleteSkillHandler;
const listUsersHandler = async () => (0, users_store_1.listUsers)();
exports.listUsersHandler = listUsersHandler;
const saveUserHandler = async (input) => (0, users_store_1.saveUser)(input);
exports.saveUserHandler = saveUserHandler;
const deleteUserHandler = async (id) => (0, users_store_1.deleteUser)(id);
exports.deleteUserHandler = deleteUserHandler;
const getUserAvatarDataUrlHandler = async (avatarPath) => (0, users_store_1.getUserAvatarDataUrl)(avatarPath);
exports.getUserAvatarDataUrlHandler = getUserAvatarDataUrlHandler;
const pickUserAvatarHandler = async (userId) => {
    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        filters: { Images: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
    });
    if (!uris?.[0])
        return { ok: false, cancelled: true };
    const path = await (0, users_store_1.copyAvatarForUser)(userId, uris[0].fsPath);
    return { ok: true, path };
};
exports.pickUserAvatarHandler = pickUserAvatarHandler;
const listAvailableSkillsHandler = async (projectRoot) => ({
    ok: true,
    skills: await (0, users_available_skills_1.listAvailableSkills)(projectRoot ?? ''),
});
exports.listAvailableSkillsHandler = listAvailableSkillsHandler;
const listMcpPluginsHandler = async (projectRoot) => ({
    ok: true,
    plugins: await (0, mcp_plugins_list_1.listMcpPluginViews)(projectRoot),
});
exports.listMcpPluginsHandler = listMcpPluginsHandler;
const connectMcpPluginHandler = async (_id, _projectRoot) => ({
    ok: false,
    error: 'MCP OAuth connect — use VS Code MCP extension or configure mcp.json',
});
exports.connectMcpPluginHandler = connectMcpPluginHandler;
const disconnectMcpPluginHandler = async (_id) => ({
    ok: true,
});
exports.disconnectMcpPluginHandler = disconnectMcpPluginHandler;
const setMcpPluginEnabledHandler = async (_id, _enabled, _projectRoot) => ({ ok: true });
exports.setMcpPluginEnabledHandler = setMcpPluginEnabledHandler;
const setMcpPluginApiKeyHandler = async (_id, _apiKey) => ({
    ok: true,
});
exports.setMcpPluginApiKeyHandler = setMcpPluginApiKeyHandler;
const testMcpPluginHandler = async (_id) => ({
    ok: false,
    error: 'MCP test not wired in VS Code host yet',
});
exports.testMcpPluginHandler = testMcpPluginHandler;
const pickCompletionSoundHandler = async () => {
    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        filters: { Audio: ['mp3', 'wav', 'ogg', 'm4a'] },
    });
    if (!uris?.[0])
        return { ok: false, cancelled: true };
    const rel = await (0, completion_sound_1.copyCompletionSoundFrom)(uris[0].fsPath);
    await (0, config_store_1.setConfig)({
        agentCompletionSoundPath: rel,
        agentCompletionSoundDisplayName: uris[0].fsPath.split(/[/\\]/).pop() ?? rel,
    });
    return { ok: true, path: rel };
};
exports.pickCompletionSoundHandler = pickCompletionSoundHandler;
const getCompletionSoundDataUrlHandler = async () => {
    const cfg = await (0, config_store_1.getConfig)();
    const rel = cfg.agentCompletionSoundPath;
    if (!rel)
        return { ok: false, error: 'No sound configured' };
    const dataUrl = await (0, completion_sound_1.getCompletionSoundDataUrl)(rel);
    if (!dataUrl)
        return { ok: false, error: 'Sound file missing' };
    return { ok: true, dataUrl };
};
exports.getCompletionSoundDataUrlHandler = getCompletionSoundDataUrlHandler;
const pickProfileAvatarHandler = async () => {
    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        filters: { Images: ['png', 'jpg', 'jpeg', 'webp'] },
    });
    if (!uris?.[0])
        return { ok: false, cancelled: true };
    const rel = await (0, profile_avatar_1.copyProfileAvatarFrom)(uris[0].fsPath);
    await (0, config_store_1.setConfig)({ profileAvatarPath: rel });
    return { ok: true, path: rel };
};
exports.pickProfileAvatarHandler = pickProfileAvatarHandler;
const readFileHandler = async (filePath) => {
    const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
    return { content: Buffer.from(buf).toString('utf8') };
};
exports.readFileHandler = readFileHandler;
const writeFileHandler = async (filePath, content) => {
    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content, 'utf8'));
    return { ok: true };
};
exports.writeFileHandler = writeFileHandler;
const openFolder = async () => {
    const uris = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false });
    if (!uris?.[0])
        return null;
    await vscode.commands.executeCommand('vscode.openFolder', uris[0], false);
    return { rootPath: uris[0].fsPath, tree: null };
};
exports.openFolder = openFolder;
const getRecentFiles = async () => ({ files: [] });
exports.getRecentFiles = getRecentFiles;
const getRecentProjects = async () => ({ projects: [] });
exports.getRecentProjects = getRecentProjects;
const revealInFinder = async (targetPath) => {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
    return { ok: true };
};
exports.revealInFinder = revealInFinder;
const searchHandler = async (rootPath, query, opts) => ({
    hits: await (0, search_utils_1.runRipgrepSearch)(rootPath, query, opts),
});
exports.searchHandler = searchHandler;
const searchReplaceHandler = async (rootPath, query, replacement, opts) => (0, search_utils_1.replaceInProject)(rootPath, query, replacement, opts);
exports.searchReplaceHandler = searchReplaceHandler;
const searchReplaceOneHandler = async (rootPath, hit, query, replacement, opts) => (0, search_utils_1.replaceOneInFile)(rootPath, hit, query, replacement, opts);
exports.searchReplaceOneHandler = searchReplaceOneHandler;
const codeGraphStatus = async (_projectRoot) => ({
    sqliteAvailable: false,
    engineAvailable: false,
    distPath: '',
    indexed: false,
});
exports.codeGraphStatus = codeGraphStatus;
const codeGraphIndex = async (_projectRoot) => ({
    ok: false,
    error: 'CodeGraph indexing requires legacy host or future VS Code integration',
});
exports.codeGraphIndex = codeGraphIndex;
const outputAppend = async (channel, line) => {
    const { appendOutputLine } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/output-channel')));
    appendOutputLine(channel, line);
    return { ok: true };
};
exports.outputAppend = outputAppend;
const outputClear = async (channel) => {
    const { clearOutputChannel } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/output-channel')));
    clearOutputChannel(channel);
    return { ok: true };
};
exports.outputClear = outputClear;
const outputListChannels = async () => {
    const { listOutputChannels } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/output-channel')));
    return { ok: true, channels: listOutputChannels() };
};
exports.outputListChannels = outputListChannels;
const outputGetLines = async (channel) => {
    const { getOutputLines } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/output-channel')));
    return { ok: true, lines: getOutputLines(channel) };
};
exports.outputGetLines = outputGetLines;
__exportStar(require("./git-service"), exports);
//# sourceMappingURL=settings-service.js.map