# Architecture Snapshot: Closed Milestone Events Feature (PR #43 / Issue #41)

## Purpose
Issue #41 に基づき、**閉じた（closed）マイルストーン**の一覧と、その配下の **完了イベント**を管理者向けに右側 Drawer で参照する機能を実装しました（PR #43）。管理者は達成日が設定された予定どおりのクローズ済みマイルストーンに加え、削除 API 由来で `accomplished_date` を持たない closed も確認できます。3 段の開閉（マイルストーン行 → 完了イベント一覧 → イベントメタ情報）で、3 データ（`staff_id` / グループ名 / 終了日時）までたどれます。

## Overview
- **Backend integration**: `GET /milestone/closed` と `GET /milestone/closed/{milestone_id}/events` を追加。
  - 並び順は `accomplished_date` の降順。削除 API 由来（`accomplished_date` NULL）の closed は**末尾**に固定（`order_by(accomplished_date.is_(None), accomplished_date.desc())`）。
  - イベント取得は**全イベント**を返し、完了判定（`progress === '完了'`）はフロントで行う。
- **Frontend components**:
  - `MilestoneClosedButton`: 管理者のみ描画するボタン（`.adminBar` 内）。クリックで `ClosedMilestoneDrawer` を開く。
  - `ClosedMilestoneDrawer`: 右側 Drawer。3 段構成で閉じたマイルストーンを一覧表示。
    - 段 1（マイルストーン行）: カラーバー + タイトル + 達成日。クリックで段 2 を開閉（Collapse）。
    - 段 2（完了イベント一覧）: 「完了」イベントのみのアコーディオンリスト。
    - 段 3（イベントメタ情報）: chevron の開閉ボタン（`ActionIcon`）とタイトル（`UnstyledButton`）の双方で開閉し、Mantine `Collapse` の中に `staff_id` / グループ名 / 終了日時を表示。
- **Styling**: clamp（1 行/2 行三点リーダー）スタイルを `src/components/molecules/clampText.css.ts` に抽出し、Issue #40 の `MilestoneEventsDrawer` と共有（コピペ回避）。`flex: 1; minWidth: 0` を追加（後述の側面影響・既知の課題を参照）。

## 権限
- **二重防御（spec D6）**: 
  - バックエンド: `GET /milestone/closed` と `GET /milestone/closed/{id}/events` は JWT claims の `admin` を検証し、非 admin は `403`。
  - フロントエンド: `MilestoneClosedButton` は `admin` プロップが false のとき描画しない（admin ゲート）。
- 本機能は Issue #40（open/waiting 参照の権限緩和）とは異なり、**この closed 参照は管理者限定**を維持。

## 変更ファイル
- `src/components/molecules/clampText.css.ts` (Added — clamp 共有。`flex: 1; minWidth: 0` 追加、変更理由コメント)
- `src/components/organisms/ClosedMilestoneDrawer.tsx` (Added)
- `src/components/organisms/ClosedMilestoneDrawer.css.ts` (Added)
- `src/components/organisms/ClosedMilestoneDrawer.test.tsx` (Added)
- `src/components/organisms/MilestoneClosedButton.tsx` (Added)
- `src/components/organisms/MilestoneClosedButton.test.tsx` (Added)
- `src/components/organisms/MilestoneAddButton.css.ts` (Updated — 余白 `marginBottom: 1rem → 0`。親 adminBar の gap に一元化)
- `src/components/organisms/MilestoneEventsDrawer.tsx` / `.css.ts` (Updated — clamp 抽出に伴う import 変更、三点リーダー・イベントタイトル開閉の修正)
- `src/components/pages/TimelinePage.tsx` (Updated — `MilestoneClosedButton` を追加)
- `src/components/pages/TimelinePage.css.ts` (Updated — `adminBar`（管理者ボタンの縦積みコンテナ、gap 0.5rem）を追加)
- `src/lib/milestone.ts` (Updated — `formatAccomplishedDate` 追加)
- `src/lib/milestoneEvents.ts` (Updated — `filterCompletedEvents` 追加)
- `src/resources/cache.ts` (Updated — `milestoneKeys.closed()` / `closedEvents(id)` 追加、`invalidateMilestoneList` で closed も無効化)
- `src/resources/fetch.ts` (Updated — `fetchClosedMilestones` / `fetchClosedMilestoneEvents`)
- `src/resources/queries.ts` (Updated — closed 系クエリを既存ファイルへ追記。M)
- `src/resources/queries.spec.tsx` (Updated)
- `src/tests/milestone.spec.ts` (Added)
- `src/tests/milestoneEvents.spec.ts` (Added)
- `src/hooks/useEventMutation.ts` (Updated — 全 mutation の `onSuccess`/`onSettled` で `milestoneKeys.closed()` も無効化。指摘 #1 反映)
- `src/hooks/useEventMutation.test.tsx` (Added — closed キー無効化のテスト。指摘 #1 反映)

## 既知の課題
- **キャッシュ無効化（指摘 #1）**: `useEventMutation` の全 mutation（作成・削除・更新・日付更新）で `milestoneKeys.closed()` を無効化済み。`closed()` は `closedEvents(id)` のプレフィックスであるため、closed 一覧の無効化で closed イベントも連動する。※本機能の設計要点かつ、レビュー指摘 #1（当初は closed が無効化されていなかった）を反映済み。
- **共有 clamp スタイルの副作用（指摘 #2）**: `clampText.css.ts` に追加した `flex: 1; minWidth: 0` は Issue #41 の Drawer 用。Issue #40 側は `MilestoneEventsDrawer.css.ts` の `eventRow` に `display: flex; minWidth: 0` を追加して clamp の `flex: 1` が効くようにし、三点リーダー表示を修正した。今後の DOM 変更で挙動が変わり得るため、変更時は両コンポーネントの表示確認が必要。
- **日付のタイムゾーン解釈（指摘 #3）**: `formatAccomplishedDate` は `accomplished_date` の日付のみ文字列を `new Date(...)` で UTC 0 時として解釈する。ローカル時刻が UTC より東の JST 運用では問題なし（既存 `getMilestoneClosedAt` も同方式）。現状維持の方針。
- **アクセシビリティ（指摘 #4）**: 段 3 は chevron `ActionIcon` とタイトル `UnstyledButton` の両方が同じ開閉を行い、`aria-controls` を実イベントメタの `id` に紐付け済み。タイトル側にも `aria-label`・`aria-expanded` を付与した。
- **品質ゲート数値（指摘 #5）**: マージ前に `bun run testrun` / `lint` / `build` と light_token_server の pytest を再実行して記録する。

## 関連資料
- `specs/2026-10-19-spec.md`（決定 D1〜D7）
- `tasks/issue-41/`（実装計画・完了条件）
- Issue #41、PR #42（Issue #40 の Drawer / 三点リーダー）
- light_token_server PR #18（closed 一覧 API。本 PR のフロントはこれに依存するため**デプロイ順序**の確認が必要）