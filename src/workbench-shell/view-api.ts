/** iframe 内：响应父页面 webview:call */

type ViewHandler = Record<string, (...args: unknown[]) => unknown | Promise<unknown>>

const handlers = new Map<string, ViewHandler>()

export const registerViewHandlers = (viewId: string, api: ViewHandler) => {
  handlers.set(viewId, api)
}

export const installViewCallHandler = () => {
  window.addEventListener('message', async (ev) => {
    const data = ev.data as {
      channel?: string
      viewId?: string
      callId?: string
      method?: string
      args?: unknown[]
    }
    if (data?.channel !== 'webview:call' || !data.callId || !data.viewId || !data.method) return
    const api = handlers.get(data.viewId)
    const fn = api?.[data.method]
    const reply = (payload: { ok: boolean; result?: unknown; error?: string }) => {
      window.parent.postMessage({ channel: 'webview:call:result', callId: data.callId, ...payload }, '*')
    }
    if (typeof fn !== 'function') {
      reply({ ok: false, error: `Unknown method ${data.viewId}.${data.method}` })
      return
    }
    try {
      const result = await fn(...(data.args ?? []))
      reply({ ok: true, result })
    } catch (e) {
      reply({ ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
}
