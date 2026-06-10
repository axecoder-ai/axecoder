import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  patchMcpOAuthSession,
  hasMcpOAuthTokens,
  clearMcpOAuthSession,
} from '../../../electron/main/mcp-oauth-store'
import { CONTEXT7_PLUGIN_ID } from '../../../electron/main/mcp-plugins-registry'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mcp-oauth-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('mcp-oauth-store', () => {
  it('保存 tokens 后 hasMcpOAuthTokens 为 true', async () => {
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'abc', token_type: 'Bearer' },
    })
    expect(await hasMcpOAuthTokens(CONTEXT7_PLUGIN_ID)).toBe(true)
  })

  it('clear 后无 tokens', async () => {
    await patchMcpOAuthSession(CONTEXT7_PLUGIN_ID, {
      tokens: { access_token: 'abc', token_type: 'Bearer' },
    })
    await clearMcpOAuthSession(CONTEXT7_PLUGIN_ID)
    expect(await hasMcpOAuthTokens(CONTEXT7_PLUGIN_ID)).toBe(false)
  })
})
