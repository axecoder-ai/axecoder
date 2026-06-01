## 已确认解决方案提案

**状态：** 已确认（rppit 选型：提案 2）

**上下文：**
- **请求：** Workshop 角色具备 Read/Write/Grep 等 Agentic 能力，能读 `zhongzhi` 等路径并改代码。
- **调研来源：** `workshop-llm.ts`（V1 无 tools）、`agent-subagent.ts`（子代理带工具）
- **选定基础：** 提案 2 – 复用 `runSubAgentTask`
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 子代理 RoleSpeaker

- **概述：** 新增 `buildSubagentRoleSpeaker(projectRoot, modelId)`，各角色调用 `runSubAgentTask`；经理/测试用 `explore`（只读），后端/前端用 `generalPurpose`（含 Write/Edit）；报告写入群聊气泡；`relatedFiles` 从报告路径正则提取；经理澄清仍由编排层 `pendingQuestion` 解析报告触发。
- **关键变更：** `workshop-subagent-speaker.ts`、`workshop-ipc.ts`（默认 speaker 改为 subagent）
- **权衡：** 落地快；写盘自动 apply，与 Chat 确认流不一致（用户已接受）。
- **验证：** 单测 mock subagent；手工读 zhongzhi 路径。
- **待解决问题：** 后续可迁提案 1 统一 diff 确认。
