import { isCodeGraphBackendAvailable, isProjectCodeGraphReady } from '../codegraph/manager'

export const CODEGRAPH_EXPLORE_DESCRIPTION = `PRIMARY code-intelligence tool — call FIRST for structure/architecture/how-does-X questions. Returns verbatim source for related symbols grouped by file in one call. Do NOT re-Read files already shown. Query: symbol names, file names, or short terms (e.g. "AuthService loginUser").`

export const CODEGRAPH_SEARCH_DESCRIPTION = `Quick symbol search by name across the indexed codebase. Returns locations only (no code). Prefer CodeGraphExplore to get source in one call.`

export const CODEGRAPH_NODE_DESCRIPTION = `Get ONE symbol in full — location, signature, callers/callees trail, and body (includeCode=true). Use when CodeGraphExplore trimmed a body you still need.`

/** 动态段：索引存在且后端可用时注入 */
export const getCodeGraphInstructionsSection = async (
  projectRoot: string,
): Promise<string | null> => {
  if (!isCodeGraphBackendAvailable()) return null
  if (!isProjectCodeGraphReady(projectRoot)) {
    return `# CodeGraph

This project is not indexed yet. The first CodeGraph tool call will build \`.codegraph/\` automatically. For structural questions (how X works, call graph, where is Y), prefer **CodeGraphExplore** over Grep+Read chains.`
  }
  return `# CodeGraph (built-in)

A local code knowledge graph is indexed under \`.codegraph/\`. For architecture, call flow, or "where is X" questions:

- **CodeGraphExplore** — primary; several related symbols + source in one call (usually zero Reads).
- **CodeGraphSearch** — find symbol names/locations only.
- **CodeGraphNode** — one symbol's full body when explore trimmed it.

Answer from the index in a handful of CodeGraph calls; avoid re-deriving structure with Grep+Read.`
}
