import fs from 'node:fs/promises'
import path from 'node:path'
import type { AgentLoopMessage } from './agent-types'

export type StoredSubagentRecord = {
  agentId: string
  sessionId: string
  subagentType: string
  messages: AgentLoopMessage[]
  updatedAt: number
}

let agentSeq = 0

export const createSubagentAgentId = () => `subagent-${Date.now()}-${agentSeq++}`

const subagentDir = (projectRoot: string, sessionId: string) =>
  path.join(projectRoot, '.axecoder', 'subagents', sessionId)

const recordPath = (projectRoot: string, sessionId: string, agentId: string) =>
  path.join(subagentDir(projectRoot, sessionId), `${agentId}.json`)

export const saveSubagentRecord = async (
  projectRoot: string,
  record: StoredSubagentRecord,
): Promise<void> => {
  const dir = subagentDir(projectRoot, record.sessionId)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(
    recordPath(projectRoot, record.sessionId, record.agentId),
    JSON.stringify(record, null, 2),
    'utf8',
  )
}

export const loadSubagentRecord = async (
  projectRoot: string,
  sessionId: string,
  agentId: string,
): Promise<StoredSubagentRecord | null> => {
  try {
    const raw = await fs.readFile(recordPath(projectRoot, sessionId, agentId), 'utf8')
    const parsed = JSON.parse(raw) as StoredSubagentRecord
    if (!parsed?.agentId || !Array.isArray(parsed.messages)) return null
    return parsed
  } catch {
    return null
  }
}
