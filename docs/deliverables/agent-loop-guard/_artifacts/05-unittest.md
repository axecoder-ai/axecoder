# 单元测试 — Agent Loop Guard

## 命令

```bash
cd /Users/cuiyunfeng/workspace/AxeCoder && npm test
```

## 结果摘要

- **Test Files:** 106 passed | 1 failed (107)
- **Tests:** 512 passed | 1 failed (513)
- **本功能单测:** `UT-agent-loop-guard` 5/5 通过

## 失败项（非本次引入）

- `UT-agent-os-sandbox/bash-integration.test.ts` — execpolicy deny 期望 `immediate` 实际 `bash_pending`（动态 mock 问题，改动前即存在）

## 本功能专项

```bash
npx vitest run tests/unittest/UT-agent-loop-guard
```

5 tests passed.
