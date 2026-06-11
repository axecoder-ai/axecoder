# WebSearch Serper 一键启用 设计文档

**desired_location:** `docs/plans/plan-websearch-serper-enable.md`

## 当前背景

- Serper WebSearch 已实现；`agentFeatureWebSearch` 默认 false。
- Settings 有 Switch + Key，用户须两步操作。
- 调研矩阵 §18 将「WebSearch 默认开启 / 降低配置摩擦」列为 P1。

## 需求

### 功能需求

- Settings「启用网页搜索」一键展开 Key 区；保存 Key 自动开启。
- 「关闭」仅关 flag，保留 Key。
- 运行时 Key：`agentWebSearchApiKey` > `SERPER_API_KEY`。
- 开关关时 executor 仍拒绝 WebSearch。

### 非功能需求

- 最小 diff；复用现有 `sound-btn` 样式。
- 错误信息指向 Settings 或 env。

## 实施计划

### 阶段一：Key 解析

1. `agent-web.ts` 增加 `resolveWebSearchApiKey`
2. `agent-ext-executor.ts` 改用解析 Key

### 阶段二：Settings UX

3. `GeneralTab.vue` 按钮式启用/关闭
4. `onWebSearchApiKey` 非空时附带 `agentFeatureWebSearch: true`
5. i18n 文案

### 阶段三：测试

6. UT：env 回退、executor 用 env Key
7. `npm test` 全绿

## 测试策略

- vitest mock `process.env.SERPER_API_KEY`
- 回归 WebSearch disabled / Serper fetch

## 安全考量

- Key 仍存本地 config；env 不落盘
