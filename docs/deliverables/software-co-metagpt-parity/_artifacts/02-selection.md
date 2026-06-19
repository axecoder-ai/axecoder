# 选型记录

## 2a 选型摘要

### 一句话需求回顾

将 Software Co.（`software-company`）模式从「SOP 外壳对齐」升级为 MetaGPT 论文 §3 完整机制：逐任务实现、可执行反馈、完整 artifact 传递、角色工具剖面、Action 依赖图、Project Manager 派发。

### 方案对比表

| 维度 | 提案 1 执行闭环补齐 | 提案 2 论文级完整原生对齐 |
|------|---------------------|---------------------------|
| 核心思路 | 补 P0：逐 task + shell 测试 + artifact 引用 + 意图分流 | 提案 1 + Action 图 + 角色工具剖面 + PM 角色 + Design 扩展 + session 复用 |
| 主要改动范围 | `sop-pipeline-engine`、新建 task/test runner、message-pool | 提案 1 全部 + action-graph、role-tools、builtin 角色、UI 进度 |
| 优点 | 2–3 周、回归风险低 | 与论文 90%+ 一致、长期架构清晰 |
| 缺点 / 风险 | 仍缺 Action 图与 PM 专精 | 15+ 文件、编排重构、须严格回归 |
| 工作量 | 中 | 大 |
| 适合场景 | 先验证执行闭环 | 用户要求「完全对齐」 |

### 关键差异说明

- 选提案 1：先跑通逐 task + 真测试，Action 图与 PM 角色二期补。
- 选提案 2：一次性具备论文级编排、角色专精、Design API/时序、task 级 UI。
- 两方案均不引入 MetaGPT Python 依赖。
- 现有 Agent / Multi-Agent / Reflection 模式保持不变。

### 推荐方案

**推荐：提案 2 – 论文级完整原生对齐**

推荐理由：用户明确要求「完全按 MetaGPT 对齐」；既有 `metagpt-alignment` 已铺 SOP 骨架，补全执行闭环与 Action 图比分期返工成本低。

### 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-software-co-metagpt-parity.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 2 – 论文级完整原生对齐
- **调整说明：** 无额外调整
