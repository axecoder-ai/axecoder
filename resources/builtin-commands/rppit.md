# rppit — Full pipeline from proposals to delivery review

One-click pipeline: **requirements clarification → candidate proposals → user selection → confirmed proposal → plan → implementation → review → merged delivery**. Execute in order; **do not proceed until the previous step’s deliverables are ready**. If any step fails, stop and explain why — do not skip steps.

## Prerequisites (user should provide this turn)

- **Feature / requirement description** (required; or a path to an existing clarified-requirements / dual-proposal doc)
- **Optional**: research doc path (docs under `research/` or `docs/` produced by `/research-codebase`)
- **Optional**: deliverables root override (e.g. “archive to `docs/features`”); if unspecified, resolve per **Deliverables paths** below

## When step 0 may be skipped

If the user **simultaneously** meets **all** of the following, start at step 1:

- A structured requirements doc already exists (e.g. `docs/requirements/requirements-*.md` or `{deliverables_root}/[slug]/_artifacts/00-requirements.md`), with header **Status:** `Requirements clarification complete`
- User explicitly states “requirements are clear, skip clarification”

Otherwise **you must** run step 0 (requirements clarification). **Every sub-step must call `AskUserQuestion`**. Do not invent requirements or skip questions.

## When steps 2–3 may be skipped

If the user **simultaneously** meets **all** of the following, start at step 4 (steps 0, 1, and 8 still required):

- `docs/proposals/proposal-[feature].md` exists with header **Status:** `Confirmed`
- User explicitly states “proposal confirmed, implement directly”

Otherwise **you must** run step 2 (`/make-proposals`) and step 3 (`AskUserQuestion` selection). Do not invent the chosen proposal or adjustment notes.

---

## Deliverables paths (project-specific)

Resolve at step 1c and **state in your reply**; use the same paths for all later steps.

### `{deliverables_root}` resolution priority

1. Directory specified in this turn’s message or step 0 clarification (e.g. “archive to docs/features”)
2. `deliverables_root` in project **`.cursor/rppit.json`** (example below)
3. If **`CLAUDE.md`** defines `rppit.deliverables_root`, use it
4. Default: **`docs/deliverables`**

`.cursor/rppit.json` example:

```json
{
  "deliverables_root": "docs/deliverables",
  "merged_doc_suffix": "交付总结"
}
```

### Directory layout this run (`[slug]` = task name, aligned with `proposal-[slug]` / `plan-[slug]`)

| Purpose | Path |
|---------|------|
| Task root | `{deliverables_root}/[slug]/` |
| Working artifacts (for archive) | `{deliverables_root}/[slug]/_artifacts/` |
| **Merged delivery doc** | `{deliverables_root}/[slug]/[slug]-交付总结.md` (or json `merged_doc_suffix`) |

**Create** `{deliverables_root}/[slug]/_artifacts/` at end of step 1c if missing.

### Artifact checklist (maintain through step 8)

Write under `_artifacts/` with fixed names (for merge):

| Step | File | Description |
|------|------|-------------|
| 0 | `_artifacts/00-requirements.md` | Structured clarification outcome (written in step 1d) |
| 2 | (workspace) `docs/proposals/proposal-[slug].md` | Dual-proposal draft; moved to `_artifacts/` in step 8 |
| 3 | `_artifacts/02-selection.md` | 3a summary + 3b final choice + adjustments |
| 4 | (workspace) `docs/proposals/proposal-[slug].md` | Confirmed single proposal (overwrites draft) |
| 5 | (workspace) `docs/plans/plan-[slug].md` | Implementation plan |
| 6 | `_artifacts/05-implement-report.md` | Full implementation report |
| 6 | `_artifacts/05-unittest.md` | Test commands, full output, pass/fail stats |
| 7 | `_artifacts/06-code-review.md` | Full code review conclusion |

Optional: user research paths → `_artifacts/00-research-links.md` (link list only).

**Note:** Steps 2–5 still write to `docs/proposals/` and `docs/plans/` for compatibility with `make-proposals` / `make-plan`; **step 8 moves them** into `_artifacts/` and generates the merged doc.

---

## Execution order (strict sequence; no parallelism; no skipping)

### 0. Requirements clarification (`AskUserQuestion`, one question per turn)

Clarify requirements through structured questions **before** any technical proposal. **Do not** propose implementations or architecture in this step.

**Tool:** You **must** use **`AskUserQuestion`** (alias `AskQuestion` is equivalent). **Call it once per reply**, **one question at a time**; wait for the user’s answer before the next sub-step. **Do not** ask multiple questions in one turn; **do not** skip the tool and assume confirmation in chat.

