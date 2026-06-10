import http from 'node:http'

export type OAuthCallbackResult = { code: string; state?: string }

/** 本地 loopback 接收 OAuth 回调（对齐桌面客户端常见做法） */
export const listenOAuthCallback = (
  port: number,
  timeoutMs = 120_000,
): { wait: Promise<OAuthCallbackResult>; close: () => void } => {
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let server: http.Server | undefined

  const wait = new Promise<OAuthCallbackResult>((resolve, reject) => {
    server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
        if (url.pathname !== '/callback') {
          res.writeHead(404)
          res.end()
          return
        }
        const error = url.searchParams.get('error')
        const code = url.searchParams.get('code')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        if (error) {
          res.end('<html><body><p>Authorization failed. You may close this tab.</p></body></html>')
          if (!settled) {
            settled = true
            reject(new Error(error))
          }
          return
        }
        if (!code) {
          res.end('<html><body><p>Missing authorization code.</p></body></html>')
          if (!settled) {
            settled = true
            reject(new Error('Missing authorization code'))
          }
          return
        }
        res.end(
          '<html><body><p>Connected! You can close this tab and return to AxeCoder.</p></body></html>',
        )
        if (!settled) {
          settled = true
          resolve({ code, state: url.searchParams.get('state') ?? undefined })
        }
      } catch (e) {
        if (!settled) {
          settled = true
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      }
    })

    server.listen(port, '127.0.0.1')

    timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('OAuth authorization timed out'))
      }
    }, timeoutMs)
  })

  const close = () => {
    if (timer) clearTimeout(timer)
    server?.close()
  }

  wait.finally(close)

  return { wait, close }
}

export const pickOAuthCallbackPort = async (): Promise<number> => {
  const server = http.createServer()
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve())
    server.on('error', reject)
  })
  const addr = server.address()
  server.close()
  if (!addr || typeof addr === 'string') throw new Error('Could not allocate OAuth callback port')
  return addr.port
}
