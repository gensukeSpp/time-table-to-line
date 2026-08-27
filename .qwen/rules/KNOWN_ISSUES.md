# 既知の問題点

> 更新頻度が高いため QWEN.md から分離。バグ修正・調査のたびに追記・更新する。

## タイムテーブル（react-big-calendar）

1. **PM 11:00 にイベントが追加できない** → allDay 扱いになってしまう
2. **allDay が期待する箇所で 12:00 AM に追加される**
3. **DB 保存時刻が日本時間ではない**（UI 上は期待通りに見えるが、DB テーブルの値が UTC 等になっている可能性）

## タイムライン（react-calendar-timeline）

1. ~~イベントの「重なり」表示ができない~~ → **解消済み**（task-09 / E-2、PR #8）

## 認証（401）

- ~~`/event/all`・`/refresh` への GET が繰り返し 401~~ → **解消済み**（task-10: 原因はフロントのトークン未送信。リクエスト共通処理に `Authorization: Bearer {token}` を付与して両方解消。backend 側の実装は仕様どおり正常）

## コード品質

- `console.log` の残存（セキュリティリスク）
- コメントアウトされた不要コード
- 未使用の型・モジュール（`Theme.ts` など）
- 3 つの日付ライブラリ（moment / date-fns / dayjs）が混在 → date-fns に統一予定
- 2 つの UI ライブラリ（Chakra UI / Radix UI）が混在 → Mantine v7 に統一予定