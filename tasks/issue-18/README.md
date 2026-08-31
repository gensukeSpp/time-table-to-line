# Issue #18 — マイルストーン内容の更新と削除（フロントエンド）

> **紐付け元:** GitHub Issue #18 `[Feature]マイルストーン内容の更新と削除`
> **共有要件:** [`requirement-03.md`](../../requirement-03.md)（フロント / バックエンド共通）
> **スコープ方針:** 本 Issue は**フロントエンドのみ**。バックエンドは別途（ユーザー自身 / 別ブランチ）で対応済みとみなし、**想定する API 契約を `architecture.md` §2 にドキュメント化**する。

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`architecture.md`](./architecture.md) | 型定義・想定 API 契約・TanStack Query / コンポーネント配置の設計 |
| [`overview.md`](./overview.md) | Issue 概要・スコープ内外・依存・前提・リスク |
| [`tasks.md`](./tasks.md) | 実装タスク（1〜7）の詳細 |
| [`test-plan.md`](./test-plan.md) | 単体テスト / リンター / 実ブラウザ確認の検証計画 |

## この Issue のスコープ（再掲）

**スコープ内（更新と削除・waiting 表示）**
1. `MilestoneProps.status` を `boolean` → `'open' | 'waiting' | 'closed'` に変更（型変数導入）
2. マイルストーンタイトルのクリックで出現する詳細(更新)モーダルを実装
3. 詳細モーダル表示項目: 作成者名 / グループ名（読み取り専用）+ タイトル・説明・ガイドライン終了日・達成日（編集可）
4. `/milestone/update/{id}` を叩く更新処理（TanStack Query）
5. `status: 'waiting'` のマイルストーンを一覧に残し、「色バー」と「タイトル」の**間**に「closed となる日付(MM/dd)」と「close」を gray 文字で挿入
6. `status: 'waiting' -> 'closed'` で一覧から消える**テスト**（`/milestone/remove/{id}` を叩く TanStack Query。削除ボタンは**設置しない**）

**スコープ外（本 Issue ではやらない）**
- 猶予期間の実値（`closed` になる日数）は未定 → フロントは**仮のプレースホルダ定数**で表現し、TODO 明示
- バックエンドの修正（`/milestone/update` が編集項目 / `waiting` を受け付ける等）は本 Issue の対象外（前提契約を文書化のみ）

## 受け入れ要件（Issue #18）

1. 詳細モーダル表示で、作成者とグループ名が数値（`staff_id`, `group`）でないこと（名前・グループ名文字列として表示）
2. `status: 'waiting'` で、適切な対象マイルストーンに「〇〇/〇〇 close」が表示されること
3. 実装要件 6（waiting → closed で表示が消える）のテストが Pass すること
