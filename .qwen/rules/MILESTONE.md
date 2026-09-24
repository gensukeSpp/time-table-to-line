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

- open / waiting / closed（`MilestoneStatus` 型、`src/lib/TimelineType.ts`）
- open: 作成直後の状態。`accomplished_date` を入力すると **waiting**（waiting for close）になり、猶予期間（`VITE_MILESTONE_CLOSE_GRACE_DAYS`、**既定 5 日**（2026-09-08 正式採用、当初「仮 2 日」→ PR #26 / task-11-FE で環境変数化））中は再 open 可能
- closed: 猶予期間経過後に確定。一度 closed なら再 open 不可
   - **自動 closed は backend の APScheduler（FastAPI lifespan 起動、`light_token_server`）が猶予期間経過を定期判定して確定**（task-11）。判定境界は `accomplished_date + GRACE_DAYS <= today`（`<=` 採用・当日確定）。フロントは `useMilestonesQuery` の `refetchInterval`（既定 60 分、`VITE_MILESTONE_REFRESH_INTERVAL_MS`）で反映
- `completed` は closed に連動して自動 True — **未実装（方針として変更しない）**。task-11 の決定事項で「自動 closed では子イベント `completed` は変更しない」と確定

## テーブル定義

- `M_MILESTONE`: id, staff_id(FK), title(100), description(256, nullable), color(10), status(String(10), default=open), created_at, guideline_end_date(Date?, nullable), accomplished_date(Date?, nullable)
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

### 実装済み（PR #19 / Issue #18）

- `MilestoneStatus` 型追加（`'open' | 'waiting' | 'closed'`）、`guidline_end_date` → `guideline_end_date` スペル修正（`src/lib/TimelineType.ts`）
- 猶予日ユーティリティ: `MILESTONE_CLOSE_GRACE_DAYS = 2`（仮）、`getMilestoneClosedAt` / `formatClosedLabel`（`src/lib/milestone.ts`、`src/lib/milestone.spec.ts`）
- `useUpdateMilestoneMutation`（POST `/milestone/update/{id}`）/ `useRemoveMilestoneMutation`（DELETE `/milestone/remove/{id}`）追加（`src/hooks/useMilestoneMutation.ts`）
- コンポーネント新規: `MilestoneDetailDialog`（作成者名・グループ名は読取専用、タイトル/説明/ガイドライン終了日/達成日は編集可、更新で API 反映・成功時 close。削除ボタンなし）、`MilestoneListTitle`（タイトルクリック可能、waiting 時「MM/dd close」を gray 表示）
- `MilestoneList` のフィルタを `status !== 'closed'` に変更、タイトルクリックで詳細モーダルを開く（admin のみ）

### 実装済み（PR #24 / Issue #23、task-12、PR #26 / task-11-FE、PR #27 / task-13）

- **イベントのマイルストーン所属と配色（PR #24 / Issue #23）**: `InputItem.tsx`（Calendar の `AddChildForm`）に **open 状態のみ** を列挙するマイルストーンセレクト追加（「所属なし」→ `milestone_id: null`。所属解除の null 対応は backend `model_fields_set` で成立）。Timeline（`TimelinePage.tsx`）は `itemRenderer` 経由で所属マイルストーンの色で配色 ＋ waiting 時に `opacity: 0.7` 網掛け、readOnly 詳細に所属マイルストーン名表示。純粋ヘルパ `src/lib/milestoneLookup.ts` 新規（`buildMilestoneColorMap` / `buildMilestoneStatusMap` / `computeItemDecorations`）。**決定:** closed 所属イベントはデフォルト色 `#2196f3` のまま（`/milestone/all` に closed 含まず / YAGNI）
- **配色の永続化修正（task-12）**: 選択解除時にマイルストーン色が `#2196f3` へ戻る不具合を修正。`itemRenderer` の `ref` コールバックで `!important` 付き `background-color` を DOM へ直接適用（React の宣言的 style はライブラリの imperative 上書きに負けるため）。選択時は `itemContext.selected` を型追加し `#ffc107` を明示適用、`removeProperty` 不使用で透明化も防止
- **自動 closed の画面反映（PR #26 / task-11-FE）**: `useMilestonesQuery` に `refetchInterval` 追加（`VITE_MILESTONE_REFRESH_INTERVAL_MS`、未設定時 60 分）。猶予日数を `VITE_MILESTONE_CLOSE_GRACE_DAYS`（既定 5 日）として env 化し、`parseEnvPositiveInt()`（`src/lib/env.ts`）で不正値は既定値へフォールバック。`.env.example` 新規追加
- **マイルストーン詳細の全員閲覧化（PR #27 / task-13）**: 閲覧は管理者権限関係なく誰でも可能、変更（更新）は管理者のみを維持。`MilestoneListTitle` の admin ゲート撤廃、`MilestoneDetailDialog` は非管理者に「タイトル / ステータス / 説明 / ガイドライン終了日 / 達成日」の読み取り専用表示（optional は `?? '（なし）'` 等で fallback）。`EventDetailOverlay.css.ts` に `padding: '0.75rem'` 追加

### 未実装（次 Issue 以降）

- ~~closed の動作の実装（一覧からの除外・再 open 不可の確定処理）~~ → **解消（2026-09-11 / task-11 + PR #26）**: backend APScheduler による自動 closed と、フロントの `refetchInterval` 反映で確定。一覧からの除外は既存の `status !== 'closed'` フィルタで対応
- ~~closed による自動 `TimelineEventProps.completed` = True~~ → **方針として実装しない**（task-11 決定: 自動 closed では子イベント `completed` は変更しない）
- ~~マイルストーンと子イベントの紐付け（`InputItem.tsx` への所属セレクト追加）~~ → **解消（PR #24 / Issue #23）**: open マイルストーンの選択セレクト実装済み
- ~~マイルストーンに属するイベントへの配色~~ → **解消（PR #24 / Issue #23 + task-12）**: `itemRenderer` による配色・waiting 網掛け・選択解除時の色永続化まで実装済み
- ~~Calendar 側へのマイルストーン反映~~ → **解消（PR #24 / Issue #23）**: `InputItem.tsx` のマイルストーンセレクトで反映済み

## 実装範囲（当初計画）

| カテゴリ | やること |
|---|---|
| バックエンド | `app/models.py`, `app/schemas.py`, `app/routers/timetable.py` に `/milestone/*` CRUD 追加。既存スキーマに `milestone_id` optional 追加 |
| フロント共通 | `TimelineType.ts` に Milestone 型定義 + `TimelineEventProps` 変更。TanStack Query: `/milestone/add`, `/milestone/all`, `/milestone/update`, `/milestone/remove` |
| フロント Calendar | イベント追加フォームに open なマイルストーン選択セレクト追加 |
| フロント Timeline | マイルストーン作成ボタン/フォーム、所属イベントの色指定、open 一覧配置、詳細モーダル |