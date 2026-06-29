"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAiTraceHandler = exports.clearAiTraceHandler = exports.setAiTraceRecordingHandler = exports.getAiTraceStateHandler = void 0;
const ai_trace_store_1 = require("@axecoder/core/ai-trace-store");
const getAiTraceStateHandler = async () => (0, ai_trace_store_1.getAiTraceState)();
exports.getAiTraceStateHandler = getAiTraceStateHandler;
const setAiTraceRecordingHandler = async (on) => (0, ai_trace_store_1.setAiTraceRecording)(on);
exports.setAiTraceRecordingHandler = setAiTraceRecordingHandler;
const clearAiTraceHandler = async () => (0, ai_trace_store_1.clearAiTrace)();
exports.clearAiTraceHandler = clearAiTraceHandler;
const saveAiTraceHandler = async () => (0, ai_trace_store_1.saveAiTraceToFile)();
exports.saveAiTraceHandler = saveAiTraceHandler;
//# sourceMappingURL=trace-service.js.map