#### 0a. Core goal confirmation

1. From the user’s initial description, restate the core goal and problem in ≤3 sentences.
2. **Must** call **AskUserQuestion** to confirm understanding. Example options: `Correct, continue` / `Partly correct, I’ll add details` / `Incorrect, I’ll restate`.
3. If the user picks “add details” or “restate”, update your understanding and **AskUserQuestion** again until aligned.

**Done 0a:** User confirmed the core goal via AskUserQuestion.

#### 0b. Scope and boundaries

1. From the confirmed goal, list 2–4 inferred in-scope and out-of-scope items each (for correction, not final).
2. **Must** call **AskUserQuestion** for the user to confirm or adjust scope (multi-select in-scope items + optional out-of-scope notes, or split across two turns).

**Done 0b:** Scope and boundaries confirmed via AskUserQuestion.

#### 0c. Constraints and priorities

1. Briefly list constraint dimensions that may affect design (time, compatibility, performance, security, existing modules, etc.).
2. **Must** call **AskUserQuestion**: which constraints are hard? What are priorities? (options + optional “other notes”).

**Done 0c:** Constraints and priorities confirmed via AskUserQuestion.

#### 0d. Acceptance criteria

1. Draft 2–4 verifiable acceptance criteria (testable, observable).
2. **Must** call **AskUserQuestion** for the user to confirm or edit criteria.

**Done 0d:** Acceptance criteria confirmed via AskUserQuestion.

#### 0e. Optional extras (as needed)

If 0a–0d did not cover the following, **AskUserQuestion per item** (one turn each; do not combine):

- Existing research doc path?
- Custom `{deliverables_root}`?
- Branch name, modules to skip in tests, release window, etc.?

If already answered earlier, record in the reply; **no repeat questions**.

**Done 0e:** Optional info collected or explicitly “none”.

#### 0f. Clarification summary (before persist)

1. Summarize in the reply: goal, scope, constraints, acceptance criteria, optional extras (structured bullets, not a design).
2. **Must** call **AskUserQuestion** one last time: “Is requirements clarification complete and ready for proposals?” Options: `Confirm, proceed` / `Need more clarification`.
3. If “Need more clarification”, return to the relevant sub-step and continue AskUserQuestion until confirmed.

**Done 0:** 0a–0f complete; user confirmed readiness for proposals. **Do not** enter step 1 before 0f completes.

**Forbidden in 0:** Skip AskUserQuestion and invent requirements; propose technical designs or selections during clarification.

### 1. Initialize (mode + task name + paths + persist requirements)

#### 1a. Confirm mode

1. **Cursor:** Call **SwitchMode** with `target_mode_id` = **`agent`** if available.
2. **AxeCoder:** No SwitchMode tool; ensure execution in Agent mode (not Workshop). Use **EnterPlanMode** / **ExitPlanMode** for read-only planning if needed.
3. State in reply: `Executing in agent mode` and continue to 1b.

#### 1b. Determine task name `[slug]`

1. Derive from step 0 clarified requirements; match existing doc naming (e.g. `order-shipping-info`, `pre-shipment-cancel`).
2. If user gave a `proposal-*.md` path, extract `[slug]` from the filename.
3. State in reply: **`Task slug this run: [slug]`**.

#### 1c. Resolve paths and create directories

1. Determine `{deliverables_root}` per rules above.
2. State in reply:
   - `Deliverables root: {deliverables_root}`
   - `Task directory: {deliverables_root}/[slug]/`
   - `Merged doc: {deliverables_root}/[slug]/[slug]-交付总结.md`
3. Create `{deliverables_root}/[slug]/_artifacts/`.

#### 1d. Persist requirements clarification

Write step 0 summary to **`{deliverables_root}/[slug]/_artifacts/00-requirements.md`**, header **`**Status:** Requirements clarification complete`**. Suggested sections: background, goals, scope (in/out), constraints & priorities, acceptance criteria, user notes.

**Done 1:** Mode set, slug and paths published, `_artifacts` ready, `00-requirements.md` on disk.

### 2. `/make-proposals`

1. **Fully follow** global command `make-proposals` (`~/.cursor/commands/make-proposals.md`).
2. **Input:** `_artifacts/00-requirements.md` as requirements baseline.
3. **Research:**
   - User provided research path → read fully; write `_artifacts/00-research-links.md`;
   - Otherwise → search `research/`, `docs/`; if still none, **minimal codebase exploration** and mark “research gaps” in output.
4. **Output:**
   - Present **Proposal 1, Proposal 2** (max 3) in reply per `make-proposals` template;
   - Write same content to `docs/proposals/proposal-[slug].md` (**dual-proposal draft**, header `**Status:** Pending selection`).
