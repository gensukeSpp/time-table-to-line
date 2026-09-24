# 既知の問題点

> 更新頻度が高いため QWEN.md から分離。バグ修正・調査のたびに追記・更新する。

## タイムテーブル（react-big-calendar）

1. ~~**PM 11:00 にイベントが追加できない**~~ → **解消済み**（task-08 / E-1: `resolveSlotEnd` で end を endOfDay に丸め。PR #32 / Issue #29 以降、month ビューのフルデイは 0:00–23:59 に正規化）
2. **allDay が期待する箇所で 12:00 AM に追加される**（解決の記録なし・保留。現状は month フルデイが `rbc-event-allday` で週ビュー `.rbc-row` に描画されるため要再確認）
3. **DB 保存時刻が日本時間ではない** → **保留**（E-3 調査済み・通常は正しく動作するため。UI 上は期待通りに見えるが、DB テーブルの値が UTC 等になっている可能性）

## タイムライン（react-calendar-timeline）

1. ~~イベントの「重なり」表示ができない~~ → **解消済み**（task-09 / E-2、PR #8）

## 認証（401）

- ~~`/event/all`・`/refresh` への GET が繰り返し 401~~ → **解消済み**（task-10: 原因はフロントのトークン未送信。リクエスト共通処理に `Authorization: Bearer {token}` を付与して両方解消。backend 側の実装は仕様どおり正常）

## コード品質

- ~~`console.log` の残存（セキュリティリスク）~~ → **フロントは解消**（lint 0 warnings。テスト内 1 件のみ `eslint-disable-line no-console` 付き）。**backend 側は `light_token_server/tokens.py` に `print(...)` 残存**（task-10 備考・トークン先頭 10 文字 / シークレット先頭 5 文字を出力しており同様のセキュリティ観点あり、backend 整理時の作業候補）
- コメントアウトされた不要コード（残存確認中）
- ~~未使用の型・モジュール（`Theme.ts` など）~~ → **解消済み**（`Theme.ts` 削除、ESLint no-unused-vars で検出）
- ~~3 つの日付ライブラリ（moment / date-fns / dayjs）が混在~~ → **解消済み**（`src/` に moment / dayjs の import なし、date-fns のみ）
- ~~2 つの UI ライブラリ（Chakra UI / Radix UI）が混在~~ → **解消済み**（Mantine v7 のみ）