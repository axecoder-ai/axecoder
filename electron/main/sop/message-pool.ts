import type { SopActionType, SopPipelinePhase, SopPoolMessage } from './sop-types'

let seq = 0

const newId = () => `pool-${Date.now()}-${++seq}`

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
      content: msg.content,
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
    return this.subscribe(watch)
      .map((m) => `[${m.causeBy}] ${m.content}`)
      .join('\n\n')
  }
}

export const hydrateMessagePool = (stored?: SopPoolMessage[]): MessagePool =>
  new MessagePool(stored)
