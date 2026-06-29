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
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRewindHelp = exports.agentPlanModeHelp = exports.agentProjectMemory = exports.agentDesignSlash = exports.agentWriteMemory = exports.agentReadMemory = exports.agentResolveBackgroundTasks = exports.agentListBackgroundTasks = exports.agentRewind = exports.agentListCheckpoints = exports.agentListSessions = exports.agentSetOutputStyle = exports.agentListOutputStyles = exports.agentLoadBuiltinSkill = exports.agentListBuiltinSkills = exports.agentLoadBuiltinCommand = exports.agentListBuiltinCommands = exports.agentLoadCustomCommand = exports.agentListCustomCommands = exports.agentLoadSkill = exports.agentListSkills = exports.agentListMcp = exports.agentHooksHelp = exports.chatCompact = exports.agentRunUserShell = exports.agentComposePlanBuild = exports.agentDismissPlan = exports.agentBuildPlan = exports.agentAnswerQuestions = exports.agentRejectBash = exports.agentConfirmBash = exports.agentRejectAllWrites = exports.agentRejectWrite = exports.agentConfirmAllWrites = exports.agentConfirmWrite = exports.agentStop = exports.agentSend = void 0;
const agent_loop_1 = require("@axecoder/core/agent/agent-loop");
const agent_checkpoint_1 = require("@axecoder/core/agent/agent-checkpoint");
const agent_subagent_tasks_1 = require("@axecoder/core/agent/agent-subagent-tasks");
const chat_compact_1 = require("@axecoder/core/chat-compact");
const agent_mcp_1 = require("@axecoder/core/agent/agent-mcp");
const agent_custom_commands_1 = require("@axecoder/core/agent/agent-custom-commands");
const agent_builtin_commands_1 = require("@axecoder/core/agent/agent-builtin-commands");
const design_slash_1 = require("@axecoder/core/design/design-slash");
const agent_builtin_skills_1 = require("@axecoder/core/agent/agent-builtin-skills");
const agent_skills_1 = require("@axecoder/core/agent/agent-skills");
const agent_output_styles_custom_1 = require("@axecoder/core/agent/agent-output-styles-custom");
const agent_output_styles_1 = require("@axecoder/core/agent/agent-output-styles");
const config_store_1 = require("@axecoder/core/config-store");
const agentSend = async (projectRoot, modelId, messages, chatMode, assigneeUserId, roleWorkflowInvoke, reasoningEffort, clientChatId) => {
    const history = (Array.isArray(messages) ? messages : [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
        ...(m.role === 'user' && m.images?.length ? { images: m.images } : {}),
        ...(m.role === 'assistant' && m.reasoningContent
            ? { reasoningContent: m.reasoningContent }
            : {}),
    }));
    if (!history.some((m) => m.role === 'user')) {
        return { ok: false, error: 'No user message' };
    }
    return (0, agent_loop_1.startAgentTurn)(projectRoot, modelId, history, chatMode, assigneeUserId, roleWorkflowInvoke === true, reasoningEffort, clientChatId);
};
exports.agentSend = agentSend;
const agentStop = async (sessionId) => (0, agent_loop_1.stopAgentTurn)(sessionId);
exports.agentStop = agentStop;
const agentConfirmWrite = async (sessionId, pendingId) => (0, agent_loop_1.confirmAgentWrite)(sessionId, pendingId);
exports.agentConfirmWrite = agentConfirmWrite;
const agentConfirmAllWrites = async (sessionId) => (0, agent_loop_1.confirmAgentAllWrites)(sessionId);
exports.agentConfirmAllWrites = agentConfirmAllWrites;
const agentRejectWrite = async (sessionId, pendingId, reason) => (0, agent_loop_1.rejectAgentWrite)(sessionId, pendingId, reason);
exports.agentRejectWrite = agentRejectWrite;
const agentRejectAllWrites = async (sessionId, reason) => (0, agent_loop_1.rejectAgentAllWrites)(sessionId, reason);
exports.agentRejectAllWrites = agentRejectAllWrites;
const agentConfirmBash = async (sessionId, pendingId) => (0, agent_loop_1.confirmAgentBash)(sessionId, pendingId);
exports.agentConfirmBash = agentConfirmBash;
const agentRejectBash = async (sessionId, pendingId, reason) => (0, agent_loop_1.rejectAgentBash)(sessionId, pendingId, reason);
exports.agentRejectBash = agentRejectBash;
const agentAnswerQuestions = async (sessionId, pendingId, answers) => (0, agent_loop_1.answerAgentQuestions)(sessionId, pendingId, answers);
exports.agentAnswerQuestions = agentAnswerQuestions;
const agentBuildPlan = async (sessionId, pendingId) => (0, agent_loop_1.buildAgentPlan)(sessionId, pendingId);
exports.agentBuildPlan = agentBuildPlan;
const agentDismissPlan = async (sessionId, pendingId) => (0, agent_loop_1.dismissAgentPlan)(sessionId, pendingId);
exports.agentDismissPlan = agentDismissPlan;
const agentComposePlanBuild = async (projectRoot, planPath) => (0, agent_loop_1.composePlanBuildMessage)(projectRoot, planPath);
exports.agentComposePlanBuild = agentComposePlanBuild;
const agentRunUserShell = async (projectRoot, command) => (0, agent_loop_1.runUserShellCommand)(projectRoot, command);
exports.agentRunUserShell = agentRunUserShell;
const chatCompact = async (messages) => (0, chat_compact_1.compactChatHistory)(messages);
exports.chatCompact = chatCompact;
const agentHooksHelp = async () => ({ ok: true, text: (0, agent_loop_1.formatHooksHelp)() });
exports.agentHooksHelp = agentHooksHelp;
const agentListMcp = async (projectRoot) => {
    try {
        const text = await (0, agent_mcp_1.listMcpResources)(projectRoot);
        return { ok: true, text };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListMcp = agentListMcp;
const agentListSkills = async (projectRoot) => {
    try {
        const skills = await (0, agent_skills_1.discoverSkills)(projectRoot);
        return { ok: true, skills };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListSkills = agentListSkills;
const agentLoadSkill = async (projectRoot, skillName) => {
    const skill = await (0, agent_skills_1.findSkillByName)(projectRoot, skillName);
    if (!skill)
        return { ok: false, error: 'Skill not found' };
    const text = await (0, agent_skills_1.readSkillContent)(skill.path);
    return { ok: true, name: skill.name, text, path: skill.path };
};
exports.agentLoadSkill = agentLoadSkill;
const agentListCustomCommands = async (projectRoot) => {
    try {
        const commands = await (0, agent_custom_commands_1.discoverCustomCommands)(projectRoot);
        return { ok: true, commands, dirs: [] };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListCustomCommands = agentListCustomCommands;
const agentLoadCustomCommand = async (projectRoot, commandName) => {
    const cmd = await (0, agent_custom_commands_1.findCustomCommandByName)(projectRoot, commandName);
    if (!cmd)
        return { ok: false, error: 'Command not found' };
    const read = await (0, agent_custom_commands_1.readCustomCommandContent)(cmd.path);
    if (!read.ok)
        return read;
    return { ok: true, name: cmd.name, text: read.text, path: cmd.path };
};
exports.agentLoadCustomCommand = agentLoadCustomCommand;
const agentListBuiltinCommands = async () => {
    try {
        const commands = await (0, agent_builtin_commands_1.listBuiltinCommands)();
        return { ok: true, commands, dir: '' };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListBuiltinCommands = agentListBuiltinCommands;
const agentLoadBuiltinCommand = async (commandName) => {
    try {
        const loaded = await (0, agent_builtin_commands_1.loadBuiltinCommand)(commandName);
        return { ok: true, name: loaded.name, text: loaded.text, path: loaded.path };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentLoadBuiltinCommand = agentLoadBuiltinCommand;
const agentListBuiltinSkills = async () => {
    try {
        const skills = await (0, agent_builtin_skills_1.listBuiltinSkills)();
        return { ok: true, skills, dir: '' };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListBuiltinSkills = agentListBuiltinSkills;
const agentLoadBuiltinSkill = async (skillName) => {
    try {
        const loaded = await (0, agent_builtin_skills_1.loadBuiltinSkill)(skillName);
        return { ok: true, name: loaded.name, text: loaded.text, path: loaded.path };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentLoadBuiltinSkill = agentLoadBuiltinSkill;
const agentListOutputStyles = async (projectRoot) => {
    try {
        await (0, agent_output_styles_custom_1.refreshCustomOutputStylesCache)(projectRoot);
        const custom = (0, agent_output_styles_custom_1.getCachedCustomOutputStyles)();
        const styles = [
            ...Object.entries(agent_output_styles_1.OUTPUT_STYLE_CONFIG).map(([id, cfg]) => ({
                id,
                name: cfg.name,
                description: cfg.description,
                source: 'builtin',
            })),
            ...custom.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                source: s.source,
            })),
        ];
        const cfg = await (0, config_store_1.getConfig)();
        return {
            ok: true,
            activeId: cfg.agentOutputStyle ?? agent_output_styles_1.DEFAULT_OUTPUT_STYLE_NAME,
            styles,
            dirs: [],
        };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListOutputStyles = agentListOutputStyles;
const agentSetOutputStyle = async (styleId) => {
    await (0, config_store_1.setConfig)({ agentOutputStyle: styleId });
    return { ok: true, activeId: styleId };
};
exports.agentSetOutputStyle = agentSetOutputStyle;
const agentListSessions = async () => ({
    ok: true,
    sessions: (0, agent_loop_1.listAgentSessions)(),
});
exports.agentListSessions = agentListSessions;
const agentListCheckpoints = async (sessionId) => {
    try {
        const checkpoints = await (0, agent_checkpoint_1.listAgentCheckpoints)(sessionId);
        return { ok: true, checkpoints };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentListCheckpoints = agentListCheckpoints;
const agentRewind = async (sessionId, checkpointId) => (0, agent_loop_1.rewindAgentCheckpoint)(sessionId, checkpointId);
exports.agentRewind = agentRewind;
const agentListBackgroundTasks = async (sessionId) => ({
    ok: true,
    tasks: (0, agent_subagent_tasks_1.listBackgroundRuns)(sessionId),
});
exports.agentListBackgroundTasks = agentListBackgroundTasks;
const agentResolveBackgroundTasks = async (projectRoot, taskIds) => (0, agent_subagent_tasks_1.resolveBackgroundTasks)(projectRoot, taskIds);
exports.agentResolveBackgroundTasks = agentResolveBackgroundTasks;
const agentReadMemory = async () => {
    try {
        const { path: p, text } = await (0, agent_checkpoint_1.readMemoryFile)();
        return { ok: true, path: p, text };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentReadMemory = agentReadMemory;
const agentWriteMemory = async (text) => {
    try {
        const { path: p } = await (0, agent_checkpoint_1.writeMemoryFile)(text);
        return { ok: true, path: p };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
};
exports.agentWriteMemory = agentWriteMemory;
const agentDesignSlash = async (projectRoot, args) => (0, design_slash_1.runDesignSlash)(projectRoot, args);
exports.agentDesignSlash = agentDesignSlash;
const agentProjectMemory = async (projectRoot) => {
    if (!projectRoot?.trim())
        return { ok: false, error: 'No project' };
    const { composeMemoryPrompt, loadMemoryIndex } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/agent/agent-memory')));
    const index = await loadMemoryIndex(projectRoot);
    const full = await composeMemoryPrompt(projectRoot);
    const text = full?.trim() ||
        (index ? `# Saved memories\n\n${index}` : '(no project memory yet — use Remember tool or create AGENTS.md)');
    return { ok: true, text };
};
exports.agentProjectMemory = agentProjectMemory;
const agentPlanModeHelp = async () => ({
    ok: true,
    text: 'Plan mode: analyze first, implement after approval.',
});
exports.agentPlanModeHelp = agentPlanModeHelp;
const agentRewindHelp = async (_projectRoot) => ({
    ok: true,
    text: 'Use /rewind or checkpoint list to restore files.',
});
exports.agentRewindHelp = agentRewindHelp;
//# sourceMappingURL=agent-service.js.map