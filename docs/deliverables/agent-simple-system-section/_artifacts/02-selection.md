# 方案选型记录

## 2a 选型摘要

**一句话需求：** 在 AxeCoder Agent 系统提示中 1:1 接入 Claude Code `getSimpleSystemSection`（§4），并按 §15 放在 `getSimpleIntroSection` 之后。

| 维度 | 提案 1 – 英文原文常量 + 独立函数 | 提案 2 – 按现状裁剪 |
|------|----------------------------------|---------------------|
| 核心思路 | §4 六条 bullet 英文原文，`getSimpleSystemSection()` | 去掉 Hooks/permission 等未实现能力相关句 |
| 主要改动范围 | `agent-system-prompt.ts`、re-export、单测 | 同左，但文案非 1:1 |
| 优点 | 与 Claude Code 一致；与 intro 模块化模式一致 | 文案与产品能力更贴合 |
| 缺点 / 风险 | Hooks/permission 尚未全量产品化，仅作模型约束 | 违背用户 1:1 要求 |
| 工作量 | 小 | 小 |
| 适合场景 | 用户明确要求 1:1 | 仅要「够用」行为提示 |

**关键差异：**
- 提案 1 保留 permission 拒绝不重试、Hooks、prompt injection 等全文。
- 提案 2 会删减段落，后续再对齐成本高。
- 组装顺序均为 intro → system → 现有 doing-tasks 工具规则。

**推荐：提案 1 – 英文原文常量 + 独立函数**  
用户指令为「1:1 实现」，与前序 `agent-simple-intro` 对 §2–3 的做法一致；改动面小、可测性强。

## 2b 用户确认

- **选定：** 提案 1
- **调整说明：** 无额外调整
