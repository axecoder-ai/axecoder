import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureAxecoderDir, axecoderPath } from '../axecoder-dir'

const scratchRoot = () => axecoderPath('scratchpad')

export const ensureScratchpadDir = async (sessionId: string) => {
  await ensureAxecoderDir()
  const dir = path.join(scratchRoot(), sessionId.replace(/[^a-zA-Z0-9_-]/g, '_'))
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export const getScratchpadPath = (sessionId: string, relativeFile: string) =>
  path.join(scratchRoot(), sessionId.replace(/[^a-zA-Z0-9_-]/g, '_'), relativeFile)

export const writeScratchpadNote = async (sessionId: string, name: string, content: string) => {
  const dir = await ensureScratchpadDir(sessionId)
  const file = path.join(dir, name)
  await fs.writeFile(file, content, 'utf-8')
  return file
}
