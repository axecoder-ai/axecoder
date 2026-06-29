import * as vscode from 'vscode'
import path from 'node:path'
import { contentsForReviewDiff } from '@axecoder/core/frontend/utils/patch-stats'

export const openReviewDiff = async (
  filePath: string,
  patchText: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  let modified = ''
  try {
    modified = Buffer.from(
      await vscode.workspace.fs.readFile(vscode.Uri.file(filePath)),
    ).toString('utf8')
  } catch {
    modified = ''
  }
  const { original, modified: next } = contentsForReviewDiff(patchText, modified)
  const left = await vscode.workspace.openTextDocument({ content: original, language: 'plaintext' })
  const right = await vscode.workspace.openTextDocument({ content: next, language: 'plaintext' })
  const title = `${path.basename(filePath)} (Review)`
  await vscode.commands.executeCommand('vscode.diff', left.uri, right.uri, title, {
    preview: false,
  })
  return { ok: true as const }
}

export const openFileAtPath = async (
  filePath: string,
  patchText?: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (patchText?.trim()) return openReviewDiff(filePath, patchText)
  const uri = vscode.Uri.file(filePath)
  const doc = await vscode.workspace.openTextDocument(uri)
  await vscode.window.showTextDocument(doc, { preview: false })
  return { ok: true as const }
}
