---
name: architecture-update
description: Generates high-level architecture snapshots comparing the current branch with main and documents them in docs/architecture.
---
# Skill: Architecture Update
...
This skill automates the process of generating high-level architecture snapshots for the project.

## Workflow

1. **厳格な実装確認（Mandatory Code Verification）:**
   - **注意**: `tasks/` 以下のタスクファイルやREADMEに「完了」と書かれていても、それを実装済みとして信用してはなりません。必ず以下の実体確認を行ってください。
   - 対象となるコンポーネントや変更ファイルのソースコード（`.tsx`, `.ts`）を実際に読み込み、スタブやTODOではなく、実コードとして実装されていることを自分の目で確認します。
   - ソースコードが未実装、または不完全な場合は、このスキルの実行を直ちに中断し、 **未実装箇所を報告** してください。
   - 満たされている場合のみ、次のステップ (3. Generate Snapshot → 4. Update Registry) へ進みます。

2. **Identify Changes:**
   - Determine the base branch (usually `origin/main`).
   - Run `git diff --name-status origin/main` to get an accurate list of Added (A), Modified (M), and Deleted (D) files.
   - Run `git diff origin/main` to analyze the actual code changes.
   - **Verification Requirement**: 変更されたファイルの実際のコード内容（Diff）を必ず確認し、推測でコードの挙動や設計を補完しないこと。不明な点がある場合は追加でファイルを読み込むこと。

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
