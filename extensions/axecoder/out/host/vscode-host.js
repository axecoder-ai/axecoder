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
exports.createVscodeHost = void 0;
const vscode = __importStar(require("vscode"));
const createVscodeHost = (context, output) => {
    let workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
        workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
    }));
    const fs = {
        async readFile(filePath, encoding = 'utf8') {
            try {
                const uri = vscode.Uri.file(filePath);
                const buf = await vscode.workspace.fs.readFile(uri);
                const content = encoding === 'utf8' ? Buffer.from(buf).toString('utf8') : Buffer.from(buf).toString('utf8');
                return { ok: true, content };
            }
            catch (e) {
                return { ok: false, error: String(e) };
            }
        },
        async writeFile(filePath, content) {
            try {
                const uri = vscode.Uri.file(filePath);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                return { ok: true };
            }
            catch (e) {
                return { ok: false, error: String(e) };
            }
        },
        async stat(filePath) {
            try {
                const uri = vscode.Uri.file(filePath);
                const s = await vscode.workspace.fs.stat(uri);
                return {
                    isFile: s.type === vscode.FileType.File,
                    isDirectory: s.type === vscode.FileType.Directory,
                    size: s.size,
                    mtimeMs: s.mtime,
                };
            }
            catch {
                return null;
            }
        },
        async exists(filePath) {
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
                return true;
            }
            catch {
                return false;
            }
        },
    };
    const shell = {
        async exec(command, cwd) {
            output.appendLine(`[shell] ${command} (cwd=${cwd})`);
            const term = vscode.window.createTerminal({ cwd, name: 'AxeCoder Agent' });
            term.show();
            term.sendText(command, true);
            return { stdout: '', stderr: 'See integrated terminal', exitCode: 0 };
        },
    };
    const secrets = {
        get: async (key) => context.secrets.get(key),
        set: async (key, value) => {
            await context.secrets.store(key, value);
        },
        delete: async (key) => {
            await context.secrets.delete(key);
        },
    };
    const windowHost = {
        showInformationMessage: async (msg) => {
            await vscode.window.showInformationMessage(msg);
        },
        showErrorMessage: async (msg) => {
            await vscode.window.showErrorMessage(msg);
        },
        showWarningMessage: async (msg) => {
            await vscode.window.showWarningMessage(msg);
        },
    };
    const host = {
        fs,
        shell,
        secrets,
        window: windowHost,
        workspaceRoot,
    };
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
        host.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
    }));
    return host;
};
exports.createVscodeHost = createVscodeHost;
//# sourceMappingURL=vscode-host.js.map