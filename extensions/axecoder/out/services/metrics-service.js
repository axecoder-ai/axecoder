"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAiMetricsSnapshotHandler = void 0;
const ai_metrics_store_1 = require("@axecoder/core/ai-metrics-store");
const getAiMetricsSnapshotHandler = async (filter) => {
    if (typeof filter === 'string') {
        const id = filter.trim();
        return (0, ai_metrics_store_1.getAiMetricsSnapshot)(id || undefined);
    }
    if (filter && typeof filter === 'object')
        return (0, ai_metrics_store_1.getAiMetricsSnapshot)(filter);
    return (0, ai_metrics_store_1.getAiMetricsSnapshot)();
};
exports.getAiMetricsSnapshotHandler = getAiMetricsSnapshotHandler;
//# sourceMappingURL=metrics-service.js.map