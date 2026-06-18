# 选型记录

## 一句话需求回顾

将 AxeCoder 多 Agent 能力对齐 MetaGPT：固定 SOP 流水线、结构化交付物（PRD/Design/Tasks）、Message Pool、QA 闭环；新增 `software-company` 模式，与现有 Multi-Agent 动态群聊并存。

## 方案对比表

| 维度 | 提案 1 SOP 流水线 MVP | 提案 2 完整原生对齐 |
|------|------------------------|---------------------|
| 核心思路 | 阶段机 + 结构化 artifact，不改通信层 | MVP + Message Pool + QA 环 + UI 阶段条 + rppit 映射 |
| 主要改动范围 | sop/ 模块、ChatMode、workshop-ipc 分支 | 提案 1 全部 + message-pool、qa-loop、Workshop UI |
| 优点 | 6–7 周、回归风险低 | 对齐 MetaGPT 80%+ 机制 |
| 缺点 / 风险 | 上下文仍靠 summary | 改动 20+ 文件、14–16 周 |
| 工作量 | 中 | 大 |
| 适合场景 | 先验证「软件公司」体验 | 长期对标 MetaGPT 论文能力 |

## 关键差异说明

- 选提案 1：先跑通一行需求 → PRD → Design → Tasks → Code，Message Pool 二期补。
- 选提案 2：一次性具备角色订阅通信、QA 自动跑测回流、rppit 与 SOP phase 统一。
- 两方案均不引入 MetaGPT Python 依赖，在 Electron 内原生实现。
- 现有 `multi-agent` / `reflection` 模式保持不变，仅新增 `software-company`。

## 推荐方案

**推荐：提案 1 – SOP 流水线 MVP**

推荐理由：可先交付可演示的 MetaGPT 核心路径，风险可控；Message Pool 与 QA 环可在验证 MVP 后迭代。若用户追求完整论文对标且可接受更长周期，选提案 2。

## 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-metgpt-alignment.md`。

---

## 用户最终选择

- **选定提案：** 提案 2 – 完整原生对齐（SOP + Message Pool + QA 闭环）
- **调整说明：** 无额外调整