5. **Done:** Proposals shown in reply and draft file written.
6. **Forbidden:** Call `/create-proposals`, `/make-plan`, or write an implementation plan in this step.

### 3. User selection (summary → `AskUserQuestion` → persist)

Sub-steps **3a summary**, **3b AskUserQuestion**, **3c persist** — **strict order**; user **need not open** `docs/proposals/proposal-*.md` to choose.

#### 3a. Selection summary (in the same reply **before** AskUserQuestion)

Before AskUserQuestion, present **self-contained** content in the reply (from step 2 proposals; **do not** say “see proposal doc” only):

1. **One-line requirement recap** (≤2 sentences): what this run solves and boundaries.
2. **Comparison table** (Markdown; suggested columns):

   | Dimension | Proposal 1 `<title>` | Proposal 2 `<title>` | (Proposal 3 if any) |
   |-----------|------------------------|----------------------|---------------------|
   | Core approach | … | … | … |
   | Main change scope | … | … | … |
   | Pros | … | … | … |
   | Cons / risks | … | … | … |
   | Effort (rough) | S/M/L | S/M/L | … |
   | Best for | … | … | … |

3. **Key differences** (3–6 bullets): in plain language what A vs B delivers; trade-offs.
4. **Recommendation** (required):
   - State: **Recommend: Proposal N – `<title>`**
   - **Why** (2–4 sentences): project constraints (reuse, blast radius, release risk, research fit); if close, when to pick the other.
5. **Selection hint** (1 sentence): next step uses multiple choice; optional adjustment notes; full detail in `docs/proposals/proposal-[slug].md`.

**Done 3a:** Items 1–5 complete; user can decide without opening the proposal file.

**Forbidden 3a:** Replace comparison/recommendation with “see proposal”; call AskUserQuestion before 3a completes.

#### 3b. User confirmation (`AskUserQuestion`)

1. **Must** call **AskUserQuestion** in the **same reply** after 3a, at least:
   - **Chosen proposal:** option labels match step 2 titles (e.g. `Proposal 1 – xxx` / `Proposal 2 – xxx`); **default/preselect** the 3a recommendation if supported.
2. **Suggested** second question (optional free text):
   - **Adjustments:** what to change, keep, or constrain vs the chosen proposal.
3. If the user **already stated** choice and adjustments in the initial message, still complete **3a**, then AskUserQuestion **to confirm** (options match their text); **do not** skip 3a or 3b.
4. **Done 3b:** Chosen proposal recorded; adjustments recorded or “no extra adjustments”.

#### 3c. Persist selection record

Write full 3a + 3b final choice + adjustments to **`{deliverables_root}/[slug]/_artifacts/02-selection.md`**.

**Forbidden:** Enter step 4 before 3a, 3b, 3c complete.

### 4. `/create-proposals`

1. **Fully follow** `create-proposals` (`~/.cursor/commands/create-proposals.md`).
2. Input: step 2 dual-proposal doc + step 3 choice and adjustments.
3. **Output:** `docs/proposals/proposal-[slug].md` (**confirmed single proposal**, `**Status:** Confirmed`; overwrites step 2 draft).
4. **Done:** File on disk; reply with path and 3–5 bullet summary.
5. **Forbidden:** Call `/make-plan` or write implementation plan here.

### 5. `/make-plan`

1. **Fully follow** `make-plan` (`~/.cursor/commands/make-plan.md`).
2. Use project `@design_doc_template.md` structure.
3. **Output:** `docs/plans/plan-[slug].md` (per template `desired_location` or project convention).
4. **Done:** Plan file written; **no business code changes**.
5. **Forbidden:** Modify business code or run implementation tests here.

### 6. `/implement`

1. **Fully follow** `implement` (`~/.cursor/commands/implement.md`) TDD flow.
2. Input: step 5 plan + step 4 confirmed proposal.
3. **Must persist** (not chat-only):
   - **`_artifacts/05-implement-report.md`**: features, changed files, test coverage, notes;
   - **`_artifacts/05-unittest.md`**: `go test` (or project equivalent) commands, **full terminal output**, pass/fail counts.
4. **Done:** All unit tests green; both files on disk.
5. If tests not all green: **do not** enter steps 7 or 8; fix and update both reports first.

### 7. `/code-review`

1. **Fully follow** `code-review` (`~/.cursor/commands/code-review.md`).
2. **Scope:** all code/test changes from step 6 vs step 4 proposal and step 5 plan.
3. **Must persist:** **`_artifacts/06-code-review.md`** (function/quality/security, blockers & priority, conclusion: pass / needs changes).
4. **Done:** Review file written; conclusion summary in reply.

