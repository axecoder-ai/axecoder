import { describe, it, expect, beforeEach } from 'vitest'
import { createAgentStore } from '@/stores/agentStore'

describe('useAgentStore', () => {
  let store: ReturnType<typeof createAgentStore>

  beforeEach(() => {
    store = createAgentStore()
  })

  describe('appendThinking', () => {
    it('should append to currentThinking and create chunk', () => {
      store.appendThinking('Hello ')
      store.appendThinking('world')

      expect(store.currentThinking).toBe('Hello world')
      expect(store.thinkingChunks).toHaveLength(1)
      expect(store.thinkingChunks[0].content).toBe('Hello world')
    })

    it('should clear currentThinking on clearThinking', () => {
      store.appendThinking('test')
      store.setThinkingType('reasoning')
      store.clearThinking()

      expect(store.currentThinking).toBe('')
      expect(store.thinkingType).toBe('')
    })
  })

  describe('setThinkingType', () => {
    it('should store thinking type label', () => {
      store.setThinkingType('tool_call')
      expect(store.thinkingType).toBe('tool_call')
    })
  })

  describe('addThinkingDelta', () => {
    it('should create new chunk when no current chunk', () => {
      store.addThinkingDelta({
        delta: 'First thinking',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })

      expect(store.thinkingChunks).toHaveLength(1)
      expect(store.thinkingChunks[0].content).toBe('First thinking')
      expect(store.thinkingChunks[0].type).toBe('reasoning')
    })

    it('should append to current chunk if type matches', () => {
      const timestamp = Date.now()
      
      store.addThinkingDelta({
        delta: 'First ',
        metadata: { timestamp, type: 'reasoning' }
      })
      
      store.addThinkingDelta({
        delta: 'Second',
        metadata: { timestamp, type: 'reasoning' }
      })

      expect(store.thinkingChunks).toHaveLength(1)
      expect(store.thinkingChunks[0].content).toBe('First Second')
    })

    it('should create new chunk when type changes', () => {
      store.addThinkingDelta({
        delta: 'Reasoning',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })
      
      store.addThinkingDelta({
        delta: 'Tool call',
        metadata: { timestamp: Date.now(), type: 'tool_call' }
      })

      expect(store.thinkingChunks).toHaveLength(2)
      expect(store.thinkingChunks[0].type).toBe('reasoning')
      expect(store.thinkingChunks[1].type).toBe('tool_call')
    })
  })

  describe('addContentDelta', () => {
    it('should append content to stream', () => {
      store.addContentDelta('Hello ')
      store.addContentDelta('World')

      expect(store.contentStream.value).toBe('Hello World')
    })
  })

  describe('toggleChunkCollapse', () => {
    it('should toggle chunk collapsed state', () => {
      store.addThinkingDelta({
        delta: 'Test',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })

      const chunkId = store.thinkingChunks[0].id
      expect(store.thinkingChunks[0].collapsed).toBe(false)
      
      store.toggleChunkCollapse(chunkId)
      expect(store.thinkingChunks[0].collapsed).toBe(true)
      
      store.toggleChunkCollapse(chunkId)
      expect(store.thinkingChunks[0].collapsed).toBe(false)
    })

    it('should do nothing if chunk not found', () => {
      store.addThinkingDelta({
        delta: 'Test',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })

      expect(() => store.toggleChunkCollapse('invalid-id')).not.toThrow()
    })
  })

  describe('expandAll and collapseAll', () => {
    it('should expand all chunks', () => {
      store.addThinkingDelta({
        delta: 'Test 1',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })
      store.addThinkingDelta({
        delta: 'Test 2',
        metadata: { timestamp: Date.now(), type: 'tool_call' }
      })

      store.collapseAll()
      expect(store.thinkingChunks[0].collapsed).toBe(true)
      expect(store.thinkingChunks[1].collapsed).toBe(true)

      store.expandAll()
      expect(store.thinkingChunks[0].collapsed).toBe(false)
      expect(store.thinkingChunks[1].collapsed).toBe(false)
    })
  })

  describe('clearThinking', () => {
    it('should clear all data', () => {
      store.addThinkingDelta({
        delta: 'Test',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })
      store.addContentDelta('Content')

      expect(store.thinkingChunks).toHaveLength(1)
      expect(store.contentStream.value).toBe('Content')

      store.clearThinking()

      expect(store.thinkingChunks).toHaveLength(0)
      expect(store.contentStream.value).toBe('')
      expect(store.currentThinkingChunk.value).toBeNull()
    })
  })

  describe('getters', () => {
    it('should calculate totalTokens', () => {
      store.addThinkingDelta({
        delta: 'Hello world',
        metadata: { timestamp: Date.now(), type: 'reasoning' }
      })

      expect(store.totalTokens.value).toBeGreaterThan(0)
    })

    it('should count tool calls', () => {
      store.addThinkingDelta({
        delta: 'Call 1',
        metadata: { timestamp: Date.now(), type: 'tool_call' }
      })
      store.addThinkingDelta({
        delta: 'Result 1',
        metadata: { timestamp: Date.now(), type: 'tool_result' }
      })
      store.addThinkingDelta({
        delta: 'Call 2',
        metadata: { timestamp: Date.now(), type: 'tool_call' }
      })

      expect(store.toolCallCount.value).toBe(2)
      expect(store.toolResultCount.value).toBe(1)
      expect(store.reasoningCount.value).toBe(0)
    })
  })
})
