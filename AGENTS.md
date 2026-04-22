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
