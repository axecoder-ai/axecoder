# 单元测试执行情况 — codex-provider

## 命令

```bash
npm test -- tests/unittest/UT-codex-provider
```

## 结果摘要

| 项 | 值 |
|----|-----|
| 测试文件 | 4 passed |
| 用例 | **11 passed** |
| 失败 | 0 |
| 结论 | **本特性单测全绿** |

## 用例列表

- `models-types-codex.test.ts` — defaultBaseUrl / requiresKey / sse
- `responses-messages.test.ts` — wire + parse
- `responses-sse.test.ts` — stream merge
- `codex-provider.test.ts` — URL + chatCodex + chatCodexWithTools

## 全量 `npm test` 说明

全仓库运行存在 **4 个既有失败**（`UT-models-settings/ai-providers.test.ts` 等，`BrowserWindow.getAllWindows` 未 mock），与本次 codex 改动无关；**未在本轮扩大修复范围**。

## 完整输出

见同目录 `05-unittest-raw.txt`。
