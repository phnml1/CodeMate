# CodeMate - Codex Working Notes

This file is the Codex-facing companion to `CLAUDE.md`.

## Page Structure

- Keep `app/**/page.tsx` as server components when possible.
- Put client state and event logic in dedicated client components such as `*Client.tsx`.
- Split page concerns by feature and keep components under `components/<feature>/`.

## GitHub Workflow

- When creating issues, follow `.github/ISSUE_TEMPLATE/*`.
- For hotfix issues, use the title format `hotfix: 한글제목`.
- When creating pull requests, follow `.github/pull_request_template.md`.
- Prefer small, focused PRs with the correct base branch for the actual diff scope.

## Branch and Commit Naming

- Hotfix branch format: `hotfix/<issue-number>-<change-slug>`.
- Write intentional commit messages with conventional prefixes such as `fix:` or `hotfix:`.

## Notes

- Check for existing local changes before branching or committing.
- Avoid mixing unrelated workspace changes into GitHub work.

## Implementation Requests

- When the user asks to "implement", including short Korean implementation requests, default to actually making the code changes unless they explicitly want only an explanation.
- In the final response for implementation work, clearly list which existing files were changed.
- Provide the full updated code for every changed file, not partial snippets.
- Explain the reason for each file change based on the code.
- If multiple files changed, organize the explanation and code file-by-file.
- Prefer refactors that make the resulting structure easier to follow, and mention any folder or structure changes when they help.
