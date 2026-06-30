#!/usr/bin/env node
/**
 * ACP stdio 入口：第三方编辑器 spawn 本进程接入 AxeCoder Agent。
 * 用法：axecoder acp  或  axecoder-acp
 */
import { Readable, Writable } from 'node:stream'
import { ndJsonStream } from '@agentclientprotocol/sdk'
import { createAxecoderAcpApp } from './acp/create-acp-app.js'

const run = () => {
  const input = Writable.toWeb(process.stdout) as WritableStream<Uint8Array>
  const output = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>
  const stream = ndJsonStream(input, output)
  const app = createAxecoderAcpApp()
  app.connect(stream)
  process.stderr.write('[axecoder-acp] listening on stdio\n')
}

run()
