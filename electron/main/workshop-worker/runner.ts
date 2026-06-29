import type { Readable, Writable } from 'node:stream'
import {
  runWorkshopSend,
  workshopDeleteSession,
  workshopGetSession,
  workshopListSessions,
  workshopSaveSession,
  workshopStop,
} from '../workshop/workshop-send'
import type { WorkshopSession } from '../workshop/workshop-types'
import type { ChatImageRef } from '../chat-attachments'
import { setAgentWorkerHostRequest } from '../agent/main-process-delegate'
import { setWorkshopWorkerHostRequest } from './main-process-delegate'
import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
  type AgentWorkerLine,
  type AgentWorkerResponse,
} from '../agent-worker/protocol'

type Handler = (params: unknown) => Promise<unknown>

const handlers: Record<string, Handler> = {
  ping: async () => ({ pong: true }),

  getSessions: async (params) =>
    workshopListSessions(String((params as { projectRoot?: string })?.projectRoot ?? '')),

  getSession: async (params) => {
    const p = params as { projectRoot: string; workshopId: string }
    return workshopGetSession(p.projectRoot, p.workshopId)
  },

  saveSession: async (params) => {
    const p = params as { projectRoot: string; session: WorkshopSession }
    return workshopSaveSession(p.projectRoot, p.session)
  },

  deleteSession: async (params) => {
    const p = params as { projectRoot: string; workshopId: string }
    return workshopDeleteSession(p.projectRoot, p.workshopId)
  },

  stop: async (params) => workshopStop(String((params as { workshopId?: string })?.workshopId ?? '')),

  sendMessage: async (params) => {
    const p = params as {
      projectRoot: string
      workshopId: string
      text: string
      modelId: string
      useScripted?: boolean
      displayText?: string
      imageRefs?: ChatImageRef[]
      preferredAssigneeUserId?: string
      orchestrationChatMode?: string
    }
    return runWorkshopSend(
      p.projectRoot,
      p.workshopId,
      p.text,
      p.modelId,
      p.useScripted,
      p.displayText,
      p.imageRefs,
      p.preferredAssigneeUserId,
      p.orchestrationChatMode,
    )
  },
}

const writeLine = (out: Writable, msg: AgentWorkerLine) => {
  out.write(serializeAgentWorkerLine(msg))
}

let hostReqId = 1
const pendingHost = new Map<number, { resolve: () => void; reject: (e: Error) => void }>()

const bindHostRequest = (stdout: Writable) => {
  const requestHost = async (method: string, hostParams: unknown) => {
    const id = hostReqId++
    await new Promise<void>((resolve, reject) => {
      pendingHost.set(id, { resolve, reject })
      writeLine(stdout, { type: 'host', id, method, params: hostParams })
    })
  }
  setWorkshopWorkerHostRequest(requestHost)
  setAgentWorkerHostRequest(requestHost)
}

export const runWorkshopWorkerLoop = (stdin: Readable, stdout: Writable): void => {
  process.env.AXECODER_WORKSHOP_WORKER = '1'
  bindHostRequest(stdout)

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
  if (!msg) return

  if (msg.type === 'hostRes') {
    const p = pendingHost.get(msg.id)
    if (!p) return
    pendingHost.delete(msg.id)
    if (msg.ok) p.resolve()
    else p.reject(new Error(msg.error ?? 'host request failed'))
    return
  }

  if (msg.type !== 'req') return

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
