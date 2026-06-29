import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'

vi.mock('../../../electron/main/renderer-broadcast', () => ({
  broadcastToRenderers: () => {},
}))
import {
  beginAiMetricsCall,
  endAiMetricsCall,
  getAiMetricsSnapshot,
  markAiMetricsFirstToken,
  resetAiMetricsStore,
  tickAiMetricsStream,
} from '../../../electron/main/ai-metrics-store'

const meta = {
  modelId: 'm1',
  modelName: 'GPT-4o',
  provider: 'openai',
  source: 'chat' as const,
}

describe('ai-metrics-store', () => {
  beforeEach(() => {
    resetAiMetricsStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records TTFT, E2E and per-model summary', () => {
    const id = beginAiMetricsCall(meta)
    vi.advanceTimersByTime(200)
    markAiMetricsFirstToken(id)
    vi.advanceTimersByTime(800)
    endAiMetricsCall(
      id,
      { ok: true, outputChars: 400, inputTokens: 120, outputTokens: 100, tokensEstimated: false },
      meta,
    )

    const snap = getAiMetricsSnapshot()
    expect(snap.realtime.kpis.ttftP95).toBeGreaterThanOrEqual(200)
    expect(snap.cumulative.kpis.e2eP95).toBeGreaterThanOrEqual(1000)
    expect(snap.cumulative.kpis.totalCalls).toBe(1)
    expect(snap.cumulative.kpis.inputTokens).toBe(120)
    expect(snap.cumulative.kpis.outputTokens).toBe(100)
    expect(snap.cumulative.kpis.totalTokens).toBe(220)
    expect(snap.cumulative.models[0]?.modelId).toBe('m1')
    expect(snap.cumulative.models[0]?.provider).toBe('openai')
  })

  it('filters snapshot by modelId', () => {
    const id1 = beginAiMetricsCall(meta)
    endAiMetricsCall(id1, { ok: true, outputChars: 100, inputTokens: 10, outputTokens: 15 }, meta)
    const id2 = beginAiMetricsCall({ ...meta, modelId: 'm2', modelName: 'Claude' })
    endAiMetricsCall(id2, { ok: false, error: 'timeout' }, { ...meta, modelId: 'm2', modelName: 'Claude' })

    const all = getAiMetricsSnapshot()
    expect(all.cumulative.models).toHaveLength(2)

    const m1only = getAiMetricsSnapshot('m1')
    expect(m1only.cumulative.models.every((m) => m.modelId === 'm1')).toBe(true)
    expect(m1only.cumulative.kpis.errorRate).toBe(0)
  })

  it('filters by source and provider', () => {
    const id1 = beginAiMetricsCall(meta)
    endAiMetricsCall(id1, { ok: true, outputChars: 100 }, meta)
    const id2 = beginAiMetricsCall({ ...meta, source: 'agent' })
    endAiMetricsCall(id2, { ok: true, outputChars: 100 }, { ...meta, source: 'agent' })
    const id3 = beginAiMetricsCall({ ...meta, modelId: 'm2', provider: 'anthropic' })
    endAiMetricsCall(id3, { ok: true, outputChars: 100 }, { ...meta, modelId: 'm2', provider: 'anthropic' })

    const agentOnly = getAiMetricsSnapshot({ source: 'agent' })
    expect(agentOnly.cumulative.kpis.totalCalls).toBe(1)

    const openaiOnly = getAiMetricsSnapshot({ provider: 'openai' })
    expect(openaiOnly.cumulative.kpis.totalCalls).toBe(2)
  })

  it('filters cumulative by 1h time range', () => {
    const id1 = beginAiMetricsCall(meta)
    endAiMetricsCall(id1, { ok: true, outputChars: 100 }, meta)

    vi.advanceTimersByTime(2 * 3600_000)

    const id2 = beginAiMetricsCall(meta)
    endAiMetricsCall(id2, { ok: true, outputChars: 100 }, meta)

    const session = getAiMetricsSnapshot({ timeRange: 'session' })
    expect(session.cumulative.kpis.totalCalls).toBe(2)

    const lastHour = getAiMetricsSnapshot({ timeRange: '1h' })
    expect(lastHour.cumulative.kpis.totalCalls).toBe(1)
  })

  it('cumulative QPS excludes idle wall time', () => {
    const id1 = beginAiMetricsCall(meta)
    vi.advanceTimersByTime(1000)
    endAiMetricsCall(id1, { ok: true, outputChars: 400, inputTokens: 50, outputTokens: 50 }, meta)

    vi.advanceTimersByTime(60_000)

    const id2 = beginAiMetricsCall(meta)
    vi.advanceTimersByTime(1000)
    endAiMetricsCall(id2, { ok: true, outputChars: 400, inputTokens: 50, outputTokens: 50 }, meta)

    const snap = getAiMetricsSnapshot()
    expect(snap.cumulative.kpis.totalCalls).toBe(2)
    expect(snap.cumulative.kpis.qps).toBeGreaterThan(0.5)
    expect(snap.cumulative.kpis.qps).toBeLessThan(2)
  })

  it('series always has fixed bucket count for realtime charts', () => {
    const id = beginAiMetricsCall(meta)
    endAiMetricsCall(id, { ok: true, outputChars: 100 }, meta)
    vi.advanceTimersByTime(120_000)

    const snap = getAiMetricsSnapshot()
    expect(snap.series).toHaveLength(24)
    expect(snap.series.filter((p) => p.qps > 0)).toHaveLength(0)
  })

  it('series includes advanced fields and cumulative tokens', () => {
    const id = beginAiMetricsCall(meta)
    vi.advanceTimersByTime(100)
    markAiMetricsFirstToken(id)
    vi.advanceTimersByTime(500)
    endAiMetricsCall(
      id,
      { ok: true, outputChars: 400, inputTokens: 2000, outputTokens: 500, tokensEstimated: false },
      meta,
    )

    const snap = getAiMetricsSnapshot()
    const activePt = snap.series.find((p) => p.inputTokens > 0)
    expect(activePt?.e2eP95).toBeGreaterThan(0)
    expect(activePt?.cumulativeTokens).toBe(2500)
    expect(activePt?.okCount).toBe(1)
    expect(activePt?.failCount).toBe(0)
    expect(snap.sloThresholdMs).toBe(3000)
  })

  it('builds source breakdown and input histogram', () => {
    const id1 = beginAiMetricsCall(meta)
    endAiMetricsCall(id1, { ok: true, outputChars: 100, inputTokens: 500, outputTokens: 100 }, meta)
    const id2 = beginAiMetricsCall({ ...meta, source: 'agent' })
    endAiMetricsCall(
      id2,
      { ok: false, error: 'x', inputTokens: 5000, outputTokens: 0 },
      { ...meta, source: 'agent' },
    )

    const snap = getAiMetricsSnapshot()
    expect(snap.sourceBreakdown.length).toBeGreaterThanOrEqual(2)
    expect(snap.inputTokenHistogram.some((b) => b.count > 0)).toBe(true)
  })

  it('realtime TPS reflects completed calls in the realtime window', () => {
    const id = beginAiMetricsCall(meta)
    vi.advanceTimersByTime(200)
    markAiMetricsFirstToken(id)
    vi.advanceTimersByTime(800)
    endAiMetricsCall(
      id,
      { ok: true, outputChars: 400, inputTokens: 120, outputTokens: 100, tokensEstimated: false },
      meta,
    )

    const snap = getAiMetricsSnapshot()
    expect(snap.concurrent).toBe(0)
    expect(snap.realtime.kpis.tps).toBeGreaterThan(0)
    expect(snap.cumulative.kpis.tps).toBeGreaterThan(0)
  })

  it('live TPS during active streaming', () => {
    const id = beginAiMetricsCall(meta)
    vi.advanceTimersByTime(200)
    markAiMetricsFirstToken(id)
    tickAiMetricsStream(id, 400)
    vi.advanceTimersByTime(800)

    const snap = getAiMetricsSnapshot()
    expect(snap.concurrent).toBe(1)
    expect(snap.realtime.kpis.tps).toBeGreaterThan(0)
  })

  it('live TPS uses rolling 1s window and decays when idle', () => {
    const id = beginAiMetricsCall(meta)
    markAiMetricsFirstToken(id)
    tickAiMetricsStream(id, 400)
    expect(getAiMetricsSnapshot().realtime.kpis.tps).toBe(100)

    vi.advanceTimersByTime(1100)
    const snap = getAiMetricsSnapshot()
    expect(snap.concurrent).toBe(1)
    expect(snap.realtime.kpis.tps).toBe(0)
  })

  it('exposes providers and sources meta lists', () => {
    const id1 = beginAiMetricsCall(meta)
    endAiMetricsCall(id1, { ok: true, outputChars: 100 }, meta)
    const id2 = beginAiMetricsCall({ ...meta, source: 'agent' })
    endAiMetricsCall(id2, { ok: true, outputChars: 100 }, { ...meta, source: 'agent' })

    const snap = getAiMetricsSnapshot()
    expect(snap.providers).toContain('openai')
    expect(snap.sources).toEqual(expect.arrayContaining(['chat', 'agent']))
  })
})
