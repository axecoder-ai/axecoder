# 单元测试

## 命令

```bash
npx vitest run tests/unittest/UT-chat-session-runs tests/unittest/UT-chat-session-run-state
```

## 结果

- **Test Files:** 2 passed (2)
- **Tests:** 6 passed (6)
- **是否全绿:** 是

## 覆盖要点

- `resolveProgressChatId`：clientChatId 优先、agentToChat 回退、未映射返回 undefined
- `deriveTabDotStatus`：running / pending / completed-unread 优先级

完整终端输出见 `05-unittest-raw.txt`。
