# 单元测试 — settings-rules-tab

## 命令

```bash
npm test -- tests/unittest/UT-settings-rules tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts
```

## 结果

- **Test Files:** 3 passed
- **Tests:** 34 passed, 0 failed
- **状态：** 全绿

## 覆盖

- `rules-parse`：frontmatter 解析、序列化、标题
- `rules-store`：用户 CRUD、项目 `.cursor/rules` 落盘、alwaysApply 注入过滤
- `agent-system-prompt`：既有用例仍通过（含 rules 加载容错）
