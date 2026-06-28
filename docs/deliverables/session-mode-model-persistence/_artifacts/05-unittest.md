# 单元测试执行情况

## 命令

```bash
npm test -- tests/unittest/UT-session-preferences tests/unittest/UT-chat-modes-ui tests/unittest/UT-workshop-agent-link
```

## 输出

```
 ✓ tests/unittest/UT-session-preferences/session-preferences.test.ts (6 tests)
 ✓ tests/unittest/UT-chat-modes-ui/chat-modes-ui.test.ts (11 tests)
 ✓ tests/unittest/UT-workshop-agent-link/workshop-agent-link.test.ts (1 test)

 Test Files  3 passed (3)
      Tests  18 passed (18)
```

## 全量套件

```bash
npm test
```

结果：**758 passed, 4 failed**（失败用例为 `UT-agents-toggle-icon`、`UT-agent/agent-builtin-skills`，与本次改动无关，属仓库既有失败）。

## 结论

- 本功能相关单测：**全绿**
- 全量套件：存在 4 个既有失败项
