import type { Writable } from 'node:stream'
import {
  answerAgentQuestions,
  buildAgentPlan,
  confirmAgentAllWrites,
  confirmAgentBash,
  confirmAgentSmartApproval,
  confirmAgentWrite,
  dismissAgentPlan,
  rejectAgentAllWrites,
  rejectAgentBash,
  rejectAgentSmartApproval,
  rejectAgentWrite,
  rewindAgentCheckpoint,
  runUserShellCommand,
  startAgentTurn,
  stopAgentTurn,
} from '../agent/agent-loop'
import { getSession, listAgentSessions } from '../agent/agent-session-store'
import { listAgentCheckpoints, restoreCheckpointFilesOnly } from '../agent/agent-checkpoint'
import { listBackgroundRuns, resolveBackgroundTasks } from '../agent/agent-subagent-tasks'
import { setAgentWorkerHostRequest } from '../agent/main-process-delegate'
import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
  type AgentWorkerHostResponse,
  type AgentWorkerLine,
  type AgentWorkerResponse,
} from './protocol'

type Handler = (params: unknown) => Promise<unknown>

const handlers: Record<string, Handler> = {
  ping: async () => ({ pong: true }),

  send: async (params) => {
    const p = params as {
      projectRoot: string
      modelId: string
      messages: Parameters<typeof startAgentTurn>[2]
      chatMode?: string
      assigneeUserId?: string
      roleWorkflowInvoke?: boolean
      reasoningEffort?: string
      clientChatId?: string
    }
    return startAgentTurn(
      p.projectRoot,
      p.modelId,
      p.messages,
      p.chatMode,
      p.assigneeUserId,
      p.roleWorkflowInvoke === true,
      p.reasoningEffort,
      p.clientChatId,
    )
  },

  stop: async (params) => stopAgentTurn((params as { sessionId: string }).sessionId),

  confirmWrite: async (params) => {
    const p = params as { sessionId: string; pendingId: string }
    return confirmAgentWrite(p.sessionId, p.pendingId)
  },

  confirmAllWrites: async (params) =>
    confirmAgentAllWrites((params as { sessionId: string }).sessionId),

  rejectWrite: async (params) => {
    const p = params as { sessionId: string; pendingId: string; reason?: string }
    return rejectAgentWrite(p.sessionId, p.pendingId, p.reason)
  },

  rejectAllWrites: async (params) => {
    const p = params as { sessionId: string; reason?: string }
    return rejectAgentAllWrites(p.sessionId, p.reason)
  },

  confirmBash: async (params) => {
    const p = params as { sessionId: string; pendingId: string }
    return confirmAgentBash(p.sessionId, p.pendingId)
  },

  rejectBash: async (params) => {
    const p = params as { sessionId: string; pendingId: string; reason?: string }
    return rejectAgentBash(p.sessionId, p.pendingId, p.reason)
  },

  confirmSmartApproval: async (params) => {
    const p = params as { sessionId: string; pendingId: string }
    return confirmAgentSmartApproval(p.sessionId, p.pendingId)
  },

  rejectSmartApproval: async (params) => {
    const p = params as { sessionId: string; pendingId: string; reason?: string }
    return rejectAgentSmartApproval(p.sessionId, p.pendingId, p.reason)
  },

  answerQuestions: async (params) => {
    const p = params as {
      sessionId: string
      pendingId: string
      answers: Record<string, string | string[]>
    }
    return answerAgentQuestions(p.sessionId, p.pendingId, p.answers)
  },

  buildPlan: async (params) => {
    const p = params as { sessionId: string; pendingId: string }
    return buildAgentPlan(p.sessionId, p.pendingId)
  },

  dismissPlan: async (params) => {
    const p = params as { sessionId: string; pendingId: string }
    return dismissAgentPlan(p.sessionId, p.pendingId)
  },

  rewind: async (params) => {
    const p = params as { sessionId: string; checkpointId?: string }
    const session = getSession(p.sessionId)
    if (!session) return { ok: false as const, error: 'Session not found' }
    return rewindAgentCheckpoint(p.sessionId, session, p.checkpointId)
  },

  listSessions: async () => ({ ok: true as const, sessions: listAgentSessions() }),

  listCheckpoints: async (params) => {
    const sessionId = (params as { sessionId: string }).sessionId
    return { ok: true as const, checkpoints: listAgentCheckpoints(sessionId) }
  },

  restoreCheckpointFiles: async (params) => {
    const p = params as { sessionId: string; projectRoot: string; checkpointId?: string }
    return restoreCheckpointFilesOnly(p.sessionId, p.projectRoot, p.checkpointId)
  },

  revertFilePatch: async (params) => {
    const p = params as { projectRoot: string; filePath: string; patchText: string }
    const { revertFileWithPatch } = await import('../agent/agent-revert')
    return revertFileWithPatch(p.projectRoot, p.filePath, p.patchText)
  },

  listBackgroundTasks: async (params) => {
    const sessionId = (params as { sessionId?: string }).sessionId
    return {
      ok: true as const,
      tasks: listBackgroundRuns(sessionId).map((t) => ({
        id: t.id,
        description: t.description,
        status: t.status,
        startedAt: t.startedAt,
      })),
    }
  },

  resolveBackgroundTasks: async (params) => {
    const p = params as { projectRoot: string; taskIds: string[] }
    const tasks = await resolveBackgroundTasks(p.projectRoot, p.taskIds ?? [])
    return { ok: true as const, tasks }
  },

  runUserShell: async (params) => {
    const p = params as { projectRoot: string; command: string }
    return runUserShellCommand(p.projectRoot, p.command)
  },
}

const writeLine = (out: Writable, msg: AgentWorkerLine) => {
  out.write(serializeAgentWorkerLine(msg))
}

let hostReqId = 1
const pendingHost = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>()

export const runAgentWorkerLoop = (
  stdin: NodeJS.ReadableStream,
  stdout: Writable,
): void => {
  process.env.AXECODER_AGENT_WORKER = '1'

  setAgentWorkerHostRequest(async (method, params) => {
    const id = hostReqId++
    return new Promise<unknown>((resolve, reject) => {
      pendingHost.set(id, { resolve, reject })
      writeLine(stdout, { type: 'host', id, method, params })
    })
  })

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
    if (msg.ok) p.resolve(msg.result)
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
