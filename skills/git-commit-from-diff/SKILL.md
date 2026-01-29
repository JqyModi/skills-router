---
name: git-commit-from-diff
description: "Generate a git commit message from the current diff and perform a local commit using the format `type: scope - subject`. Use when a user asks to create a commit based on git diff/status, or wants a commit message generated from current code changes and committed locally."
---

# Git Commit From Diff

## Overview

Inspect the current git diff to identify the changed module and intent, generate a commit message in the required format, then commit locally.

## Workflow

### 1) Inspect changes and decide what to commit

- Run `git status -sb` to see staged vs unstaged changes.
- If staged changes exist, base analysis on staged content: `git diff --cached --stat` and `git diff --cached`.
- If nothing is staged, inspect working tree: `git diff --stat` and `git diff`.
- If changes span unrelated areas, suggest splitting into multiple commits and ask which subset to commit.

### 2) Determine `type`

Pick the most fitting type (ask if ambiguous):

- `feat`: new user-visible functionality
- `fix`: bug fix
- `refactor`: code change without behavior change
- `perf`: performance improvement
- `docs`: documentation-only change
- `test`: tests only
- `style`: formatting only (no logic change)
- `build`: build system or dependencies
- `ci`: CI/CD configuration
- `chore`: maintenance tasks (configs, tooling, cleanup)

### 3) Determine `scope`

Scope should be the primary module, folder, or component affected.

- Use the top-level directory (e.g., `api`, `ui`, `auth`) or a clear subsystem.
- If multiple areas but still cohesive, use a broader scope like `core` or `shared`.
- Keep scope lowercase, short, and without spaces (use `-` if needed).

### 4) Write `subject`

Subject should be concise and imperative:

- Lowercase verb, no trailing period.
- Prefer <= 72 characters.
- Describe what changed, not why.

Examples:

- `feat: auth - add refresh token rotation`
- `fix: api - handle empty payload in webhook`
- `refactor: ui - simplify modal state handling`

### 5) Commit locally

- If no changes are staged and the user did not request otherwise, stage with `git add -A` (or add specific paths if the user indicates a subset).
- Commit with `git commit -m "type: scope - subject"`.
- If there are no changes, report that and stop.
