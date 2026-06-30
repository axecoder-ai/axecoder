import { describe, expect, it } from 'vitest'
import { client as createClient, methods } from '@agentclientprotocol/sdk'
import { createAxecoderAcpApp } from '../../../electron/main/acp/create-acp-app'
import { resetAcpSessionsForTests } from '../../../electron/main/acp/acp-session-store'

describe('createAxecoderAcpApp', () => {
  it('initialize and session/new work in-process', async () => {
    resetAcpSessionsForTests()
    const agentApp = createAxecoderAcpApp()
    const clientApp = createClient({ name: 'test-client', version: '1.0.0' })
      .onRequest(methods.client.session.requestPermission, async () => ({
        outcome: { outcome: 'selected', optionId: 'allow_once' },
      }))
      .onNotification(methods.client.session.update, async () => {})

    await clientApp.connectWith(agentApp, async (ctx) => {
      const init = await ctx.request(methods.agent.initialize, {
        protocolVersion: 1,
        clientCapabilities: {},
      })
      expect(init.agentInfo?.name).toBe('AxeCoder')

      const session = await ctx.request(methods.agent.session.new, {
        cwd: process.cwd(),
        mcpServers: [],
      })
      expect(session.sessionId).toBeTruthy()
    })
  })
})