### 8. Merge delivery and archive (final step; cannot skip)

Run after step 6 tests all green and step 7 complete.

**AxeCoder:** Equivalent to **`/summary`** (builtin `summary.md`); **do not** invent other slash names; output **`[slug]-交付总结.md`** (not the word `/summary` itself).

#### 8a. Archive working copies

**Move** (not copy) to `{deliverables_root}/[slug]/_artifacts/`:

| Source | Target (example) |
|--------|------------------|
| `docs/proposals/proposal-[slug].md` | `_artifacts/proposal-[slug].md` |
| `docs/plans/plan-[slug].md` | `_artifacts/plan-[slug].md` |

Keep existing `_artifacts/`: `00-requirements.md`, `02-selection.md`, `05-*.md`, `06-code-review.md`.  
After move, **remove** this run’s copies from `docs/proposals/` and `docs/plans/` (avoid drift).

#### 8b. Generate merged document

Read all relevant `.md` under `_artifacts/`; write **`{deliverables_root}/[slug]/[slug]-交付总结.md`**.

Header metadata (YAML or Markdown table): task name, completion date, selected proposal, review conclusion, all tests green.

Body **must** include (in order; merge source bodies, dedupe headings, keep substance):

1. **Overview** — one-line requirement, run goal, selection (recommended vs final), deliverables layout  
2. **Requirements clarification** — from `00-requirements.md` (goals, scope, acceptance summary)  
3. **Proposal** — from confirmed `proposal-[slug].md` (status, key decisions, impact)  
4. **Selection process** — from `02-selection.md` (comparison summary + user choice & adjustments)  
5. **Implementation plan** — from `plan-[slug].md` (phases & tasks; truncate with “full text in _artifacts” if long)  
6. **Implementation notes** — from `05-implement-report.md`  
7. **Unit test execution** — from `05-unittest.md` (commands, summary, failures; all green or not)  
8. **Test report** — functional/boundary/manual/integration (if implement omitted, mark “TBD”)  
9. **Code review** — from `06-code-review.md`  
10. **Change list** — table: path | change type (add/modify/delete) | one-line description  
11. **Open items & follow-ups** — out of scope, tech debt, release checklist  
12. **Appendix: artifact index** — list `_artifacts/` files with relative links  

Merge **from facts** (test output, review conclusions); do not invent; separate sections with `---`.

#### 8c. Done criteria

- `[slug]-交付总结.md` on disk with all sections;  
- intermediates under `{deliverables_root}/[slug]/_artifacts/`;  
- reply includes merged doc path + `_artifacts` tree.

**Forbidden:** Claim “rppit pipeline complete” before step 8 finishes.

---

## Pipeline rules

- **One step, one checkpoint:** End each step with `✓ Step N complete` and key artifact paths before the next step.
- **AskUserQuestion:** Every sub-step in step 0 (0a–0f) and step 3b **must** call `AskUserQuestion`; do not skip or ask multiple questions in one turn in step 0 (see above).
- **Mode:** Stay in **agent** mode (set in step 1) unless a sub-command requires plan mode and SwitchMode is available.
- **Scope:** Minimal changes for this requirement; follow project `.cursor/rules` and `CLAUDE.md` (e.g. do not modify `hzp_*`, `zhongzhi/`, or access `files/`).
- **Language:** Replies and deliverable docs use **English**.
- **Artifacts:** Besides sub-command paths `docs/proposals` and `docs/plans`, do not skip persist requirements for steps 1d, 3c, 6, 7, 8.

## Final reply structure

After **step 8**, summarize with this structure (do not omit):

1. **Task & paths:** `[slug]`, `{deliverables_root}/[slug]/`, merged doc path  
2. **Requirements clarification:** `00-requirements.md` highlights  
3. **Candidate proposals:** step 2 highlights (or `_artifacts/proposal-*.md` path)  
4. **Selection:** 3a recommendation + final choice + adjustments → `02-selection.md`  
5. **Confirmed proposal:** summary + `_artifacts/proposal-[slug].md`  
6. **Plan:** summary + `_artifacts/plan-[slug].md`  
7. **Implementation & tests:** `05-implement-report.md` / `05-unittest.md` highlights, all green or not  
8. **Review:** `06-code-review.md` conclusion + follow-ups  
9. **Merged delivery:** `[slug]-交付总结.md` path + section outline  
10. **Archive:** `_artifacts/` file list  

Honor extra constraints the user added after the command (branch, skip modules, custom archive root, etc.) throughout the pipeline.
