"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workshopSendUserAnswer = exports.workshopSendMessage = exports.workshopStartRun = exports.workshopStop = exports.deleteWorkshopSessionHandler = exports.saveWorkshopSessionHandler = exports.getWorkshopSessionHandler = exports.getWorkshopSessions = void 0;
const workshop_store_1 = require("@axecoder/core/workshop/workshop-store");
const workshop_turn_orchestrator_1 = require("@axecoder/core/workshop/workshop-turn-orchestrator");
const agent_loop_1 = require("@axecoder/core/agent/agent-loop");
const agent_session_store_1 = require("@axecoder/core/agent/agent-session-store");
const getWorkshopSessions = async (projectRoot) => ({
    sessions: await (0, workshop_store_1.listWorkshopSessions)(typeof projectRoot === 'string' ? projectRoot : ''),
});
exports.getWorkshopSessions = getWorkshopSessions;
const getWorkshopSessionHandler = async (projectRoot, workshopId) => (0, workshop_store_1.getWorkshopSession)(typeof projectRoot === 'string' ? projectRoot : '', workshopId);
exports.getWorkshopSessionHandler = getWorkshopSessionHandler;
const saveWorkshopSessionHandler = async (projectRoot, session) => (0, workshop_store_1.saveWorkshopSession)(typeof projectRoot === 'string' ? projectRoot : '', session);
exports.saveWorkshopSessionHandler = saveWorkshopSessionHandler;
const deleteWorkshopSessionHandler = async (projectRoot, workshopId) => (0, workshop_store_1.deleteWorkshopSession)(typeof projectRoot === 'string' ? projectRoot : '', workshopId);
exports.deleteWorkshopSessionHandler = deleteWorkshopSessionHandler;
const workshopStop = async (workshopId) => {
    const wid = typeof workshopId === 'string' ? workshopId.trim() : '';
    if (!wid)
        return { ok: false, error: 'Invalid workshop id' };
    const prefix = `workshop-${wid}-`;
    let stopped = 0;
    for (const { id } of (0, agent_session_store_1.listAgentSessions)()) {
        if (id.startsWith(prefix)) {
            (0, agent_loop_1.stopAgentTurn)(id);
            stopped++;
        }
    }
    return { ok: true, stopped };
};
exports.workshopStop = workshopStop;
const workshopStartRun = async (projectRoot, workshopId, userBrief, modelId) => {
    let session = null;
    if (workshopId?.trim()) {
        const got = await (0, workshop_store_1.getWorkshopSession)(projectRoot, workshopId);
        session = got.session;
    }
    if (!session) {
        session = (0, workshop_store_1.newWorkshopSession)(projectRoot, userBrief, modelId, workshopId);
    }
    return (0, workshop_turn_orchestrator_1.sendWorkshopMessage)(projectRoot, session, userBrief, modelId);
};
exports.workshopStartRun = workshopStartRun;
const workshopSendMessage = async (projectRoot, workshopId, text, modelId, _mode, displayText, imageRefs, preferredAssigneeUserId, orchestrationChatMode) => {
    const got = await (0, workshop_store_1.getWorkshopSession)(projectRoot, workshopId);
    let session = got.session;
    if (!session) {
        session = (0, workshop_store_1.newWorkshopSession)(projectRoot, text, modelId, workshopId);
    }
    return (0, workshop_turn_orchestrator_1.sendWorkshopMessage)(projectRoot, session, text, modelId, displayText, imageRefs, preferredAssigneeUserId, orchestrationChatMode);
};
exports.workshopSendMessage = workshopSendMessage;
const workshopSendUserAnswer = async (projectRoot, workshopId, answer) => {
    const got = await (0, workshop_store_1.getWorkshopSession)(projectRoot, workshopId);
    const session = got.session;
    if (!session)
        return { ok: false, error: 'Workshop not found' };
    return (0, workshop_turn_orchestrator_1.sendWorkshopMessage)(projectRoot, session, answer, session.modelId ?? '');
};
exports.workshopSendUserAnswer = workshopSendUserAnswer;
//# sourceMappingURL=workshop-service.js.map