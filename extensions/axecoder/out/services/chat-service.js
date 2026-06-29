"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiChat = exports.getChatImagePreview = exports.resolveChatImageRefsHandler = exports.saveChatPastedImageHandler = exports.chatSwitchBranch = exports.chatForkBranch = exports.chatBranchTree = exports.deleteChatSessionHandler = exports.saveChatSessionHandler = exports.getChatSessionHandler = exports.getChatSessionsHandler = void 0;
const chat_store_1 = require("@axecoder/core/chat-store");
const chat_branch_1 = require("@axecoder/core/chat-branch");
const chat_attachments_1 = require("@axecoder/core/chat-attachments");
const chat_with_tools_1 = require("@axecoder/core/ai/chat-with-tools");
const getChatSessionsHandler = async (projectRoot) => ({
    sessions: await (0, chat_store_1.listChatSessions)(typeof projectRoot === 'string' ? projectRoot : ''),
});
exports.getChatSessionsHandler = getChatSessionsHandler;
const getChatSessionHandler = async (projectRoot, sessionId) => ({
    session: await (0, chat_store_1.getChatSession)(typeof projectRoot === 'string' ? projectRoot : '', sessionId),
});
exports.getChatSessionHandler = getChatSessionHandler;
const saveChatSessionHandler = async (projectRoot, session) => (0, chat_store_1.saveChatSession)(typeof projectRoot === 'string' ? projectRoot : '', session);
exports.saveChatSessionHandler = saveChatSessionHandler;
const deleteChatSessionHandler = async (projectRoot, sessionId) => (0, chat_store_1.deleteChatSession)(typeof projectRoot === 'string' ? projectRoot : '', sessionId);
exports.deleteChatSessionHandler = deleteChatSessionHandler;
const chatBranchTree = async (projectRoot, currentId) => (0, chat_branch_1.branchTree)(projectRoot, currentId);
exports.chatBranchTree = chatBranchTree;
const chatForkBranch = async (projectRoot, sourceSessionId, args) => (0, chat_branch_1.forkBranch)(projectRoot, sourceSessionId, args ?? '');
exports.chatForkBranch = chatForkBranch;
const chatSwitchBranch = async (projectRoot, ref, currentId) => (0, chat_branch_1.switchBranch)(projectRoot, ref, currentId);
exports.chatSwitchBranch = chatSwitchBranch;
const saveChatPastedImageHandler = async (sessionId, base64, mimeType) => (0, chat_attachments_1.saveChatPastedImage)(sessionId, base64, mimeType);
exports.saveChatPastedImageHandler = saveChatPastedImageHandler;
const resolveChatImageRefsHandler = async (refs) => (0, chat_attachments_1.resolveChatImageRefs)(refs);
exports.resolveChatImageRefsHandler = resolveChatImageRefsHandler;
const getChatImagePreview = async (ref) => (0, chat_attachments_1.chatImageRefPreviewDataUrl)(ref);
exports.getChatImagePreview = getChatImagePreview;
const aiChat = async (modelId, messages, streamId, reasoningEffort) => (0, chat_with_tools_1.chatWithToolsForModel)(modelId, messages, streamId, reasoningEffort);
exports.aiChat = aiChat;
//# sourceMappingURL=chat-service.js.map