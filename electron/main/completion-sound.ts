import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureAxecoderDir, axecoderPath } from './axecoder-dir'

const SOUND_BASENAME = 'agent-completion-sound'

const mimeForExt = (ext: string): string => {
  const e = ext.toLowerCase()
  if (e === '.mp3') return 'audio/mpeg'
  if (e === '.wav') return 'audio/wav'
  if (e === '.ogg') return 'audio/ogg'
  if (e === '.m4a') return 'audio/mp4'
  if (e === '.aac') return 'audio/aac'
  if (e === '.webm') return 'audio/webm'
  return 'audio/mpeg'
}

/** 将用户选择的音频复制到 ~/.axecoder，返回相对文件名（写入 config） */
export const copyCompletionSoundFrom = async (srcPath: string): Promise<string> => {
  await ensureAxecoderDir()
  const ext = path.extname(srcPath) || '.mp3'
  const name = `${SOUND_BASENAME}${ext}`
  const dest = axecoderPath(name)
  await fs.copyFile(srcPath, dest)
  return name
}

export const completionSoundAbsPath = (relName: string) => axecoderPath(relName)

export const getCompletionSoundDataUrl = async (relName: string): Promise<string | null> => {
  if (!relName.trim()) return null
  const abs = completionSoundAbsPath(relName)
  try {
    const buf = await fs.readFile(abs)
    const mime = mimeForExt(path.extname(abs))
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
