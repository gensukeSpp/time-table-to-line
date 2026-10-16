# Overview — 'open', 'waiting' 状態マイルストーンのイベント参照

## 目的

マイルストーン（グループ共通の長スパンタスク）に所属するイベントを、マイルストーンのタイトル一覧から直接閲覧できるようにする。進捗（progress）ごとにグループ化し、各イベントのタイトル / スタッフID / グループ名 / 開始日時を一覧表示する。

## ユーザーストーリー（Issue #40 より）

1. 各「マイルストーンタイトル」の右に設置したボタン '...' をクリック
2. 右からスライド → 指定したマイルストーンタイトル以下、各 `progress`（「これから」「まだ」「もうすぐ」「完了」と「指定なし」）の開閉ボタン付きアコーディオンリストが表示
3. 開閉ボタンから開示後、イベントの「タイトル」一覧が表示
4. タイトルのアコーディオンリストから、さらに「スタッフID」「グループ名」「開始日時」が表示

## スコープ

### スコープ内

| カテゴリ | やること |
|---------|--------|
| バックエンド | `GET /milestone/{milestone_id}/events` に `group_name` を付与。**閲覧権限を require_token のみに緩和**（一般ユーザー閲覧可能に） |
| フロント共通 | `MilestoneEventProps` 型追加、`fetchMilestoneEvents` + `useMilestoneEventsQuery`、query key 追加、`groupMilestoneEventsByProgress` 純粋ヘルパ |
| フロント UI | `MilestoneListTitle` に '...' ボタン、`MilestoneEventsDrawer`（Drawer + Accordion）、`MilestoneList` への配線 |

### スコープ外

- closed マイルストーンのイベント参照 UI（バックエンド `/milestone/closed/{id}/events` は既存のまま admin 限定、UI は作らない）
- イベントの編集 / 所属変更 / 削除（既存の仕組みのまま）
- マイルストーン CRUD 自体（`MilestoneCreateDialog` / `MilestoneDetailDialog` は既存のまま）

## 前提・依存

- バックエンド `GET /milestone/{milestone_id}/events` は実装済み（`light_token_server/app/routers/timetable.py:311-321`）。open + waiting のみ返却（Issue タイトル指定どおり）。
- `EventORM.to_dict()` のキーは `id / staff_id / group / start / end / title / summary / progress / milestone_id / completed`（`start_time` ではなく `start`）。
- `group_id → group_name` はフロントで解決**不能**（下記「決定 D1」）。`/group-names` は SHORTNAME の配列のみ（CODE 無し）、`/group/users` にグループ名はない。
- フロントは `@mantine/core` v7（`Drawer` / `Accordion` を利用）、日付は date-fns のみ。

## リスク

1. **閲覧権限の緩和により、一般ユーザーが他グループのイベントタイトルを閲覧できるようになる。** マイルストーン自体がグループ横断共有（requirement-03）であるため、所属イベントの表示も共有範囲として妥当。イベントの**編集は引き続き不可**（編集は既存の権限ロジックに従う）。
2. **既存テストの矛盾**: `light_token_server/tests/test_milestone.py::test_milestone_events_forbidden_for_non_admin` が「非 admin → 403」を assert している。緩和に伴い「非 admin → 200」へ**更新**する（付け足さず修正、DRY）。
3. `_get_milestone_events` は open/waiting 用と closed 用を共有。`group_name` をここで付与すると closed エンドポイントのレスポンスにも追加されるが、既存テストは追加フィールドを検証していないため回帰なし。closed の権限（admin）は**変更しない**。
4. 進捗ラベル / 英字トークンの正規化（`from now`→これから 等）は `src/lib/progressColor.ts` のマップと揃える。未知値は「指定なし」。

## 完了条件

- `bun run build`（tsc + vite）0 エラー
- `bun run lint`（--max-warnings 0）0 error / 0 warning
- `bun run testrun` 全 PASS
- バックエンド `pytest tests/test_milestone.py` 全 PASS（更新含む）
- 実ブラウザ確認（管理者 / 一般ユーザーの両方）で '...' → スライド → progress 別アコーディオン → イベント詳細行が表示される（test-plan.md §3）
