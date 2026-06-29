"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMetricsBroadcast = void 0;
const broadcast_1 = require("./host/broadcast");
const ai_metrics_store_1 = require("@axecoder/core/ai-metrics-store");
let timer = null;
const startMetricsBroadcast = (context) => {
    if (timer)
        return;
    timer = setInterval(() => {
        (0, broadcast_1.broadcastToWebviews)('aiMetrics:update', (0, ai_metrics_store_1.getAiMetricsSnapshot)());
    }, 1500);
    context.subscriptions.push({
        dispose: () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        },
    });
};
exports.startMetricsBroadcast = startMetricsBroadcast;
//# sourceMappingURL=metrics-timer.js.map