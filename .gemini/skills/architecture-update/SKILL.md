---
name: architecture-update
description: Generates high-level architecture snapshots comparing the current branch with main and documents them in docs/architecture.
---
# Skill: Architecture Update
...
This skill automates the process of generating high-level architecture snapshots for the project.

## Workflow

1. **実装確認:**
   - `tasks/` 以下の該当Issue/タスクの `README.md` を読み、完了条件（Done）が全て満たされているか確認する。
   - 満たされていない場合は、実装タスクを優先し、このスキルの実行を中断する。

2. **Identify Changes:**
   - Determine the base branch (usually `origin/main`).
   - Run `gh pr view` to fetch PR details. If CLI access is restricted or fails, use the PR URL to inspect changes manually via the browser or `web_fetch`.
   - Run `git diff --name-status origin/main` to get an accurate list of Added (A), Modified (M), and Deleted (D) files.
   - Run `git diff origin/main` to analyze the actual code changes for impacts and design decisions.
   - List commits between base and current head.
   - **Verification Requirement**: Before generating the snapshot, explicitly cross-reference the planned "Changed Files List" in the snapshot with the output of `git diff --name-status` to ensure accurate categorization of additions, modifications, and deletions.

3. **Generate Snapshot:**
   - Create a new file in `docs/architecture/` with the current date: `YYYY-MM-DD-architecture.md`.
   - Populate with:
     - Purpose (Brief explanation of changes).
     - Overview (Purpose, key shifts, core components changed. For SRP refactoring, limit to one line).
     - Dataflow (If applicable).
     - Key design decisions.
     - Next steps/improvements.
     - Commits list.
     - Changed files list (Verify against `git diff --name-status`).

4. **Update Registry:**
   - Update `docs/architecture/README.md` to include the new entry in the table.

## Usage
Run this skill when major architectural changes are committed to the codebase to maintain up-to-date documentation.
