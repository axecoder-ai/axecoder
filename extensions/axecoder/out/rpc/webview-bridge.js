"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRpcBridge = exports.WebviewRpcBridge = void 0;
const registry_1 = require("./registry");
const broadcast_1 = require("../host/broadcast");
const channels_1 = require("./channels");
const LISTENER_TO_CHANNEL = channels_1.EVENT_CHANNELS;
let handlers = null;
const getHandlers = () => {
    if (!handlers)
        handlers = (0, registry_1.createRpcHandlers)();
    return handlers;
};
class WebviewRpcBridge {
    subs = new Map();
    disposePoster;
    constructor() {
        this.disposePoster = (0, broadcast_1.registerWebviewPoster)((channel, payload) => {
            this.postEvent(channel, payload);
        });
    }
    attach(webview) {
        webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === 'ready')
                return;
            if (msg.type === 'subscribe') {
                for (const ch of msg.channels) {
                    if (!this.subs.has(ch))
                        this.subs.set(ch, new Set());
                    this.subs.get(ch).add(webview);
                }
                return;
            }
            if (msg.type === 'rpc') {
                const map = getHandlers();
                const fn = map[msg.method];
                if (!fn) {
                    void webview.postMessage({
                        type: 'rpcError',
                        id: msg.id,
                        error: `Unknown RPC method: ${msg.method}`,
                    });
                    return;
                }
                try {
                    const result = await fn(...msg.args);
                    void webview.postMessage({
                        type: 'rpcResult',
                        id: msg.id,
                        result,
                    });
                }
                catch (e) {
                    void webview.postMessage({
                        type: 'rpcError',
                        id: msg.id,
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }
        });
    }
    postEvent(channel, payload) {
        const set = this.subs.get(channel);
        if (!set?.size)
            return;
        const msg = { type: 'event', channel, payload };
        for (const wv of set) {
            void wv.postMessage(msg);
        }
    }
    notifyActiveEditor(webview, filePath) {
        void webview.postMessage({ type: 'activeEditor', path: filePath });
    }
    notifySessionSelect(webview, sessionId, kind) {
        void webview.postMessage({ type: 'sessionSelect', sessionId, kind });
    }
    static eventChannelsForListeners(names) {
        return names.map((n) => LISTENER_TO_CHANNEL[n]);
    }
    dispose() {
        this.disposePoster?.();
        this.subs.clear();
    }
}
exports.WebviewRpcBridge = WebviewRpcBridge;
exports.globalRpcBridge = new WebviewRpcBridge();
//# sourceMappingURL=webview-bridge.js.map