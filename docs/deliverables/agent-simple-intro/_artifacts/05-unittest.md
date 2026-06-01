# 单元测试执行情况

## 命令

```bash
cd /Users/cuiyunfeng/workspace/AxeCoder && npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/agent-tool-defs.test.ts
```

## 完整输出

```
npm warn Unknown project config "shamefully-hoist". This will stop working in the next major version of npm.

> axecoder@0.1.0 test
> vitest run tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/agent-tool-defs.test.ts


 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts (3 tests) 2ms
 ✓ tests/unittest/UT-agent-glob/agent-tool-defs.test.ts (2 tests) 2ms

 Test Files  2 passed (2)
      Tests  5 passed (5)
   Start at  20:05:00
   Duration  297ms (transform 44ms, setup 0ms, collect 47ms, tests 3ms, environment 0ms, prepare 106ms)
```

## 统计

| 指标 | 值 |
|------|-----|
| 测试文件 | 2 |
| 用例数 | 5 |
| 通过 | 5 |
| 失败 | 0 |
| **全绿** | **是** |
