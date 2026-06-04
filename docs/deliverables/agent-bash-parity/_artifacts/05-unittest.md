# 单元测试 — agent-bash-parity

## 命令

```bash
cd /Users/cuiyunfeng/workspace/AxeCoder && npx vitest run \
  tests/unittest/UT-agent-bash-parity \
  tests/unittest/UT-agent-bash \
  tests/unittest/UT-agent-tool-level-prompts \
  tests/unittest/UT-agent-tool-layer-parity \
  tests/unittest/UT-agent-edit/tool-executor.test.ts
```

## 完整输出

```
 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-agent-tool-layer-parity/agent-tool-layer-parity.test.ts (6 tests) 14ms
 ✓ tests/unittest/UT-agent-tool-level-prompts/agent-tool-level-prompts.test.ts (9 tests) 3ms
 ✓ tests/unittest/UT-agent-edit/tool-executor.test.ts (1 test) 2ms
 ✓ tests/unittest/UT-agent-bash/agent-bash.test.ts (4 tests) 49ms
 ✓ tests/unittest/UT-agent-bash-parity/agent-bash-parity.test.ts (7 tests) 93ms

 Test Files  5 passed (5)
      Tests  27 passed (27)
```

## 统计

| 指标 | 值 |
|------|-----|
| 本需求相关用例 | 27 |
| 通过 | 27 |
| 失败 | 0 |
| **本范围是否全绿** | **是** |

## 全量 `npm test` 说明

全仓 `npm test` 当前有 **13** 个与本次改动无关的历史失败（i18n、workshop 等）。本轮以 Bash 相关子集为准验收。
