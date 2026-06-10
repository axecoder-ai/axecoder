# Codebase Research Guide

Document the current state of the codebase strictly as it exists today. Do not give recommendations or evaluations.

## Contract

- **Document only:** Record what exists now. Do not propose improvements, root-cause analysis, or future work.
- **Cite concretely:** Include specific file paths and line references in findings.
- **Read fully first:** Before breaking work into pieces, read every file the user mentions in full.

## Steps After Receiving a Research Request

If the user provides **no topic or scope** (empty message after `/research-codebase` or `@Researcher` with no args), treat the scope as **the entire codebase** and proceed immediately—do not ask what to research.

1. **Read fully**
   - Start by reading every directly referenced file in full.
2. **Decompose and plan**
   - Break the query into focused research areas and build an internal checklist.
3. **Explore in parallel**
   - When areas are independent, explore related directories and files in parallel.
   - Check `git` history when it may answer the research question.
   - If third-party APIs matter, use Context7 (or equivalent MCP docs tools) for up-to-date API documentation.
4. **Synthesize**
   - Combine findings only after exploration is complete.
   - **Prefer conclusions from current, effective code over historical docs.**
5. **Write the report**
   - Produce a structured research report that includes:
     - A **summary of key findings** that answer the research questions
     - **Detailed sections by component/domain** with code citations
     - **Cross-component connections and data flows**
   - **You MUST persist the report with the `Write` tool** (not chat-only output).
   - Save under `docs/research/research-<topic-slug>.md` when the topic is known; otherwise `docs/research/research-codebase.md`. Create parent directories if needed.

## Output Format

- Use Markdown.
- Organize by component or area.
- Cite code as: `path/to/file.py:startLine-endLine`
- Reply in English unless the user asks otherwise.
