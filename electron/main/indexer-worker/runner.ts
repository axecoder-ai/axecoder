import type { Readable, Writable } from 'node:stream'
import { getCodeGraphPublicStatus, startBackgroundCodeGraphIndex } from '../codegraph/manager'
import { getConfig } from '../config-store'
import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
  type AgentWorkerLine,
  type AgentWorkerResponse,
} from '../agent-worker/protocol'

type Handler = (params: unknown) => Promise<unknown>

const handlers: Record<string, Handler> = {
  ping: async () => ({ pong: true }),

  status: async (params) => {
    const projectRoot = String((params as { projectRoot?: string })?.projectRoot ?? '')
    return getCodeGraphPublicStatus(projectRoot)
  },

  index: async (params) => {
    const root = String((params as { projectRoot?: string })?.projectRoot ?? '').trim()
    if (!root) return { ok: false as const, error: '未打开项目' }
    const cfg = await getConfig()
    if (cfg.agentFeatureCodeGraph === false) {
      return { ok: false as const, error: 'CodeGraph 已在设置中关闭（agentFeatureCodeGraph）' }
    }
    startBackgroundCodeGraphIndex(root)
    return { ok: true as const }
  },
}

const writeLine = (out: Writable, msg: AgentWorkerLine) => {
  out.write(serializeAgentWorkerLine(msg))
}

export const runIndexerWorkerLoop = (stdin: Readable, stdout: Writable): void => {
  process.env.AXECODER_INDEXER_WORKER = '1'

  let buf = ''
  stdin.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    let idx = buf.indexOf('\n')
    while (idx >= 0) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      idx = buf.indexOf('\n')
      void handleLine(line, stdout)
    }
  })
}

const handleLine = async (line: string, stdout: Writable) => {
  const msg = parseAgentWorkerLine(line)
  if (!msg || msg.type !== 'req') return

  const respond = (res: AgentWorkerResponse) => writeLine(stdout, res)
  const handler = handlers[msg.method]
  if (!handler) {
    respond({ type: 'res', id: msg.id, ok: false, error: `Unknown method: ${msg.method}` })
    return
  }

  try {
    const result = await handler(msg.params)
    respond({ type: 'res', id: msg.id, ok: true, result })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    respond({ type: 'res', id: msg.id, ok: false, error })
  }
}
