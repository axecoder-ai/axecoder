import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import MarkdownIt from 'markdown-it'
// @ts-expect-error html-to-docx 无官方类型
import HTMLtoDOCX from 'html-to-docx'

const md = new MarkdownIt()

const EXPORT_BODY_STYLE = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.65;
  color: #111;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 32px;
}
h1, h2, h3, h4, h5, h6 { margin-top: 1.2em; margin-bottom: 0.5em; }
pre { background: #f5f5f5; padding: 12px; overflow-x: auto; border-radius: 4px; }
code { font-family: Menlo, Consolas, monospace; font-size: 0.9em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ccc; padding: 6px 10px; }
blockquote { border-left: 4px solid #ddd; margin: 0.8em 0; padding-left: 1em; color: #444; }
img { max-width: 100%; }
`

let pdfWin: BrowserWindow | null = null

export const registerMarkdownExportIpc = (getMainWindow: () => BrowserWindow | null) => {
  ipcMain.handle('fs:exportMarkdownPdf', async (_, filePath: string) => {
    const markdown = await fs.readFile(filePath, 'utf-8')
    const base = path.basename(filePath, path.extname(filePath))
    const dir = path.dirname(filePath)
    const bodyHtml = md.render(markdown)
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${base}</title>
  <style>${EXPORT_BODY_STYLE}</style>
</head>
<body>${bodyHtml}</body>
</html>`

    const parent = getMainWindow()
    const save = await dialog.showSaveDialog(parent ?? undefined, {
      title: '导出 PDF',
      defaultPath: path.join(dir, `${base}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (save.canceled || !save.filePath) return { cancelled: true as const }

    const tmpHtml = path.join(os.tmpdir(), `axecoder-export-${Date.now()}.html`)
    await fs.writeFile(tmpHtml, fullHtml, 'utf-8')

    if (!pdfWin || pdfWin.isDestroyed()) {
      pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    }
    await pdfWin.loadFile(tmpHtml)
    await new Promise<void>((resolve) => {
      pdfWin!.webContents.once('did-finish-load', () => resolve())
    })
    const pdfData = await pdfWin.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'default' },
    })
    await fs.writeFile(save.filePath, pdfData)
    await fs.unlink(tmpHtml).catch(() => {})

    return { ok: true as const, path: save.filePath }
  })

  ipcMain.handle('fs:exportMarkdownDocx', async (_, filePath: string) => {
    const markdown = await fs.readFile(filePath, 'utf-8')
    const base = path.basename(filePath, path.extname(filePath))
    const dir = path.dirname(filePath)
    const bodyHtml = md.render(markdown)
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>${base}</title></head>
<body style="font-family: PingFang SC, Microsoft YaHei, sans-serif;">${bodyHtml}</body>
</html>`

    const parent = getMainWindow()
    const save = await dialog.showSaveDialog(parent ?? undefined, {
      title: '导出 DOCX',
      defaultPath: path.join(dir, `${base}.docx`),
      filters: [{ name: 'Word', extensions: ['docx'] }],
    })
    if (save.canceled || !save.filePath) return { cancelled: true as const }

    const docxBuf = await HTMLtoDOCX(fullHtml, null, {
      title: base,
      creator: 'AxeCoder',
      font: 'PingFang SC',
      lang: 'zh-CN',
    })
    await fs.writeFile(save.filePath, docxBuf)

    return { ok: true as const, path: save.filePath }
  })
}
