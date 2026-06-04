# rppit — 从候选方案到落地审查全流程

从**需求 → 候选方案 → 用户选型 → 已确认方案 → 计划 → 实现 → 审查 → 合并交付**的一键流水线。按顺序执行，**上一步交付物就绪后再进入下一步**；任一步失败则停止并说明原因，不跳步。

## 前置条件（用户在本轮应提供）

- **功能/需求描述**（必填；或指向已有双方案文档 `docs/proposals/proposal-*.md` 的路径）
- **可选**：调研文档路径（`research/`、`docs/` 下由 `/research-codebase` 生成的文档）
- **可选**：归档根目录覆盖（如「归档到 `docs/features`」）；未指定则按下方「交付物路径」规则解析

## 可跳过步骤 1–2 的情况

若用户**同时**满足以下全部条件，可从步骤 3 开始（仍须执行步骤 0、步骤 7）：

- 已有 `docs/proposals/proposal-[功能].md`，且文首 **状态** 为「已确认」
- 用户明确声明「方案已确认，直接落地」

否则**必须**执行步骤 1（`/make-proposals`）与步骤 2（`AskQuestion`），不得臆造选定提案或调整说明。

---

## 交付物路径（由当前项目决定）

全流程开始时（步骤 0c）解析并**在回复中写明**，后续步骤一律使用同一套路径。

### 解析 `{deliverables_root}` 的优先级

1. 用户在本轮消息中指定的目录（如 `归档到 docs/features`）
2. 项目根 **`.cursor/rppit.json`** 中的 `deliverables_root`（示例见下）
3. 项目 **`CLAUDE.md`** 中若写明 `rppit.deliverables_root`，用之
4. 默认：**`docs/deliverables`**

`.cursor/rppit.json` 示例：

```json
{
  "deliverables_root": "docs/deliverables",
  "merged_doc_suffix": "交付总结"
}
```

### 本轮目录约定（`[slug]` = 任务名，与 `proposal-[slug]` / `plan-[slug]` 一致）

| 用途 | 路径 |
|------|------|
| 任务根目录 | `{deliverables_root}/[slug]/` |
| 过程中间稿（归档用） | `{deliverables_root}/[slug]/_artifacts/` |
| **合并后的总交付文档** | `{deliverables_root}/[slug]/[slug]-交付总结.md`（或 json 中 `merged_doc_suffix`） |

步骤 0c 结束时**创建** `{deliverables_root}/[slug]/_artifacts/`（若不存在）。

### 过程文档清单（全程维护，步骤 7 前不得遗漏）

在 `_artifacts/` 下按步落盘（文件名固定，便于合并）：

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | （工作区）`docs/proposals/proposal-[slug].md` | 双方案草稿，步骤 7 移入 `_artifacts/` |
| 2 | `_artifacts/02-selection.md` | 2a 选型摘要 + 2b 用户最终选择 + 调整说明 |
| 3 | （工作区）`docs/proposals/proposal-[slug].md` | 已确认单方案（覆盖草稿） |
| 4 | （工作区）`docs/plans/plan-[slug].md` | 实施计划 |
| 5 | `_artifacts/05-implement-report.md` | 【功能实现报告】全文 |
| 5 | `_artifacts/05-unittest.md` | 单测命令、完整输出、通过/失败统计 |
| 6 | `_artifacts/06-code-review.md` | 代码审查结论全文 |

可选：用户提供的调研文档路径记入 `_artifacts/00-research-links.md`（仅链接列表）。

**说明**：步骤 1–4 仍写入 `docs/proposals/`、`docs/plans/`，以便与 `make-proposals` / `make-plan` 等子命令兼容；**步骤 7 将它们移入** `_artifacts/` 并生成合并文档。

---

## 执行顺序（严格按序，不可并行、不可跳过）

### 0. 初始化（模式 + 任务名 + 归档路径）

#### 0a. 切换模式

1. 调用 **SwitchMode** 工具：`target_mode_id` = **`agent`**。
2. 切换完成后再继续 0b。

