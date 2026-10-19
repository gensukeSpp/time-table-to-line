# Overview — 'closed' のマイルストーンのイベント参照

## 目的

「閉じたマイルストーン」について、**何を完了して closed としたか**を後から確認できるようにする。closed マイルストーンの達成日を新しい順に一覧し、そのマイルストーンに属する「完了」イベントのタイトル・担当スタッフ・グループ・終了日時を 3 段のアコーディオンで辿れる UI を Timeline 画面に追加する。

## ユーザーストーリー（Issue #41 より）

1. 「閉じたマイルストーン」ボタンをクリック
2. 右スライドが現れ、`closed` のマイルストーンの「タイトル」と「達成日」の一覧が（達成日基準で）**降順**に表示
3. 開示後、`progress` の**「完了」イベント（のタイトル）のみ**をアコーディオンリストで表示
4. 表示イベントを開示すると、3 つのデータ（`staff_id` / グループ名 / `end_time`）を表示

## スコープ

### スコープ内

| カテゴリ | やること |
|---------|--------|
| バックエンド | **`GET /milestone/closed`（新規、admin 限定）** を追加。`status == closed` を `accomplished_date` 降順（NULL は末尾）で返す |
| フロント共通 | `milestoneKeys.closed()` / `closedEvents(id)`、`fetchClosedMilestones` / `fetchClosedMilestoneEvents`、`useClosedMilestonesQuery` / `useClosedMilestoneEventsQuery`、pure helper `filterCompletedEvents` / `formatAccomplishedDate` |
| フロント UI | `ClosedMilestoneDrawer`（右 Drawer + 3 段アコーディオン）、`MilestoneClosedButton`（admin のみ、「マイルストーン作成」ボタンの下）、`TimelinePage` のツールバー配線 |
| 共通スタイル | 三点リーダー → 2 行表示の clamp スタイルを `molecules/clampText.css.ts` へ抽出し、Issue #40 の Drawer と共有（DRY） |

### スコープ外

- closed 一覧の枠線＋スムーズなアニメーション（Issue 本文で**打ち消し線**済み → 当初は実装しない方針）
  - **追補（2026-10-19 実ブラウザ確認後）**: ユーザー要望により**開閉アニメーションのみ追加**（Mantine `Collapse` 200ms ease = Issue #40 の Accordion 相当）。枠線・矢印アイコンは未実装のまま。
- open / waiting マイルストーンのイベント参照（Issue #40 で実装済み）
- `GET /milestone/closed/{milestone_id}/events` の権限変更（**admin のまま**）
- マイルストーン CRUD・詳細モーダル・イベント編集（既存のまま）

## 前提・依存

- `GET /milestone/all` は open + waiting のみを返すため、**closed 一覧は取得できない**（`light_token_server/app/routers/timetable.py:286-294`）。→ 決定 D1 で新規エンドポイントを追加する。
- `GET /milestone/closed/{milestone_id}/events` は実装済み。レスポンスは `EventORM.to_milestone_dict()` + `group_name`（Issue #40 で付与）。キーは `id / staff_id / group / group_name / start / end / title / progress / milestone_id / completed`（`summary` は返さない）。
- closed 化の経路は 2 つあり、**`accomplished_date` が NULL の closed が存在し得る**:
  1. 自動 close（`app/jobs/close_milestones.py`）: waiting から closed。`accomplished_date` あり
  2. `DELETE /milestone/remove/{id}`: 作成ミス用の即時 close。`accomplished_date` は **NULL のまま**
- フロントは `@mantine/core` v7（`Drawer`）、日付は date-fns のみ（AGENTS.md の統一ルール）。
- 管理者判定は `/timetable/inquiry` 由来の `AuthInfoProp{type:'auth'}.admin`（`useAuthInfo()`）を使う。イベントの `admin` フラグは常に false なので使わない。
- バックエンドのテスト実行は `.venv/bin/python -m pytest`（`.python-version` の pyenv 3.13 が未インストールのため素の `python` は失敗する）。

## リスク

1. **`accomplished_date` NULL の closed が一覧の先頭に来ると「達成日なし」だらけになる** → 並び順は `accomplished_date IS NULL` を第 1 キーにして NULL を末尾へ固定（D2）。表示は「達成日なし」。
2. **`/milestone/closed` と `/milestone/closed/{id}/events` のルート衝突** → パスセグメント数が異なるため衝突しない。ただし新規ルートは closed events の**直前**に置き、既存ルートの解釈を変えないこと。
3. **重複した clamp 実装** → Issue #40 の `MilestoneEventsDrawer.css.ts` と同一スタイルが必要になるため、`molecules/clampText.css.ts` に抽出して両者で共有（コピペしない）。
4. **`useClosedMilestoneEventsQuery` の N+1 的フェッチ** → マイルストーン行を開いた時だけ `enabled` で取得（Drawer を開いただけでは全マイルストーン分を叩かない）。
5. **非 admin への情報漏れ** → ボタンを `admin` でゲートし、バックエンドも 403 で二重に防御（フロントの出し分けだけに依存しない）。
6. 共有 CSS 抽出で Issue #40 の Drawer が壊れる可能性 → clamp クラス名を変えず、import 先のみ変更。既存テスト（`MilestoneEventsDrawer.test.tsx`）はクラス名に依存しない。

## 完了条件

- `bun run build`（tsc + vite）0 エラー
- `bun run lint`（--max-warnings 0）0 error / 0 warning
- `bun run testrun` 全 PASS（新規 spec / test 含む）
- バックエンド `.venv/bin/python -m pytest tests/test_milestone.py -q` 全 PASS（新規 4 件含む）
- 実ブラウザ確認（管理者 / 一般ユーザー）: 一般ユーザーにはボタンが出ない／管理者は 3 段アコーディオンを辿れる（test-plan.md §3）
