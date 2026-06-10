# 单元测试执行情况

## 命令

```bash
npm test -- tests/unittest/UT-read-lints-tool/read-lints-tool.test.ts
npm test
```

## 本轮范围结果

**7/7 全绿**

```
 ✓ tests/unittest/UT-read-lints-tool/read-lints-tool.test.ts (7 tests) 6ms
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

## 全量结果

**603/604**（1 个既有失败，与本轮无关）

失败项：`UT-agent-os-sandbox/bash-integration.test.ts` — execpolicy deny 期望 immediate 实为 bash_pending（既有问题，switch-mode 交付时亦存在）。

## 结论

本轮 ReadLints 单测 **全绿**。
