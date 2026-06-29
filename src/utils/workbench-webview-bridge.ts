/** 父页面 ↔ workbench-shell iframe 通信 */

export type WebviewBridgeMessage =
  | { channel: 'webview:rpc'; id: string; method: string; args: unknown[] }
  | { channel: 'webview:rpc:result'; id: string; ok: boolean; result?: unknown; error?: string }
  | { channel: 'webview:event'; viewId: string; name: string; payload?: unknown }
  | { channel: 'webview:call'; viewId: string; callId: string; method: string; args: unknown[] }
  | { channel: 'webview:call:result'; callId: string; ok: boolean; result?: unknown; error?: string }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

export const parseBridgeMessage = (data: unknown): WebviewBridgeMessage | null => {
  if (!isRecord(data) || typeof data.channel !== 'string') return null
  return data as WebviewBridgeMessage
}

/** 父页面：代理 iframe 内 axecoder RPC */
export const attachParentAxecoderBridge = (
  iframe: HTMLIFrameElement,
  axecoder: Record<string, unknown>,
) => {
  const onMessage = async (ev: MessageEvent) => {
    if (ev.source !== iframe.contentWindow) return
    const msg = parseBridgeMessage(ev.data)
    if (!msg || msg.channel !== 'webview:rpc') return
    const fn = axecoder[msg.method]
    if (typeof fn !== 'function') {
      iframe.contentWindow?.postMessage(
        {
          channel: 'webview:rpc:result',
          id: msg.id,
          ok: false,
          error: `Unknown axecoder method: ${msg.method}`,
        },
        '*',
      )
      return
    }
    try {
      const result = await (fn as (...a: unknown[]) => unknown).apply(axecoder, msg.args)
      iframe.contentWindow?.postMessage(
        { channel: 'webview:rpc:result', id: msg.id, ok: true, result },
        '*',
      )
    } catch (e) {
      iframe.contentWindow?.postMessage(
        {
          channel: 'webview:rpc:result',
          id: msg.id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        },
        '*',
      )
    }
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}

/** 父页面：调用 iframe 内暴露的方法 */
export const callWebviewMethod = (
  iframe: HTMLIFrameElement,
  viewId: string,
  method: string,
  args: unknown[] = [],
  timeoutMs = 8000,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onResult)
      reject(new Error(`webview call timeout: ${viewId}.${method}`))
    }, timeoutMs)
    const onResult = (ev: MessageEvent) => {
      if (ev.source !== iframe.contentWindow) return
      const msg = parseBridgeMessage(ev.data)
      if (!msg || msg.channel !== 'webview:call:result' || msg.callId !== callId) return
      window.clearTimeout(timer)
      window.removeEventListener('message', onResult)
      if (msg.ok) resolve(msg.result)
      else reject(new Error(msg.error ?? 'webview call failed'))
    }
    window.addEventListener('message', onResult)
    iframe.contentWindow?.postMessage(
      { channel: 'webview:call', viewId, callId, method, args },
      '*',
    )
  })
