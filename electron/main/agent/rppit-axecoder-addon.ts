import { rppitPhaseHint } from '../sop/rppit-phase-map'

/** 注入 rppit 用户消息末尾，避免模型调用 AxeCoder 中不存在的 Cursor 能力 */
export const axeCoderRppitRuntimeAddon = (): string => `
---

## AxeCoder 运行时（必读）

- **SwitchMode 工具**：与 Cursor 对齐，\`target_mode_id: agent | plan\`（\`planning\`、\`auto-plan\` 为旧别名）。只读规划也可用 **EnterPlanMode** / **ExitPlanMode**。
- **AskUserQuestion**：步骤 0（需求澄清）每个小步与步骤 3b（选型）**必须**调用 **AskUserQuestion**（别名 AskQuestion）；步骤 0 每次只问一题，等用户回答后再进下一小步。
- **可用工作流斜杠（已内置）**：\`/research-codebase\`、\`/make-proposals\`、\`/create-proposals\`、\`/make-plan\`、\`/implement\`、\`/code-review\`、\`/summary\`（步骤 8 合并交付）、\`/rppit\`。
- **步骤 8**：执行 **/summary** 的 playbook（读 \`resources/builtin-commands/summary.md\` 或按该文件步骤落盘），生成 \`[slug]-交付总结.md\`。**禁止**臆造其它斜杠命令名。
- 子步骤正文在 \`resources/builtin-commands/\`（与 \`~/.cursor/commands/\` 同名文件等价）；按文件步骤执行，不要假设 Cursor 独有工具存在。

${rppitPhaseHint()}
`.trim()
