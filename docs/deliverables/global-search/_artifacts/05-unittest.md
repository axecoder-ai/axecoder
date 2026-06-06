# 单元测试执行情况

## 本功能测试命令

```bash
npm test -- tests/unittest/UT-global-search
```

## 完整输出

```
 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-global-search/quick-open-fuzzy.test.ts (4 tests) 2ms
 ✓ tests/unittest/UT-global-search/search-utils.test.ts (7 tests) 2ms

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

## 统计

| 范围 | 通过 | 失败 |
|------|------|------|
| UT-global-search | 11 | 0 |

## 全量测试（参考）

执行 `npm test` 时另有 1 项与本轮无关的既有失败：

- `tests/unittest/UT-agent-cross-platform-sandbox/sandbox-dispatch.test.ts` — `detectSandboxDenial` seatbelt 分支

**本功能单测：全绿。**
