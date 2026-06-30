# 单元测试 — mcp-json-oauth-builtin

## 命令

```bash
npm test -- tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts tests/unittest/UT-mcp-plugins/agent-mcp-plugins-merge.test.ts tests/unittest/UT-agent-mcp-auth/agent-mcp-auth.test.ts
```

## 完整输出

```
 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-agent-mcp-auth/agent-mcp-auth.test.ts (6 tests) 11ms
 ✓ tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts (6 tests) 11ms
 ✓ tests/unittest/UT-mcp-plugins/agent-mcp-plugins-merge.test.ts (7 tests) 15ms

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

## 统计

- **本功能相关：** 19/19 通过（全绿）
- **全量：** 833/834 通过；1 个既有无关失败（`UT-agent-tool-level-prompts` RevertTurn description 长度）

## 结论

本功能单测全绿。
