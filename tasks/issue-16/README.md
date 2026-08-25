# Issue #16 — マイルストーン追加処理と表示（フロントエンド）

> **紐付け元:** GitHub Issue #16 `[Feature]マイルストーンの追加処理と表示`
> **共有要件:** [`requirement-03.md`](../../requirement-03.md)（フロント / バックエンド共通）
> **バックエンド実装:** `light_token_server/tasks/task-03/` にて `/milestone/*` は実装済み。本 Issue はフロントエンドからこれを叩く。

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`architecture.md`](./architecture.md) | 型定義と TanStack Query / コンポーネント配置の設計 |
| [`overview.md`](./overview.md) | Issue 概要・スコープ内外・依存・リスク |
| [`tasks.md`](./tasks.md) | 実装タスク（1〜9）の詳細 |
| [test-plan.md](./test-plan.md) | 単体テスト / リンター / 実ブラウザ確認の検証計画 |

## この Issue のスコープ（再掲）

**スコープ内（追加と表示まで）**
1. `TimelineEventProps` への属性追加（`milestone_id`, `completed`）+ `MilestoneProps` 型定義
2. マイルストーン追加ボタン（タイムライン上部右側、管理者のみ）
3. 追加モーダル（タイトル / 説明 / 目安日付）
4. `/milestone/add`, `/milestone/all` を叩く TanStack Query 実装
5. 追加ボタンの左に open 一覧（「タイトル: 色のバー」）を表示

**スコープ外（次 Issue 以降）**
- close 処理（`accomplished_date` 設定、`completed` 一括 True）
- 削除処理（`milestone_id` -> None）
- `InputItem.tsx` のイベントフォームへのセレクトボックス追加

## 受け入れ要件（Issue #16）

1. 追加にまつわる各コンポーネントの設置・呼び出しが行われる
2. マイルストーン追加で DB にレコードが追加される
3. 追加したマイルストーンが呼び出され、適切に表示される
4. 追加は管理者権限でのみ行える
5. どのグループでも同じマイルストーン一覧が表示される（グループ横断共有）