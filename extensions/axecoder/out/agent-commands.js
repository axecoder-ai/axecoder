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
exports.registerAgentCommands = void 0;
const vscode = __importStar(require("vscode"));
const agent_service_1 = require("./services/agent-service");
const broadcast_1 = require("./host/broadcast");
const registerAgentCommands = (context, output) => {
    context.subscriptions.push(vscode.commands.registerCommand('axecoder.agent.send', async () => {
        const root = (0, broadcast_1.getWorkspaceRoot)();
        if (!root) {
            await vscode.window.showWarningMessage('Open a workspace folder first');
            return;
        }
        const msg = await vscode.window.showInputBox({ prompt: 'Agent message' });
        if (!msg?.trim())
            return;
        const models = await Promise.resolve().then(() => __importStar(require('./services/models-service'))).then((m) => m.listModelsHandler());
        const active = models.activeModelId || models.models.find((x) => x.enabled)?.id;
        if (!active) {
            await vscode.window.showErrorMessage('Configure a model in AxeCoder Settings first');
            return;
        }
        output.appendLine(`[agent.send] ${msg.slice(0, 80)}`);
        const result = await (0, agent_service_1.agentSend)(root, active, [{ role: 'user', content: msg }]);
        if (!result.ok) {
            await vscode.window.showErrorMessage(result.error ?? 'Agent send failed');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('axecoder.agent.stop', async () => {
        const sessionId = await vscode.window.showInputBox({ prompt: 'Session id to stop' });
        if (!sessionId)
            return;
        (0, agent_service_1.agentStop)(sessionId);
        output.appendLine(`[agent.stop] ${sessionId}`);
    }));
};
exports.registerAgentCommands = registerAgentCommands;
//# sourceMappingURL=agent-commands.js.map