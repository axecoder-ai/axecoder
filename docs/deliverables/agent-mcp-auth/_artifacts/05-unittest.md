# 单元测试 — agent-mcp-auth

## 本功能单测

```bash
npm test -- tests/unittest/UT-agent-mcp-auth/agent-mcp-auth.test.ts
```

**结果：6/6 通过（全绿）**

完整输出见 `05-unittest-raw.txt`。

## 全量单测

```bash
npm test
```

**结果：587/588 通过**

| 状态 | 用例 |
|------|------|
| 失败（既有，与本次无关） | `UT-agent-os-sandbox/bash-integration.test.ts` — execpolicy deny 期望 immediate 实际 bash_pending |

本次改动相关测试文件均通过。
