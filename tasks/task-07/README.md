# Task 7 拡張: リファクタリング Phase A–F

> **紐付け元:** [`tasks/06-07-type-errors-and-component-refactoring.md`](../06-07-type-errors-and-component-refactoring.md) — Task 6（Theme.ts 削除 + console.log 一掃）および Task 7（コンポーネント移動）完了後の後続リファクタリング工程。
>
> **戦略文書:** `.hermes/plans/2026-07-28_215000-post-task7-refactoring-phases.md`（Phase 分割の根拠・リスク評価）

## Phase 一覧

| Phase | 内容 | 実行方式 | ファイル |
|-------|------|---------|---------|
| **A** | コードベースクレンジング（未使用ファイル・型・コメント一掃） | subagent 並列 | [`phase-a-codebase-cleansing.md`](./phase-a-codebase-cleansing.md) |
| **B** | ESLint 安全性回復（無効化ルールを段階的に再有効化） | 対話（手動） | [`phase-b-eslint-recovery.md`](./phase-b-eslint-recovery.md) |
| **C** | クエリ層重複排除（queries.ts の 3 重複統合） | subagent | [`phase-c-query-consolidation.md`](./phase-c-query-consolidation.md) |
| **D** | 型安全性向上（ESLint error 化 + fetch 共通化） | 対話（手動） | [`phase-d-type-safety.md`](./phase-d-type-safety.md) |
| **E** | バグ調査（11PM / 重なり / タイムゾーン） | subagent 並列 | [`phase-e-bug-investigation.md`](./phase-e-bug-investigation.md) |
| **F** | 品質ゲート（lint / build / test 最終確認） | 対話 | [`phase-f-quality-gate.md`](./phase-f-quality-gate.md) |

## 推奨実行順序

```
Phase A ──→ Phase B ──→ Phase D ──→ Phase F
              │              ↑
              └── Phase C ────┘
                    │
              Phase E（いつでも可）
```

**太線 = 直列依存あり。** 点線 = 並行可能。

## 開始条件

- `git status` がクリーン（Task 6 と Task 7 のコミットが済んでいる）
- `bun run build` が 0 error
- `bun run lint` が 0 error, 0 warning
- `bun run testrun` が全 PASS