# Solution Proposal Guide

Based on existing research documents and a new feature or project request, produce up to two solution proposals.

- Use the SwitchMode tool to switch to agent mode.
- Write the final proposal document to `docs/proposals/proposal-[feature].md` in the project.

## Guidelines

- Treat the `/research-codebase` workflow as the **authoritative reference** for how to receive requirements and structure documents.
- **Require** a research document produced by the `/research-codebase` workflow.
- For the incoming request, propose **two distinct solution approaches**, each tightly grounded in the research findings.
- For each proposal, **explain trade-offs, affected systems, validation steps, and open questions**.

## Steps

1. **Receive the request**
   - Record the user's request and, optionally, the research document path.
2. **Analyze the research**
   - Read the research document in full.
   - Extract **constraints, relevant modules, dependencies, data flows**, and **prior decisions**.
3. **Synthesize solutions**
   - Derive candidate approaches from the research.
   - For each approach, record **major changes, affected code paths, required migration/config updates**, and **release considerations**.
   - Limit output to **two or three** distinct proposals, ordered by **best fit with constraints**.
4. **Plan validation**
   - Define how each approach would be validated (tests, experiments, observability).
   - Call out **key unknowns** or **required follow-up research**.
5. **Deliver**
   - Output using the template below.

## Output Template

---

## Solution Proposals

**Context:**
- **Request:** `<brief restatement of the requirement>`
- **Research sources:** `<file names and key sections used>`

**Proposal 1 – `<title>`**
- **Overview:** `<2-3 sentences>`
- **Key changes:** `<components/modules>`
- **Trade-offs:** `<risks and benefits>`
- **Validation:** `<tests/experiments/metrics>`
- **Open questions:** `<gaps or follow-ups>`

**Proposal 2 – `<title>`**
- **Overview:** `<2-3 sentences>`
- **Key changes:** `<components/modules>`
- **Trade-offs:** `<risks and benefits>`
- **Validation:** `<tests/experiments/metrics>`
- **Open questions:** `<gaps or follow-ups>`

---

## Notes

- When citing research, reference code and sections with backticks in the form `` `path/to/file.py:line` ``.
- If the research does **not directly cover** the current request, explicitly call out the **gaps** and recommend **additional research** before proposing solutions.
- Stay concise; prioritize clarity over exhaustive detail while keeping guidance actionable.
