import type { SlashCommandDef } from './types'

const WORKFLOW_COMMANDS: { name: string; description: string }[] = [
  { name: 'research-codebase', description: 'Research the codebase and write a structured report' },
  { name: 'make-proposals', description: 'Generate up to two solution proposals' },
  { name: 'make-plan', description: 'Draft an implementation plan document from a proposal' },
  { name: 'clarify', description: 'Clarify requirements via Q&A and write a requirements doc' },
  { name: 'create-proposals', description: 'Produce a confirmed final proposal from a selected option' },
  { name: 'create-plan', description: 'Create an executable development TODO plan' },
  { name: 'implement', description: 'Implement a feature using a strict TDD workflow' },
  { name: 'code-review', description: 'Review code changes for quality and risk' },
  { name: 'design_doc_template', description: 'Draft a design document using the standard template' },
]

export const registerWorkflowBuiltinCommands = (): SlashCommandDef[] =>
  WORKFLOW_COMMANDS.map(({ name, description }) => ({
    name,
    description,
    run: async (_ctx, args) => {
      const loaded = await window.axecoder.agentLoadBuiltinCommand(name)
      if (!loaded.ok) return { ok: false, message: loaded.error ?? 'Failed to load command' }
      const userPart = args.trim()
      const sendPrompt = userPart
        ? `${loaded.text}\n\n---\n\nUser notes:\n${userPart}`
        : loaded.text
      return {
        ok: true,
        message: `Ran /${name}`,
        silent: true,
        sendPrompt,
      }
    },
  }))
