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
exports.registerSessionCommands = exports.SessionsTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const session_service_1 = require("../services/session-service");
const broadcast_1 = require("../host/broadcast");
class SessionsTreeProvider {
    onSelect;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(onSelect) {
        this.onSelect = onSelect;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.id = element.id;
        item.contextValue = element.kind;
        item.description = element.kind === 'workshop' ? 'Workshop' : 'Agent';
        item.iconPath = new vscode.ThemeIcon(element.kind === 'workshop' ? 'organization' : 'comment-discussion');
        item.command = {
            command: 'axecoder.session.select',
            title: 'Select session',
            arguments: [element],
        };
        return item;
    }
    async getChildren() {
        const root = (0, broadcast_1.getWorkspaceRoot)();
        if (!root) {
            return [
                {
                    id: 'hint',
                    label: 'Open a folder to list sessions',
                    kind: 'agent',
                },
            ];
        }
        try {
            const { sessions } = await (0, session_service_1.listAllSessions)(root);
            if (!sessions.length) {
                return [{ id: 'empty', label: 'No sessions yet', kind: 'agent' }];
            }
            return sessions.map((s) => ({
                id: s.id,
                label: s.title || s.id,
                kind: s.kind,
                updatedAt: s.updatedAt,
            }));
        }
        catch {
            return [{ id: 'err', label: 'Failed to load sessions', kind: 'agent' }];
        }
    }
}
exports.SessionsTreeProvider = SessionsTreeProvider;
const registerSessionCommands = (context, tree, chatProvider) => {
    context.subscriptions.push(vscode.commands.registerCommand('axecoder.session.select', (item) => {
        if (!item?.id || item.id === 'hint' || item.id === 'empty' || item.id === 'err')
            return;
        chatProvider.focusSession(item.id, item.kind);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('axecoder.session.refresh', () => tree.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('axecoder.session.newAgent', async () => {
        const root = (0, broadcast_1.getWorkspaceRoot)();
        if (!root) {
            await vscode.window.showWarningMessage('Open a workspace folder first');
            return;
        }
        tree.refresh();
        await vscode.commands.executeCommand('axecoder.chat.focus');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('axecoder.session.newWorkshop', async () => {
        await vscode.commands.executeCommand('axecoder.workshop');
    }));
};
exports.registerSessionCommands = registerSessionCommands;
//# sourceMappingURL=sessions-tree.js.map