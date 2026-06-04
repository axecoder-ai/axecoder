import { spawn } from 'node:child_process'
import { rgPath } from '@vscode/ripgrep'
import { isUnderHiddenPathSegment } from '../../src/utils/hidden-path'
import { isPathInsideRoot } from './fs-utils'

/** 按 glob 列出Project内文件路径（绝对路径） */
export const runRipgrepFiles = (rootPath: string, globPattern: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const files: string[] = []
    const args = [
      '--files',
      '--glob',
      '!node_modules/**',
      '--glob',
      '!.git/**',
      '--glob',
      '!dist/**',
      '--glob',
      '!dist-electron/**',
      '--glob',
      '!.axecoder/sessions/**',
      '--glob',
      '!**/.*/**',
      '--glob',
      globPattern,
      rootPath,
    ]
    const proc = spawn(rgPath, args, { cwd: rootPath })
    let buf = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !isPathInsideRoot(rootPath, trimmed)) continue
        const rel = trimmed.startsWith(rootPath)
          ? trimmed.slice(rootPath.length).replace(/^[/\\]+/, '')
          : trimmed
        if (isUnderHiddenPathSegment(rel)) continue
        files.push(trimmed)
      }
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (buf.trim()) {
        const trimmed = buf.trim()
        if (isPathInsideRoot(rootPath, trimmed)) {
          const rel = trimmed.startsWith(rootPath)
            ? trimmed.slice(rootPath.length).replace(/^[/\\]+/, '')
            : trimmed
          if (!isUnderHiddenPathSegment(rel)) files.push(trimmed)
        }
      }
      if (code === 0 || code === 1) resolve(files)
      else reject(new Error(`Glob expansion failed (code ${code})`))
    })
  })
}
