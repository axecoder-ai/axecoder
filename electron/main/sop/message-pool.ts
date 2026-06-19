import type { SopActionType, SopPipelinePhase, SopPoolMessage } from './sop-types'

let seq = 0

const newId = () => `pool-${Date.now()}-${++seq}`

const POOL_MSG_CHARS = 24_000
const POOL_SUMMARY_CHARS = 96_000

const clipPool = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max)}…[pool truncated]`

/** MetaGPT 式共享消息池：publish + 按 causeBy 订阅 */
export class MessagePool {
  private messages: SopPoolMessage[] = []

  constructor(initial?: SopPoolMessage[]) {
    if (initial?.length) this.messages = [...initial]
  }

  publish(
    msg: Omit<SopPoolMessage, 'id' | 'createdAt'> & Partial<Pick<SopPoolMessage, 'id' | 'createdAt'>>,
  ): SopPoolMessage {
    const full: SopPoolMessage = {
      id: msg.id ?? newId(),
      createdAt: msg.createdAt ?? Date.now(),
      causeBy: msg.causeBy,
      phase: msg.phase,
      speakerUserId: msg.speakerUserId,
      content: clipPool(msg.content, POOL_MSG_CHARS),
      artifactPath: msg.artifactPath,
    }
    this.messages.push(full)
    return full
  }

  /** 订阅：返回 causeBy 命中 watch 列表的消息，按时间升序 */
  subscribe(watch: SopActionType[]): SopPoolMessage[] {
    if (!watch.length) return []
    const set = new Set(watch)
    return this.messages.filter((m) => set.has(m.causeBy)).sort((a, b) => a.createdAt - b.createdAt)
  }

  all(): SopPoolMessage[] {
    return [...this.messages]
  }

  toJSON(): SopPoolMessage[] {
    return this.all()
  }

  summaryForWatch(watch: SopActionType[]): string {
    return this.contextForWatch(watch)
  }

  /** MetaGPT 式上下文：artifact 路径提示 Read，减少截断丢信息 */
  contextForWatch(watch: SopActionType[]): string {
    const text = this.subscribe(watch)
      .map((m) => {
        const pathLine = m.artifactPath ? `artifact: ${m.artifactPath} (use Read for full content)` : ''
        const body = clipPool(m.content, m.artifactPath ? 2_000 : POOL_MSG_CHARS)
        return [pathLine, `[${m.causeBy}] ${body}`].filter(Boolean).join('\n')
      })
      .join('\n\n')
    return clipPool(text, POOL_SUMMARY_CHARS)
  }
}

export const hydrateMessagePool = (stored?: SopPoolMessage[]): MessagePool =>
  new MessagePool(stored)