#### 0b. 确定任务名 `[slug]`

1. 从用户需求提炼，与现有文档命名风格一致（如 `订单物流信息`、`发货前取消`）。
2. 若用户已给出 `proposal-*.md` 路径，从文件名提取 `[slug]`。
3. 在回复中写明：**`本轮任务名（slug）：[slug]`**。

#### 0c. 解析路径并创建目录

1. 按上文规则确定 `{deliverables_root}`。
2. 在回复中写明：
   - `交付物根目录：{deliverables_root}`
   - `任务目录：{deliverables_root}/[slug]/`
   - `合并文档：{deliverables_root}/[slug]/[slug]-交付总结.md`
3. 创建 `{deliverables_root}/[slug]/_artifacts/`。

**完成标准 0**：模式已切换、slug 与路径已公布、`_artifacts` 已就绪。

### 1. `/make-proposals`

1. **完整遵循** 全局命令 `make-proposals`（`~/.cursor/commands/make-proposals.md`）的全部步骤与行为准则。
2. **调研材料**：
   - 用户提供了调研路径 → 完整阅读该文档，并写入 `_artifacts/00-research-links.md`；
   - 未提供 → 在仓库内搜索 `research/`、`docs/` 相关文档；仍无则做**必要的代码库浏览**（搜索/阅读关键模块），并在产出中标注「调研缺口」。
3. **产出**：
   - 在回复中按 `make-proposals` 模板呈现 **提案 1、提案 2**（至多 3 个）；
   - 将同一内容写入 `docs/proposals/proposal-[slug].md`（**双方案草稿**，文首标注 `**状态：** 待选型`）。
4. **完成标准**：候选方案已在回复中展示且草稿文件已落盘。
5. **禁止**：在本步调用 `/create-proposals`、`/make-plan` 或编写实施计划。

### 2. 用户选型（选型摘要 → `AskQuestion` → 落盘）

本步分 **2a 选型摘要**、**2b AskQuestion**、**2c 落盘**，**严格按序**；用户**无需打开** `docs/proposals/proposal-*.md` 即可完成选型。

#### 2a. 选型摘要（调用 AskQuestion **之前**，写在同一条回复中）

在调用 AskQuestion **之前**，必须在回复中用**自包含**的方式呈现以下内容（从步骤 1 的提案中提炼，**不要**只说「见 proposal 文档」）：

1. **一句话需求回顾**（≤2 句）：本轮要解决什么、边界是什么。
2. **方案对比表**（Markdown 表格，列建议固定为）：

   | 维度 | 提案 1 `<标题>` | 提案 2 `<标题>` | （若有提案 3） |
   |------|-----------------|-----------------|----------------|
   | 核心思路 | … | … | … |
   | 主要改动范围 | … | … | … |
   | 优点 | … | … | … |
   | 缺点 / 风险 | … | … | … |
   | 工作量（粗估） | 小/中/大 | 小/中/大 | … |
   | 适合场景 | … | … | … |

3. **关键差异说明**（3–6 条 bullet）：用业务语言说明「选 A 会得到什么、选 B 会得到什么」，点明不可兼得之处。
4. **推荐方案**（必填）：
   - 明确写出：**推荐：提案 N – `<标题>`**
   - **推荐理由**（2–4 句）：结合项目约束（现有代码复用、改动面、上线风险、与调研结论的契合度）；若两方案接近，说明在什么条件下应改选另一方案。
5. **选型提示**（1 句）：告知下一步将通过选择题确认，可选填调整说明；完整细节仍保存在 `docs/proposals/proposal-[slug].md`。

**完成标准 2a**：上述 1–5 已在回复中写全，用户不打开方案文件也能理解差异并做判断。

**禁止 2a**：用「详见 proposal」「请阅读文档」代替对比与推荐；在 2a 未完成时调用 AskQuestion。

#### 2b. 用户确认（`AskQuestion`）

