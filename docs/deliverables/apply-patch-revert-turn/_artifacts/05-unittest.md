# 单元测试执行记录

## 命令

```bash
npm test -- tests/unittest/UT-apply-patch-revert-turn/apply-patch-revert.test.ts
```

## 完整输出

```
> axecoder@0.9.8 test
> vitest run tests/unittest/UT-apply-patch-revert-turn/apply-patch-revert.test.ts

 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-apply-patch-revert-turn/apply-patch-revert.test.ts (5 tests) 530ms
   ✓ executeAgentTool ApplyPatch > 空 patch 立即失败  521ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## 统计

| 指标 | 值 |
|------|-----|
| 测试文件 | 1 |
| 用例数 | 5 |
| 通过 | 5 |
| 失败 | 0 |
| **是否全绿** | **是** |

## 附加回归

```bash
npm test -- tests/unittest/UT-agent-glob/agent-tool-defs.test.ts tests/unittest/UT-agent-edit/tool-executor.test.ts
```

3 passed, 0 failed.
