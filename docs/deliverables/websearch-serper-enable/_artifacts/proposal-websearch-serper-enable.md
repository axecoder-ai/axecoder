**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** WebSearch Serper 已接但默认关；实现 Settings 一键开，并支持 `SERPER_API_KEY` 环境变量。
- **调研来源：** `docs/research/research-agent-tools-matrix.md` §7/§18；`docs/deliverables/web-search-webrun/`
- **上游提案：** `docs/proposals/proposal-websearch-serper-enable.md`（双方案草稿）
- **选定基础：** 提案 2 – Settings 一键开
- **用户调整摘要：** 运行时除 Settings 保存的 Key 外，回退读取 `process.env.SERPER_API_KEY`。

### 最终方案 – Settings 一键开 + SERPER_API_KEY

- **概述：** Settings Agent 区将 WebSearch 改为「启用网页搜索」主按钮；启用后展示 Key 输入与「关闭」；保存非空 Key 时原子写入 `agentFeatureWebSearch: true` 与 `agentWebSearchApiKey`。Executor 解析 Key 时：Settings Key 优先，否则 `SERPER_API_KEY`。关闭时仅设 `agentFeatureWebSearch: false`，Key 保留。
- **相对选定提案的变更：** 增加 env Key 回退与 `resolveWebSearchApiKey` 辅助函数；本轮不做「测试连接」按钮。
- **关键变更：**
  - `electron/main/agent/agent-web.ts` — `resolveWebSearchApiKey`
  - `electron/main/agent/agent-ext-executor.ts` — 使用解析后的 Key
  - `src/components/workbench/GeneralTab.vue` — 一键开/关 UX
  - `shared/i18n/locales/en.ts`、`zh-CN.ts` — 新文案
  - `tests/unittest/UT-web-search-webrun/` — env 与一键保存用例
- **权衡：** 保留显式开关；env 用户可无 UI Key 但须手动开功能或依赖已有 flag。
- **验证：** UT 全绿；手工：点启用→填 Key→Agent 可调 WebSearch；设 env Key 且开关开→可用。
- **待解决问题：** env Key 时 Settings 是否显示「已通过环境变量配置」提示（本轮可选 P2）。

### 未采纳方案说明

- **未选：** 提案 1 – Key 驱动自动启用
- **原因：** 用户需保留显式关闭能力。
