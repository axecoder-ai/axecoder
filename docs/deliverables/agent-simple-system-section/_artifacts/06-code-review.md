# 代码审查

## 功能

- [x] `getSimpleSystemSection` 与 §4 六条一致（Markdown、permission 拒绝、system-reminder、prompt injection、Hooks、上下文压缩）
- [x] `buildAgentSystemPrompt` 顺序符合 §15（intro → system → doing tasks）
- [x] re-export 与 `agent-loop` 兼容

## 质量

- [x] 单测覆盖 §4 关键句与段落索引顺序
- [x] 无用户输入拼进静态文案

## 安全

- [x] 静态常量，无注入面
- [x] prompt injection 指引要求模型向用户告警

## 结论

**通过** — 无阻塞项。

## 非阻塞待办

- 后续可对齐 §5 `getSimpleDoingTasksSection` 等段落
- 产品侧 Hooks / 工具审批与文案一致性可单独迭代
