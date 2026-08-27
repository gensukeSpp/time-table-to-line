# 機能要件（マイルストーン）

イベントに対し、**長めのスパンでのタスク** を意味する「マイルストーン」を設置する。Github Issues の milestone + label（色分け）に近い概念。詳細は [`requirement-03.md`](../requirement-03.md) を参照。

## 概念

- 1 つのマイルストーンに複数のイベントが属する（属さないイベントもある）
- **グループのもの** と位置づけ、グループをまたいで共有する場合も考慮し **Timeline での操作** とする
- Calendar は個人用、Timeline はグループ用

## 権限

- マイルストーンの作成・close は **グループ管理者のみ**
- イベントからの所属選択は一般ユーザーも可能
- admin 判定は `/timetable/inquiry` レスポンス（JWT クレーム由来）の `admin` を `useAuthInfo().admin` で参照（PR #17 で実データベースに修正）

## 色

- 10 固定パターン: `#9c27b0 #009688 #795548 #607d8b #e91e63 #3f51b5 #00bcd4 #ff5722 #8bc34a #ff9800`
- 10 件超え時は 1 つ目から **同順でサイクル**
- デフォルトイベント色 `#2196f3` / クリック後色 `#ffc107` に近い色は避ける
- completed またはマイルストーン削除されたイベントはデフォルト色 `#2196f3` に戻す

## 状態

- open / closed。closed は `accomplished_date` を入力して確定。一度 closed なら再 open 不可
- `completed` は closed に連動して自動 True

## テーブル定義

- `M_MILESTONE`: id, staff_id(FK), title(100), description(256, nullable), color(10), status(bool, default=True), created_at, guidline_end_date(Date?, nullable), accomplished_date(Date?, nullable)
- `T_TIMELINE_EVENT` に追加: `milestone_id`(FK, nullable), `completed`(bool, default=False)

## UI 操作（Timeline 画面）

1. 管理者右上「マイルストーン作成」→ タイトル + 目安日付入力
2. タイムライン左上にカラーバー付きタイトル一覧表示
3. タイトルクリック → 詳細モーダル（作成者名, 説明(50文字折畳), 作成日, グループ名, 達成日）
4. 達成日入力・決定 → closed 表示。削除ボタンも追加（作成ミス用）

## 実装状況

### 実装済み（PR #17 / Issue #16）

- `TimelineEventProps` に `milestone_id` / `completed` 追加、`MilestoneProps` 型定義（`src/lib/TimelineType.ts`）
- `AuthInfoProp` に `admin: boolean` 追加（`src/lib/TimelineType.ts` / `src/lib/authPayload.ts` / `src/hooks/useAuthGuard.ts`）
- TanStack Query 配線: `milestoneKeys` + `useMilestoneCache`（`cache.ts`）、`fetchMilestones`（`fetch.ts`、GET `/milestone/all`）、`useMilestonesQuery`（`queries.ts`）
- `useAddMilestoneMutation`（`src/hooks/useMilestoneMutation.ts`、POST `/milestone/add`）
- コンポーネント新規: `MilestoneAddButton`（admin のみ表示）、`MilestoneCreateDialog`（タイトル・説明・目安日付）、`MilestoneList`（open 一覧、カラーバー + タイトル）
- `TimelinePage.tsx` に配置（toolbar: 左に一覧・右に追加ボタン）。admin 判定を `useAuthInfo().admin` に変更し、未使用の `useAuthContext` / `tokenContext` / `useAuthQuery` を整理
- `@mantine/dates` 追加（`DateInput` 使用）、`Timeline.stories.tsx` に `MantineProvider` + milestone mock 追加

### 未実装（次 Issue 以降）

- バックエンドに対する更新 / 削除機能（`/milestone/update/{id}` / `/milestone/remove/{id}` は backend 実装済み）
- マイルストーンと子イベントの紐付け（`InputItem.tsx` への所属セレクト追加）
- マイルストーンに属するイベントへの配色
- close（`accomplished_date` 設定 + 子イベント `completed` 一括 True）
- Calendar 側へのマイルストーン反映

## 実装範囲（当初計画）

| カテゴリ | やること |
|---|---|
| バックエンド | `app/models.py`, `app/schemas.py`, `app/routers/timetable.py` に `/milestone/*` CRUD 追加。既存スキーマに `milestone_id` optional 追加 |
| フロント共通 | `TimelineType.ts` に Milestone 型定義 + `TimelineEventProps` 変更。TanStack Query: `/milestone/add`, `/milestone/all`, `/milestone/update`, `/milestone/remove` |
| フロント Calendar | イベント追加フォームに open なマイルストーン選択セレクト追加 |
| フロント Timeline | マイルストーン作成ボタン/フォーム、所属イベントの色指定、open 一覧配置、詳細モーダル |