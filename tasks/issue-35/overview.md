# Issue #35 — overview.md

## 目的
#30 で 'month' ビューのフルデイイベントを `#00695c` にして「操作可否」を視覚化した。今回は **'week' ビュー**で、イベントの進捗（`TimelineEventProp.progress`）によって配色を分け、一目で進捗状況を把握できるようにする。将来の「マイルストーン → イベント参照」における視覚的分類にも役立てる。
'week' ビューではフルデイイベントはデフォルト色 `#3174ad` に一旦戻し、進捗のみを配色の軸にする。

## ユーザーストーリー
- ユーザーはタイムテーブル（'week' ビュー）で、イベントの色を見るだけで進捗（これから / まだ / もうすぐ / 完了 / 未設定）を判別できる。
- 'month' ビューで追加したフルデイイベントも、'week' ビューでは進捗に応じた色で表示される。
- イベントを編集し「更新」すると、その表示イベントの色が即座に対応色へ変わる。

## スコープ
### 対象
- 'week' ビュー（Calendar / react-big-calendar）のイベント配色
- `progress` → 色 の純関数（`src/lib/progressColor.ts` 新規）
- `CalendarView.tsx` への `eventPropGetter` 配線、`CalendarView.css.ts` の `.rbc-event-allday` 固定色削除

### 対象外
- 'month' ビュー配色（`#3174ad` / `#00695c` のまま）
- 進捗値の**保存形式の是正**（`InputItem` がラベル文字列を value として保存する現仕様そのもの。本タスクでは色変換関数が両表現を正規化して吸収し、是正は別タスク扱い）
- タイムライン側配色
- バックエンド

## 前提・依存
- rbc 1.20.0 / `react-big-calendar`。`eventPropGetter` の inline style が月・週の全デイ行・時間列すべてに適用されることをソースで確認済み。
- `isFullDayEvent` / `shouldBlockMonthDnd`（`src/lib/slot.ts`）は既存そのまま利用。
- 進捗値の現状: バックエンドは不透明文字列（`progress: str | None`）で保存。編集フォーム（`InputItem.tsx:118-123`）は **ラベル**（これから / まだ / もうすぐ / 完了）を value として保存する一方、テストフィクスチャ等では**英字トークン**（`from now` / `still` / `almost` / `complete`）も存在（`options` の `value`）。→ 色変換は両表現を扱う。

## リスク・トレードオフ
1. **進捗 4 色の選定（高）** — 「青の強い紫 → 赤の強い紫」のグラデーションだが、進捗色はマイルストーン色（`#9c27b0` 等の紫系統）や `#3174ad` / `#00695c` と紛らわしくしない必要がある。候補パレットを提示し**ユーザー確認**を得る（architecture.md / test-plan.md）。
2. **`.rbc-event-allday` の固定 CSS 削除** — 月ビュー多日跨ぎイベント（`diff>1`、`isFullDayEvent` 判定外）は従来 teal だった。`isMonthAllday = isFullDayEvent || !isSameDay` で同色（`#00695c`）を再現し回帰ゼロを保つ（architecture.md）。
3. **進捗値の正規化** — 日本語ラベル／英字トークン両方に対応し、未知値はデフォルト `#3174ad` にフォールバック（エラーを出さない）。
4. **クライアント状態即時反映** — `eventPropGetter` は render ごとに再評価されるため、「更新」後の即時反映は追加実装なしで担保される。

## 完了条件（Done）
- [ ] 'week' ビューで、進捗なしフルデイイベントが `#3174ad` で表示される
- [ ] 'week' ビューで、進捗 4 段階がそれぞれ異なる色で表示される
- [ ] 'month' ビューは引き続き `#3174ad` / `#00695c` のみ（進捗配色が混ざらない）
- [ ] 'month' で追加したイベントが 'week' で進捗配色になる
- [ ] イベント「更新」で表示色が即時反映される
- [ ] `bun run testrun` / `bun run lint` / `bun run build` が全て緑
- [ ] 実ブラウザ確認（user）で進捗配色が視認できる
