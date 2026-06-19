import type { SopPipelinePhase } from './sop-types'

const SOP_ARTIFACT_HINTS: Partial<Record<SopPipelinePhase, string>> = {
  prd: [
    '[Software Company SOP · WritePRD]',
    'You are in the PRD phase. Deliver a Product Requirements Document.',
    'If requirements are unclear: call AskUserQuestion with ONE concrete question and 2–5 options, then stop.',
    'Do NOT only paste the question in prose—users need clickable options via AskUserQuestion.',
    'When PRD is ready, end with exactly one ```json block:',
    '{ "title": "...", "userStories": ["..."], "requirementPool": ["..."], "competitiveAnalysis": "..." }',
    'userStories must be non-empty. You may also write markdown with ## 用户故事.',
  ].join('\n'),
  design: [
    '[Software Company SOP · WriteDesign]',
    'Produce system design from upstream PRD.',
    'End with ```json: { "title", "fileList": [], "dataStructures": [], "apis": [{ "name", "description" }], "sequenceDiagram": "mermaid or text flow" }',
    'Or markdown with ## 文件列表 and ## Sequence.',
  ].join('\n'),
  tasks: [
    '[Software Company SOP · WriteTasks · Project Manager]',
    'Break design (or user requirement for incremental) into ordered tasks with deps.',
    'End with ```json:',
    '{ "title": "...", "tasks": [{ "id": "t1", "title": "...", "assignee": "developer", "deps": [] }] }',
    'Each task must be small enough for one Engineer iteration.',
  ].join('\n'),
  implement: [
    '[Software Company SOP · WriteCode]',
    'Implement per task list. You MUST use Write/StrReplace to create application source code on disk.',
    'Do NOT only write docs or tests — include runnable service/module source (e.g. cmd/, internal/, src/).',
    'List every created/changed path in your reply. Gate fails without real source files on disk.',
  ].join('\n'),
  qa: [
    '[Software Company SOP · RunQA]',
    'Run tests via Bash (e.g. make test, go test ./...). Paste command output.',
    'Reply must include test output AND state 测试通过 or all tests pass if green.',
  ].join('\n'),
}

export const sopFollowUpPromptBlock = (): string =>
  [
    '[Software Company SOP · follow-up after pipeline done]',
    'Answer the user NEW message in [User request] — not only the original brief.',
    'Inspect the repo with tools first. If application source code is missing, say so clearly.',
  ].join('\n')

export const sopResearchAuditPromptBlock = (): string =>
  [
    '[Software Company SOP · codebase audit before code recovery]',
    'Use Glob/Grep/Read to inspect the repo. Report what application source exists vs missing.',
    'Ignore docs/deliverables and test-only folders when judging whether service code exists.',
    'End with a clear verdict: 有源码 / 缺源码 and list paths.',
  ].join('\n')

export const sopPhasePromptBlock = (phase?: SopPipelinePhase, poolContext?: string): string => {
  if (!phase || phase === 'idle' || phase === 'requirement' || phase === 'done') return ''
  const hint = SOP_ARTIFACT_HINTS[phase]
  if (!hint) return ''
  const parts = [hint]
  if (poolContext?.trim()) parts.push(`[Upstream artifacts]\n${poolContext.trim()}`)
  return parts.join('\n\n')
}
