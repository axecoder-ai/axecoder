/** iframe 内 axecoder 代理：postMessage → 父页面 window.axecoder */

let rpcSeq = 0

const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

export const installAxecoderShim = () => {
  window.addEventListener('message', (ev) => {
    const data = ev.data as { channel?: string; id?: string; ok?: boolean; result?: unknown; error?: string }
    if (data?.channel !== 'webview:rpc:result' || !data.id) return
    const p = pending.get(data.id)
    if (!p) return
    pending.delete(data.id)
    if (data.ok) p.resolve(data.result)
    else p.reject(new Error(data.error ?? 'rpc failed'))
  })

  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined
      const method = String(prop)
      return (...args: unknown[]) => {
        const id = `rpc-${++rpcSeq}`
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject })
          window.parent.postMessage({ channel: 'webview:rpc', id, method, args }, '*')
        })
      }
    },
  }

  ;(window as unknown as { axecoder: unknown }).axecoder = new Proxy({}, handler)
}

export const emitViewEvent = (viewId: string, name: string, payload?: unknown) => {
  window.parent.postMessage({ channel: 'webview:event', viewId, name, payload }, '*')
}

export const currentViewIdFromHash = (): string => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash.split('/')[0] || 'explorer'
}
