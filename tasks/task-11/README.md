# task-11 — PR #21（タイムライン詳細モーダル）の ts/tsx 限定部分的取り込み

> **対象ブランチ:** `release/merge-timeline-modal`（`origin/release` から切ったブランチ。PR #21 のマージ先 `main` とは別系統）
> **取得元:** `gh pr view 21` / `gh pr diff 21`（PR #21 `[Feature]タイムライン詳細モーダル (Issue #20)`、マージ済み）
> **本タスクの性質:** マージ（cherry-pick）ではなく、**PR #21 の最終差分から `*.ts` / `*.tsx` ファイルに限り、手動で該当コードを移植する**。
> PR #21 には devtools/, .github/reports/, docs/architecture/, specs/, tasks/issue-20/ などの
> 非 ts/tsx ファイルや release 系で不要な補助物が含まれるが、それらは**取り込まない**。

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`overview.md`](./overview.md) | 背景・PR #21 との差分の様相・前提・リスク |
| [`architecture.md`](./architecture.md) | 型・admin 伝播・AddChildForm 拡張・Timeline 組み込み・オーバーレイ配置の設計（本ブランチ向け調整込み） |
| [`tasks.md`](./tasks.md) | 実装タスク（Task 1〜6）の詳細・完了条件 |
| [`test-plan.md`](./test-plan.md) | 単体テスト / リンター / 実ブラウザ確認の検証計画 |

## PR #21 から取り込む ts/tsx ファイル（確定）

| ファイル | 取得元 (main) | 操作 |
|---------|--------------|------|
| `src/lib/authPayload.ts` | main 版 | **部分的編集**（`admin` フィールド追加のみ。本ブランチ側の normalizeAuthPayload 構造を保持） |
| `src/hooks/useAuthGuard.ts` | main 版 | **部分的編集**（`admin: payload.admin` 追加のみ） |
| `src/lib/TimelineType.ts` | main 版 | **部分的編集**（`AuthInfoProp` の auth 型へ `admin: boolean` 追加のみ） |
| `src/components/organisms/EventDetailOverlay.tsx` | main 版 | **新規作成**（全文コピー。最終形＝外クリック/Escape close 付き） |
| `src/components/organisms/EventDetailOverlay.css.ts` | PR #21 差分 | **新規作成**（全文コピー） |
| `src/components/organisms/InputItem.tsx` | main 版 | **部分的編集**（`readOnly` プロップ / メンバー名解決 / 読取専用分岐の追加） |
| `src/components/pages/TimelinePage.tsx` | main 版 | **部分的編集**（`computeOverlayPos` / `handleItemClick` / オーバーレイ描画の追加。Milestone 関連は本ブランチに存在しないため取り込まない） |
| `src/tests/InputItem.spec.tsx` | PR #21 差分 | **新規作成**（最終形＝ readOnly 無条件版） |
| `src/tests/EventDetailOverlay.spec.tsx` | PR #21 差分 | **新規作成**（全文コピー） |

### 取り込まない（スコープ外・非 ts/tsx）

- `.github/reports/pr-21-review.md`（レビュー記録）
- `devtools/review_worker.py` / `devtools/watch_reviews.sh`（Hermes レビュー自動化ツール）
- `docs/architecture/*` / `specs/*`（スナップショット・仕様書）
- `tasks/issue-20/*`（PR #21 側の計画書。本 task-11 が対応）

## 本ブランチとの様相の違い（なぜ cherry-pick でないか）

| 観点 | PR #21 (main) | 本ブランチ (release 系) |
|------|---------------|------------------------|
| マイルストーン工程 | 通過済み（MilestoneList / MilestoneAddButton あり） | **未通過**（`TimelinePage.tsx` に Milestone 関連コードなし） |
| 認証型 | `AuthInfoProp` auth 型に `admin: boolean` あり | **`admin` なし**（`useAuthGuard.ts` / `authPayload.ts` / `TimelineType.ts` すべて admin を持たない） |
| テスト整備 | 61 tests（`testrun` 全 PASS） | 6 spec ファイル（少ない） |
| 直接マージ可否 | — | **不可**（TimelinePage / InputItem / 認証系の base が異なり、競合・欠落が多発する） |

→ よって **ファイル単位・関数単位の移植** とし、`tasks/task-11/` に計画書を置いてから着手する。
