"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatWebviewProvider = void 0;
const webview_bridge_1 = require("../rpc/webview-bridge");
const webview_utils_1 = require("./webview-utils");
const broadcast_1 = require("../host/broadcast");
/** Chat Webview — Legacy ChatPane via RPC shim */
class ChatWebviewProvider {
    extensionUri;
    context;
    output;
    view;
    constructor(extensionUri, context, output) {
        this.extensionUri = extensionUri;
        this.context = context;
        this.output = output;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        webviewView.webview.html = (0, webview_utils_1.webviewHtml)(webviewView.webview, this.extensionUri, 'chat', 'AxeCoder Chat');
        (0, webview_utils_1.attachWebviewRpc)(webviewView.webview);
        (0, webview_utils_1.trackActiveEditor)(this.context, () => this.view?.webview);
        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg.type === 'ready') {
                this.output.appendLine('[chat] webview ready');
                const root = (0, broadcast_1.getWorkspaceRoot)();
                if (root) {
                    webview_bridge_1.globalRpcBridge.notifyActiveEditor(webviewView.webview, null);
                }
            }
        });
    }
    focusSession(sessionId, kind) {
        if (!this.view)
            return;
        webview_bridge_1.globalRpcBridge.notifySessionSelect(this.view.webview, sessionId, kind);
    }
}
exports.ChatWebviewProvider = ChatWebviewProvider;
//# sourceMappingURL=chat-provider.js.map