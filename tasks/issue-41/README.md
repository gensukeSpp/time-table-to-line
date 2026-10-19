# Issue #41 — 'closed' のマイルストーンのイベントを参照

> **紐付け元:** GitHub Issue #41 `[Feature] 'closed' のマイルストーンのイベントを参照`
> **親 Issue:** #39（マイルストーン機能全体）
> **共有要件:** [`requirement-03.md`](../../requirement-03.md)（マイルストーン機能、フロント / バックエンド共通）
> **既存前提:** バックエンドの `GET /milestone/closed/{milestone_id}/events` は実装済み（admin 限定、`light_token_server/app/routers/timetable.py:331-339`）。**closed マイルストーンの一覧 API は存在しない**（`GET /milestone/all` は open + waiting のみ）。フロント側の closed 参照 UI は**未実装**。
> **先行 Issue:** #40（open / waiting のイベント参照）で `MilestoneEventProps` / `useMilestoneEventsQuery` / `MilestoneEventsDrawer` と、行タイトルの三点リーダー → 2 行表示のパターンが確立済み。本 Issue はその 3 段構成パターンを closed 用に踏襲する。

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`overview.md`](./overview.md) | Issue 概要・ユーザーストーリー・スコープ内外・前提・リスク・完了条件 |
| [`architecture.md`](./architecture.md) | API 契約・型・TanStack Query・コンポーネント配置・変更対象ファイル表・決定事項 |
| [`tasks.md`](./tasks.md) | 実装タスク（TDD 形式、bite-sized、直列依存順） |
| [`test-plan.md`](./test-plan.md) | 静的品質ゲート / 単体テスト / 実ブラウザ確認 / 回帰 / リスク対応 |

## この Issue のスコープ（再掲）

**スコープ内**
1. **管理者のみ**に「閉じたマイルストーン」ボタンを表示（「マイルストーン作成」ボタンの**下**）
2. クリックで右スライド（Mantine `Drawer`）が開き、`closed` マイルストーンの「タイトル」「達成日」を**達成日基準の降順**で一覧表示
3. マイルストーン行をクリック → そのマイルストーン所属イベントのうち **`progress` が「完了」のものだけ**を（タイトルの）アコーディオンリストで表示
4. イベントタイトルをクリック → `staff_id` / グループ名 / **`end_time`** の 3 つを表示
5. 長いタイトルは 1 行三点リーダー → クリックで 2 行表示（マイルストーン行・イベント行の両方）

**スコープ外（Issue 本文で打ち消し線）**
- closed 一覧の「矢印アイコン無しの枠」＋スムーズなアニメーション（~~取り消し線~~ のため実装しない）

**スコープ外（本 Issue の対象外）**
- open / waiting マイルストーンのイベント参照 UI（Issue #40 で実装済み）
- マイルストーンの CRUD・詳細モーダル（既存のまま）
- 一般ユーザー向けの closed 閲覧（Issue 要件どおり管理者限定。既存 `GET /milestone/closed/{id}/events` の admin ゲートは**変更しない**）

## 受け入れ要件（Issue #41）

1. 管理者に対してのみ、ボタン表示
2. 3 段構成 — 開閉操作はマイルストーンタイトルとイベントタイトル
3. 長いマイルストーン・イベントタイトルに三点リーダー（クリックで 2 行）
4. closed 一覧は「タイトル + 達成日（タイトルより小さいフォント）」の一行表示
5. 達成日基準の降順で表示
6. イベント開示後は `staff_id` / グループ名 / `end_time` を表示
