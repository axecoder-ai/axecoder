# 单元测试执行情况

## 命令

```bash
npm test -- tests/unittest/UT-thinking-output
```

## 完整输出

```
 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-thinking-output/thinking-detector-backend.test.ts (7 tests)
 ✓ tests/unittest/UT-thinking-output/token-estimator.test.ts (6 tests)
 ✓ tests/unittest/UT-thinking-output/thinking-parser.test.ts (14 tests)
 ✓ tests/unittest/UT-thinking-output/agentStore.test.ts (13 tests)

 Test Files  4 passed (4)
      Tests  40 passed (40)
```

## 统计

| 指标 | 值 |
|------|-----|
| 测试文件 | 4 |
| 用例总数 | 40 |
| 通过 | 40 |
| 失败 | 0 |
| **是否全绿** | **是** |

## 全量测试备注

`npm test` 全仓库 492 用例中 1 失败（`bash-integration.test.ts`，与本次变更无关）。
