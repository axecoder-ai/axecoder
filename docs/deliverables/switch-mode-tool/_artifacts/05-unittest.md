# SwitchMode 工具 — 单元测试

## 命令

```bash
npm test -- tests/unittest/UT-switch-mode-tool tests/unittest/UT-agent-tool-level-prompts tests/unittest/UT-agent-tool-layer-parity tests/unittest/UT-chat-mode-workshop
```

## 结果

- **23 passed / 23**（本轮范围全绿）
- 全量套件：579/581（1 个既有 bash-integration 失败，非本轮引入）

## 覆盖场景

- resolveSwitchModeTarget（plan 别名、非法 target）
- applySwitchModeToSession（agent/plan/planning-only）
- executeExtendedAgentTool SwitchMode 成功与失败
- EnterPlanMode 回归仍通过

完整输出见 `05-unittest-raw.txt`
