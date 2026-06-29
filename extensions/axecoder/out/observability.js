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
exports.registerObservabilityCommands = void 0;
const vscode = __importStar(require("vscode"));
const webview_utils_1 = require("./webview/webview-utils");
const openPanel = (context, command, bundle, title, column = vscode.ViewColumn.Beside) => {
    context.subscriptions.push(vscode.commands.registerCommand(command, () => {
        const panel = vscode.window.createWebviewPanel(command, title, column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri],
        });
        panel.webview.html = (0, webview_utils_1.webviewHtml)(panel.webview, context.extensionUri, bundle, title);
        (0, webview_utils_1.attachWebviewRpc)(panel.webview);
    }));
};
const registerObservabilityCommands = (context) => {
    openPanel(context, 'axecoder.openMetrics', 'metrics', 'AxeCoder AI Performance');
    openPanel(context, 'axecoder.openTrace', 'trace', 'AxeCoder AI Request Trace');
};
exports.registerObservabilityCommands = registerObservabilityCommands;
//# sourceMappingURL=observability.js.map