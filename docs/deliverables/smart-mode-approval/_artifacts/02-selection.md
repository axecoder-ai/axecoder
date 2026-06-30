# 方案选型记录

## 2a 选型摘要

### 一句话需求回顾

对齐 Cursor Smart Mode：对 Bash（非只读）、WebFetch、CallMcpTool 等高风险工具在执行前做 Auto-review；被拦截后 Agent 可请求用户智能审批放行。新增 `agentSmartModeApproval` 开关，**默认开启**；关闭时与当前行为一致。

### 方案对比表

| 维度 | 提案 1 LLM Auto-review | 提案 2 启发式规则 |
|------|------------------------|-------------------|
| 核心思路 | 便宜模型 JSON 分类 allow/block | 正则/关键词规则表 |
| 主要改动范围 | classifier + loop 门控 + 审批卡 + 设置 | rules 文件 + 同 UI/loop |
| 优点 | 真正智能、对齐 Cursor、可覆盖新型风险 | 零 token、确定性、实现快 |
| 缺点 / 风险 | 延迟与成本、误判 | 漏判/误伤、规则维护 |
| 工作量 | 中 | 小 |
| 适合场景 | 产品要对齐 Cursor「智能审批」 | 仅需基础危险命令拦截 |

### 关键差异

- 提案 1 用 LLM 判断边界案例；提案 2 仅匹配已知模式。
- 提案 1 长期维护成本低；提案 2 需持续补规则。
- 两者 UI/IPC/开关形态相同，差异在审查引擎。

### 推荐方案

**推荐：提案 1 – LLM Auto-review 分类器 + 智能审批卡**

理由：用户明确要求「智能审批」且对标 Cursor Smart Mode；项目已有 `agent-auto-plan-classifier.ts` 可复用；调研矩阵标注为未实现项，LLM 方案语义最贴合。

## 2b 用户最终选择

- **选定：提案 1 – LLM Auto-review 分类器 + 智能审批卡**
- **调整说明：** 无额外调整
