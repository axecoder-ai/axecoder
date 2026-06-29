"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestTitle = exports.listAllSessions = void 0;
const session_registry_1 = require("@axecoder/core/session/session-registry");
const session_title_1 = require("@axecoder/core/session/session-title");
const listAllSessions = async (projectRoot) => (0, session_registry_1.listAllSessions)(typeof projectRoot === 'string' ? projectRoot : '');
exports.listAllSessions = listAllSessions;
const suggestTitle = async (modelId, messages, currentTitle) => {
    const list = Array.isArray(messages) ? messages : [];
    const normalized = list
        .filter((m) => m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.text === 'string')
        .map((m) => ({ role: m.role, text: m.text }));
    return (0, session_title_1.suggestChatSessionTitle)(typeof modelId === 'string' ? modelId : '', normalized, typeof currentTitle === 'string' ? currentTitle : '');
};
exports.suggestTitle = suggestTitle;
//# sourceMappingURL=session-service.js.map