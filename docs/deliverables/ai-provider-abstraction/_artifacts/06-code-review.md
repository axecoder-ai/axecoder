# 代码审查报告：AI Provider 抽象层

## 审查结论

**通过**（无阻塞项；2 项非阻塞待办）

## 功能

- [x] 门面 `chatWithProvider` / `chatWithToolsForModel` 经 Registry 分发，无 provider if-else
- [x] 四 Provider adapter 覆盖 plain chat 与 tools
- [x] 能力元数据单点（shared）+ IPC 暴露
- [x] ChatPane / ModelFormDialog 去除硬编码
- [x] `grep 'model.provider ==='` 在 electron/ 与 src/ 为 0

## 代码质量

- [x] 最小接口（chat / chatWithTools / capabilities），协议差异留在 adapter 内
- [x] 横切关注点（metrics/trace/vision）保留在门面，职责清晰
- [x] 向后兼容：tools 函数 re-export、models-types 继续导出能力函数

**非阻塞待办：**

1. `ModelFormDialog` 的 provider 下拉选项列表仍硬编码，可考虑从 `PROVIDER_CAPABILITIES` 动态生成。
2. 全量单测 2 个既有失败需独立修复（非本轮引入）。

## 安全

- [x] secrets 仍在 Main 侧；抽象层不改变密钥流
- [x] 无新外部依赖

## 风险

- tools 逻辑迁移至 adapter 后 diff 集中，已通过 27 项相关单测回归；建议上线前手工验证 Agent 一轮 tool 闭环。
