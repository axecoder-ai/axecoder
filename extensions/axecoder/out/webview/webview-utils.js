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
exports.trackActiveEditor = exports.attachWebviewRpc = exports.webviewHtml = exports.bundleUri = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const webview_bridge_1 = require("../rpc/webview-bridge");
const bundleUri = (extensionUri, bundleName) => {
    const file = path.join(extensionUri.fsPath, 'webview', 'dist', `${bundleName}.js`);
    if (!fs.existsSync(file))
        return null;
    return vscode.Uri.file(file);
};
exports.bundleUri = bundleUri;
const webviewHtml = (webview, extensionUri, bundleName, title) => {
    const scriptUri = (0, exports.bundleUri)(extensionUri, bundleName);
    if (scriptUri) {
        const src = webview.asWebviewUri(scriptUri);
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body style="margin:0;padding:0;height:100vh;overflow:hidden"><div id="app"></div><script src="${src}"></script></body></html>`;
    }
    return `<!DOCTYPE html><html><body style="font-family:var(--vscode-font-family);padding:16px"><h3>${title}</h3><p>Run <code>npm run compile --prefix extensions/axecoder</code> to build webview bundles.</p></body></html>`;
};
exports.webviewHtml = webviewHtml;
const attachWebviewRpc = (webview) => {
    webview_bridge_1.globalRpcBridge.attach(webview);
};
exports.attachWebviewRpc = attachWebviewRpc;
const trackActiveEditor = (context, getWebview) => {
    const push = () => {
        const wv = getWebview();
        if (!wv)
            return;
        const ed = vscode.window.activeTextEditor;
        webview_bridge_1.globalRpcBridge.notifyActiveEditor(wv, ed?.document.uri.fsPath ?? null);
    };
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => push()));
    push();
};
exports.trackActiveEditor = trackActiveEditor;
//# sourceMappingURL=webview-utils.js.map