1. **必须**在 2a 写完后，**同一条回复内**调用 **AskQuestion**，至少包含一题：
   - **选定提案**：选项文案与步骤 1 标题一致（如 `提案 1 – xxx` / `提案 2 – xxx`）；**默认勾选/预选项**设为 2a 中的**推荐方案**（若工具支持）。
2. **建议**增加第二题（可选填）：
   - **调整说明**：相对选定方案要改什么、保留什么、范围或约束变更。
3. 若用户在本轮消息中**已明确**写出选定提案与调整说明，仍须先完成 **2a**，再用 AskQuestion **确认**一次（选项与用户原文一致），**不得**跳过 2a 或 2b。
4. **完成标准 2b**：已获得用户的选定提案；调整说明有则记录，无则记为「无额外调整」。

#### 2c. 选型记录落盘

将 2a 全文 + 2b 用户最终选择 + 调整说明写入 **`{deliverables_root}/[slug]/_artifacts/02-selection.md`**。

**禁止**：在未完成 2a、2b、2c 前进入步骤 3。

### 3. `/create-proposals`

1. **完整遵循** 全局命令 `create-proposals`（`~/.cursor/commands/create-proposals.md`）的全部步骤与行为准则。
2. 输入：步骤 1 的双方案文档 + 步骤 2 的选定提案与调整说明。
3. **产出**：`docs/proposals/proposal-[slug].md`（**已确认单方案**，`**状态：** 已确认`；覆盖步骤 1 草稿）。
4. **完成标准**：文件已写入磁盘；回复中给出路径与 3–5 条摘要。
5. **禁止**：在本步调用 `/make-plan` 或编写实施计划。

### 4. `/make-plan`

1. **完整遵循** 全局命令 `make-plan`（`~/.cursor/commands/make-plan.md`）的全部步骤。
2. 使用项目中的 `@design_doc_template.md` 模板结构起草计划。
3. **产出**：`docs/plans/plan-[slug].md`（路径按模板 `desired_location` 或项目惯例）。
4. **完成标准**：计划文件已落盘；**不实施任何代码变更**。
5. **禁止**：在本步修改业务代码或跑实现类单测。

### 5. `/implement`

1. **完整遵循** 全局命令 `implement`（`~/.cursor/commands/implement.md`）的 TDD 流程。
2. 以步骤 4 的计划与步骤 3 的已确认方案为输入。
3. **必须落盘**（不可仅在聊天里报告）：
   - **`_artifacts/05-implement-report.md`**：功能说明、修改文件列表、单测覆盖、注意事项；
   - **`_artifacts/05-unittest.md`**：执行的 `go test`（或项目等价）命令、**完整终端输出**、用例数/通过数/失败列表。
4. **完成标准**：单元测试全部通过；上述两个文件已写入磁盘。
5. 若单测未全绿：**不得**进入步骤 6、7；修复后更新两份报告再继续。

### 6. `/code-review`

1. **完整遵循** 全局命令 `code-review`（`~/.cursor/commands/code-review.md`）的审查步骤与检查清单。
2. **审查范围**：步骤 5 产生的全部代码与测试变更，对照步骤 3 方案与步骤 4 计划。
3. **必须落盘**：**`_artifacts/06-code-review.md`**（功能/质量/安全、阻塞项与优先级、审查结论：通过 / 需修改）。
4. **完成标准**：审查报告文件已写入；回复中给出结论摘要。

### 7. 合并交付与归档（全流程最后一步，不可跳过）

在步骤 5 单测全绿且步骤 6 完成后执行。

#### 7a. 归档中间稿

将下列文件**移动**（非复制）到 `{deliverables_root}/[slug]/_artifacts/`，保持可读文件名：

| 源 | 目标（示例） |
|----|----------------|
| `docs/proposals/proposal-[slug].md` | `_artifacts/proposal-[slug].md` |
| `docs/plans/plan-[slug].md` | `_artifacts/plan-[slug].md` |

