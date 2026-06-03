# todos
Use the SwitchMode tool to switch to plan mode.

Based on the design document, produce an executable development TODO plan that satisfies both of the following:

1. Show an interactive plan with a **Build** button in the chat (via Plan mode or the create_plan tool).
2. Save the exact same plan content as a Markdown file named `plans-todos-<feature-name>.md` at the project root or a user-specified location.

Steps:

- First use the `create_plan` tool to create a detailed, step-by-step development plan so it renders with a Build button in chat.
- Then export the full plan content to a Markdown file, ensuring the file matches the plan exactly.

Notes:

- This command should run in plan mode; otherwise create_plan may be unavailable.
- Each plan item should be an atomic task that can be built and verified independently.
- If file writes are allowed, complete them directly without asking for extra confirmation.
