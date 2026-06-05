import { buildWorkflowSendPrompt, loadWorkflowSlugPrompt } from '../utils/role-workflow-send'
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
  { name: 'rppit', description: 'Full pipeline: proposals → selection → plan → implement → review → deliver' },
  { name: 'summary', description: 'rppit step 7: merge artifacts into [slug]-交付总结.md' },
]

export const registerWorkflowBuiltinCommands = (): SlashCommandDef[] =>
  WORKFLOW_COMMANDS.map(({ name, description }) => ({
    name,
    description,
    run: async (ctx, args) => {
      const loaded = await loadWorkflowSlugPrompt(ctx.projectRoot, name)
      if (!loaded.ok) return { ok: false, message: loaded.error ?? 'Failed to load command' }
      const sendPrompt = buildWorkflowSendPrompt(loaded.text, args.trim())
      return {
        ok: true,
        message: `Ran /${name}`,
        silent: true,
        sendPrompt,
      }
    },
  }))
