"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_CHANNELS = void 0;
/** Legacy IPC channel ↔ Webview 事件订阅名 */
exports.EVENT_CHANNELS = {
    onWindowLayout: 'window:layout',
    onCompanionWindowState: 'window:companionState',
    onMetricsWindowDetached: 'window:metricsDetached',
    onTraceWindowDetached: 'window:traceDetached',
    onAiMetricsUpdate: 'aiMetrics:update',
    onAiMetricsActivity: 'aiMetrics:activity',
    onAiTraceUpdate: 'aiTrace:update',
    onOpenProject: 'project:open',
    onOpenProjectAt: 'project:openAt',
    onBeforeQuit: 'app:beforeQuit',
    onFileChanged: 'fs:fileChanged',
    onThemeChange: 'settings:theme',
    onAiStream: 'ai:stream',
    onAgentProgress: 'agent:progress',
    onTerminalData: 'terminal:data',
    onOutputUpdated: 'output:updated',
    onLspDiagnostics: 'lsp:diagnostics',
    onLspRefreshFile: 'lsp:refreshFile',
    onWorkshopProgress: 'workshop:progress',
    onDrawIoDiagramUpdated: 'drawIo:diagramUpdated',
};
//# sourceMappingURL=channels.js.map