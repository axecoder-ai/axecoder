---
任务名: agent-codegraph-native
完成日期: 2026-06-04
选定方案: 提案 2 – 源码 vendoring 完全内嵌
审查结论: 通过
单测: 353/353 全绿
---

# agent-codegraph-native 交付总结

## 概述

**需求：** 将 tree-sitter + SQLite 代码知识图谱（CodeGraph）搬进 AxeCoder 主进程，作为内置「代码理解外挂」。

**目标：** Agent 可直接调用 CodeGraphExplore/Search/Node，减少大仓库 Grep+Read 开销。

**选型：** 推荐提案 1（npm 依赖），用户选定 **提案 2（源码 vendoring）**。

**交付物目录：** `docs/deliverables/agent-codegraph-native/_artifacts/`

---

## 方案

- vendoring `codegraph/src` → `electron/main/codegraph/src/`
- 子包 CommonJS 编译 + `createRequire` 桥接
- Agent 三工具 + system prompt 动态段
- 索引目录 `.codegraph/` 与 upstream 兼容

详见 `_artifacts/proposal-agent-codegraph-native.md`。

---

## 方案选型过程

| 维度 | 提案 1 npm 依赖 | 提案 2 vendoring（**选定**） |
|------|----------------|------------------------------|
| 工作量 | 中 | 大 |
| 定制性 | 低 | 高 |
| 同步 upstream | 易 | 难 |

用户无额外调整。详见 `_artifacts/02-selection.md`。

---

## 实施计划

四阶段：Vendoring → Bridge/Manager → Agent 集成 → 验收。详见 `_artifacts/plan-agent-codegraph-native.md`。

---

## 实现说明

- 97 个 TS 源文件 vendored
- `npm run codegraph:build` 构建 dist
- `agentFeatureCodeGraph` 默认开启
- 首次工具调用自动 init + index

详见 `_artifacts/05-implement-report.md`。

---

## 单元测试执行情况

```bash
npm run codegraph:build && npm test
```

**82 文件 / 353 用例全绿。** 详见 `_artifacts/05-unittest.md`。

---

## 测试报告

- 自动化：UT-agent-codegraph-native（含 integration init/search/explore）
- 手工：待用户在 Electron 内对真实项目触发 CodeGraphExplore
- 边界：无 node:sqlite 时工具返回明确错误

---

## 代码审查

**结论：通过。** Electron 29 Node 20 与 node:sqlite 不兼容为已知限制。详见 `_artifacts/06-code-review.md`。

---

## 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/codegraph/src/**` | 新增 | vendored CodeGraph 引擎 |
| `electron/main/codegraph/bridge.ts` | 新增 | CJS 加载 |
| `electron/main/codegraph/manager.ts` | 新增 | 会话管理 |
| `electron/main/agent/agent-codegraph*.ts` | 新增 | Agent 工具 |
| `electron/main/agent/agent-*` | 修改 | 类型/executor/prompt |
| `electron/main/config-store.ts` | 修改 | feature flag |
| `package.json` | 修改 | 依赖 + build 脚本 |
| `tests/unittest/UT-agent-codegraph-native/` | 新增 | 单测 |

---

## 遗留项与后续建议

1. 升级 Electron 或加 SQLite wasm 回退（打包/runtime）
2. 扩展 callers/callees/impact/status/files 工具
3. 设置页：索引状态、手动 reindex
4. `pretest` 自动 `codegraph:build`

---

## 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-agent-codegraph-native.md` |
| 计划 | `_artifacts/plan-agent-codegraph-native.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
