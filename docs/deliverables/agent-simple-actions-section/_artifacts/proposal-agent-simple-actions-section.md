**状态：** 已确认

## 已确认解决方案提案

**上下文：** 1:1 对齐 同类 Agent `getActionsSection`（§6），接入 `buildAgentSystemPrompt`（§15）。

**选定：** 提案 1  
**调整：** 保留 `CLAUDE.md` 原文措辞。

### 最终方案

- 新增 `getActionsSection()`：§6 英文全文（文档 `...` 按 同类 Agent 常见完整句补全）。
- `buildAgentSystemPrompt`：`intro → system → doing tasks → actions → tool rules → project root`。
- re-export + 单测扩展。

**验证：** Vitest `UT-agent-system-prompt` 等。

**待解决：** §7 `getUsingYourToolsSection`。
