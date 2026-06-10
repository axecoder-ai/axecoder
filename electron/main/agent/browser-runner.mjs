import { createInterface } from 'node:readline'
import { chromium } from 'playwright'

let browser = null
let page = null
const rl = createInterface({ input: process.stdin, terminal: false })

const reply = (msg) => {
  process.stdout.write(`${JSON.stringify(msg)}\n`)
}

const ensurePage = async () => {
  if (!browser) {
    browser = await chromium.launch({ headless: true })
  }
  if (!page) {
    page = await browser.newPage()
  }
  return page
}

rl.on('line', async (line) => {
  let req
  try {
    req = JSON.parse(line)
  } catch {
    reply({ id: null, ok: false, error: 'invalid json' })
    return
  }
  const id = req.id
  try {
    if (req.action === 'shutdown') {
      if (browser) await browser.close()
      browser = null
      page = null
      reply({ id, ok: true, text: 'shutdown' })
      process.exit(0)
      return
    }
    const p = await ensurePage()
    if (req.action === 'navigate') {
      const url = String(req.url ?? '').trim()
      if (!/^https?:\/\//i.test(url)) {
        reply({ id, ok: false, error: 'url must start with http:// or https://' })
        return
      }
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      reply({ id, ok: true, text: `Navigated to ${url}` })
      return
    }
    if (req.action === 'snapshot') {
      const text = await p.evaluate(() => document.body?.innerText ?? '')
      reply({ id, ok: true, text: text.slice(0, 200_000) })
      return
    }
    if (req.action === 'click') {
      const sel = String(req.selector ?? '').trim()
      if (!sel) {
        reply({ id, ok: false, error: 'selector is required for click' })
        return
      }
      await p.click(sel, { timeout: 15_000 })
      reply({ id, ok: true, text: `Clicked ${sel}` })
      return
    }
    if (req.action === 'type') {
      const sel = String(req.selector ?? '').trim()
      const text = String(req.text ?? '')
      if (!sel) {
        reply({ id, ok: false, error: 'selector is required for type' })
        return
      }
      await p.fill(sel, text, { timeout: 15_000 })
      reply({ id, ok: true, text: `Typed into ${sel}` })
      return
    }
    if (req.action === 'screenshot') {
      const buf = await p.screenshot({ type: 'png', fullPage: false })
      reply({ id, ok: true, text: buf.toString('base64') })
      return
    }
    reply({ id, ok: false, error: `unknown action: ${req.action}` })
  } catch (e) {
    reply({ id, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
})

process.stdin.on('close', async () => {
  if (browser) await browser.close()
  process.exit(0)
})
