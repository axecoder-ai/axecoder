import { describe, expect, it } from 'vitest'
import { pickOAuthCallbackPort } from '../../../electron/main/mcp-oauth-callback'

describe('mcp-oauth-callback', () => {
  it('pickOAuthCallbackPort 返回可用端口', async () => {
    const port = await pickOAuthCallbackPort()
    expect(port).toBeGreaterThan(0)
    expect(port).toBeLessThan(65536)
  })
})
