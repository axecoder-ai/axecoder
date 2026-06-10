# 单元测试执行情况

## 命令

```bash
npm test
```

## 结果摘要

| 指标 | 值 |
|------|-----|
| 测试文件 | 127 |
| 用例总数 | 597 |
| 通过 | 596 |
| 失败 | 1 |
| 本轮新增 UT | `tests/unittest/UT-web-search-webrun/web-search-webrun.test.ts`（9/9 通过） |

## 失败项（非本轮引入）

- `UT-agent-os-sandbox/bash-integration.test.ts` — execpolicy deny 期望 `immediate` 实际 `bash_pending`（模块 mock 时序问题，与 WebSearch/WebRun 无关）

## 本轮专项

```bash
npm test -- tests/unittest/UT-web-search-webrun/web-search-webrun.test.ts
# 9 passed
```

## 完整输出

见同目录 `05-unittest-raw.txt`。
