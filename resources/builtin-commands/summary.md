# summary — rppit 步骤 7：合并交付与归档

在 **rppit 流水线步骤 5（单测全绿）与步骤 6（代码审查）完成后**执行。本命令对应 rppit 文档中的「步骤 7」，**不是** Cursor 专有命令。

## 输入（须已存在）

- 已确定的 `[slug]` 与 `{deliverables_root}`（与本轮 rppit 一致）
- `{deliverables_root}/[slug]/_artifacts/` 下已有：`02-selection.md`、`05-implement-report.md`、`05-unittest.md`、`06-code-review.md` 等
- 工作区或 `_artifacts/` 中已有已确认 `proposal-[slug].md`、`plan-[slug].md`

## 7a. 归档中间稿

将下列文件**移动**（非复制）到 `{deliverables_root}/[slug]/_artifacts/`：

| 源 | 目标 |
|----|------|
| `docs/proposals/proposal-[slug].md` | `_artifacts/proposal-[slug].md` |
| `docs/plans/plan-[slug].md` | `_artifacts/plan-[slug].md` |

移动后 `docs/proposals/`、`docs/plans/` 下不再保留本轮副本。

## 7b. 生成合并文档

读取 `_artifacts/` 下全部相关 `.md`，写入 **`{deliverables_root}/[slug]/[slug]-交付总结.md`**。

文首元数据须含：任务名、完成日期、选定方案、审查结论、单测是否全绿。

正文须按序包含：概述、方案、方案选型过程、实施计划、实现说明、单元测试执行情况、测试报告、代码审查、变更清单、遗留项与后续建议、附录（过程文档索引）。

## 7c. 完成标准

- `[slug]-交付总结.md` 已落盘且章节齐全
- 回复中给出合并文档路径与 `_artifacts/` 目录树
- 标明 `✓ 步骤 7 完成` 后方可宣称 rppit 流水线结束
