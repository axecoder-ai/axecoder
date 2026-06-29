import { describe, expect, it } from 'vitest'
import {
  parseExtensionHostLine,
  serializeExtensionHostLine,
} from '../../../electron/main/extension-host/protocol'

describe('extension-host protocol', () => {
  it('parseExtensionHostLine 解析 req/res/notify', () => {
    const req = parseExtensionHostLine('{"type":"req","id":1,"method":"ping"}')
    expect(req?.type).toBe('req')
    if (req?.type === 'req') {
      expect(req.method).toBe('ping')
      expect(req.id).toBe(1)
    }

    const res = parseExtensionHostLine('{"type":"res","id":2,"ok":true,"result":{"pong":true}}')
    expect(res?.type).toBe('res')

    const notify = parseExtensionHostLine('{"type":"notify","channel":"diagnostics","payload":{}}')
    expect(notify?.type).toBe('notify')
  })

  it('serializeExtensionHostLine 以换行结尾', () => {
    const line = serializeExtensionHostLine({ type: 'req', id: 3, method: 'shutdown' })
    expect(line.endsWith('\n')).toBe(true)
    expect(parseExtensionHostLine(line)?.type).toBe('req')
  })

  it('parseExtensionHostLine 拒绝非法 JSON', () => {
    expect(parseExtensionHostLine('not-json')).toBeNull()
    expect(parseExtensionHostLine('{"type":"bad"}')).toBeNull()
  })
})