已在 `_artifacts/` 的 `02-selection.md`、`05-*.md`、`06-code-review.md` 保留不动。  
移动后 `docs/proposals/`、`docs/plans/` 下**不再保留**本轮副本（避免双份漂移）。

#### 7b. 生成合并文档

读取 `_artifacts/` 下全部相关 `.md`，生成 **`{deliverables_root}/[slug]/[slug]-交付总结.md`**。

文首元数据（YAML 或 Markdown 表格均可）须含：任务名、完成日期、选定方案、审查结论、单测是否全绿。

正文**必须**包含以下章节（按序；可将源文档正文合并进来，删重复标题，保留实质内容）：

1. **概述** — 需求一句话、本轮目标、选型结论（推荐 vs 最终选定）、交付物目录说明  
2. **方案** — 来自已确认 `proposal-[slug].md`（含状态、关键决策、影响范围）  
3. **方案选型过程** — 来自 `02-selection.md`（对比表摘要 + 用户选择与调整说明）  
4. **实施计划** — 来自 `plan-[slug].md`（阶段与任务清单；过长可保留小节并注明「全文见 _artifacts」）  
5. **实现说明** — 来自 `05-implement-report.md`（功能点、改动文件、注意事项）  
6. **单元测试执行情况** — 来自 `05-unittest.md`（命令、结果摘要、失败项；须标明是否全绿）  
7. **测试报告** — 汇总功能验证、边界场景、手工/集成测试（若 implement 未写则在本节补「待补充」）  
8. **代码审查** — 来自 `06-code-review.md`（结论、阻塞项、非阻塞待办）  
9. **变更清单** — 表格：路径 | 变更类型（新增/修改/删除）| 一句话说明  
10. **遗留项与后续建议** — 未做范围、技术债、上线检查项  
11. **附录：过程文档索引** — 列出 `_artifacts/` 内各文件及相对路径链接  

合并时：**以事实为准**（单测输出、审查结论），不编造；各章之间用 `---` 分隔。

#### 7c. 完成标准

- `[slug]-交付总结.md` 已落盘且章节齐全；  
- 中间稿均在 `{deliverables_root}/[slug]/_artifacts/`；  
- 回复中给出合并文档路径 + `_artifacts` 目录树。

**禁止**：在未完成步骤 7 的情况下宣称「rppit 流水线完成」。

---

## 流水线规则

- **一步一验收**：每步结束在回复中简短标明 `✓ 步骤 N 完成` 及关键产出路径，再进入下一步。
- **模式**：全程保持 **agent** 模式（步骤 0 已切换）；除非子命令明确要求 plan 模式且 SwitchMode 可用，否则不擅自切到 plan。
- **范围**：只做与本需求相关的最小改动；遵守项目 `.cursor/rules` 与 `CLAUDE.md`（如不修改 `hzp_*`、`zhongzhi/`、不访问 `files/`）。
- **语言**：回复与产出文档使用中文。
- **文档**：除子命令规定的 `docs/proposals`、`docs/plans` 外，步骤 2c、5、6、7 的落盘要求**不得省略**。

## 最终回复结构

**步骤 7 完成后**，用以下结构汇总（勿省略）：

1. **任务与路径**：`[slug]`、`{deliverables_root}/[slug]/`、合并文档路径  
2. **候选方案**：步骤 1 要点（或 `_artifacts/proposal-*.md` 路径）  
3. **选型**：2a 推荐 + 用户最终选定 + 调整说明 → `02-selection.md`  
4. **已确认方案**：摘要 + `_artifacts/proposal-[slug].md`  
5. **计划**：摘要 + `_artifacts/plan-[slug].md`  
6. **实现与单测**：`05-implement-report.md` / `05-unittest.md` 要点，是否全绿  
7. **审查**：`06-code-review.md` 结论 + 待办  
8. **合并交付**：`[slug]-交付总结.md` 路径 + 章节目录一览  
9. **归档**：`_artifacts/` 文件列表  

若用户在命令后附带额外约束（分支名、不测某模块、自定义归档目录等），贯穿全流程遵守。
