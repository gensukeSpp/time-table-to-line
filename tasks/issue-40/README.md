# Issue #40 — 'open', 'waiting' 状態マイルストーンのイベント参照

> **紐付け元:** GitHub Issue #40 `[Feature] 'open', 'waiting' 状態マイルストーンの、イベントを参照`
> **親 Issue:** #39（マイルストーン機能全体）
> **共有要件:** [`requirement-03.md`](../../requirement-03.md)（マイルストーン機能、フロント / バックエンド共通）
> **既存前提:** バックエンドに `GET /milestone/{milestone_id}/events`（open + waiting、admin 限定）は実装済み（commit `074d863`, `light_token_server/app/routers/timetable.py:311-321`）。フロント側のイベント参照 UI は**未実装**。

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`overview.md`](./overview.md) | Issue 概要・ユーザーストーリー・スコープ内外・前提・リスク・完了条件 |
| [`architecture.md`](./architecture.md) | 型定義・API 契約・TanStack Query / コンポーネント配置・変更対象ファイル表 |
| [`tasks.md`](./tasks.md) | 実装タスク（TDD 形式、bite-sized、直列依存順） |
| [`test-plan.md`](./test-plan.md) | 静的品質ゲート / 単体テスト / 実ブラウザ確認 / 回帰 / リスク対応 |

## この Issue のスコープ（再掲）

**スコープ内**
1. 各マイルストーンタイトルの**右に** '...' ボタンを設置し、クリックでスライドパネルを表示
2. スライドパネル内に、指定マイルストーンへ所属する**イベント一覧**を **progress 別アコーディオン**で表示
3. 進捗 `null` のイベントは「**指定なし**」に分類
4. 各イベントは「タイトル（1 行、超過は三点リーダー → クリックで 2 行表示）」+「スタッフID / グループ名 / 開始日時」の 3 行
5. バックエンド `GET /milestone/{milestone_id}/events` に **`group_name` を付与**（`group_id → group_name` はフロントで引けないため委譲）

**スコープ外**
- マイルストーン自体の CRUD UI・詳細モーダル（済み / Issue #16/#18/#23）
- closed マイルストーンのイベント参照 UI（`/milestone/closed/{id}/events` は既存のまま、UI は本 Issue では作らない）
- イベント編集・所属変更（既存の仕組み）

## 受け入れ要件（Issue #40）

1. マイルストーンタイトル右の '...' をクリック → 右からスライドでパネルが出る
2. パネル内に、`progress` ごとの開閉ボタン付きアコーディオン（「これから」「まだ」「もうすぐ」「完了」「指定なし」）が表示される
3. 進捗 `null` のイベントは「指定なし」に分類される
4. アコーディオンを開くとイベント「タイトル」一覧が表示され、さらに「スタッフID」「グループ名」「開始日時」が各 1 行ずつ表示される
5. `title` が 1 行で収まらない場合三点リーダー(`text-overflow: ellipsis`)、クリックで 2 行表示(`-webkit-line-clamp: 2`)になる
6. 一般ユーザー（admin でない）もこの一覧を閲覧できる
