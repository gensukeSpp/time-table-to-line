# Issue #35 — test-plan.md

## 1. 導入（進捗 4 色のユーザー確認）
実装前に、`architecture.md` の進捗パレット候補を**ユーザーに確認**する。受け入れ可否が付いたら色を確定し、`PROGRESS_COLORS` の値を反映する。
- 基準: ① 青の強い紫 → 赤の強い紫 の軸、② マイルストーン10色と衝突しない、③ `#3174ad` / `#00695c` と紛らわしくない、④ 白抜き文字が読める濃色。
- 確定後、本 test-plan の期待色ラベルを更新する。

## 2. 静的品質ゲート（全てのタスク完了後）
```bash
cd /home/nabu_dvl/workspace/the-calendar-to-timeline/time-table-to-line
bun run testrun   # 全テスト緑
bun run lint      # --max-warnings 0
bun run build     # tsc + vite build 0 error
```
Expected: 全て緑。

## 3. 単体テスト
### `src/tests/progressColor.spec.ts`（新規）
| 対象 | ケース | 期待 |
|---|---|---|
| `progressToColor` | `undefined` / `null` / `''` | `DEFAULT_EVENT_COLOR` |
| `progressToColor` | 日本語ラベル 4 段階 | 各 `PROGRESS_COLORS` |
| `progressToColor` | 英字トークン 4 種 | 各ラベルと同色（正規化） |
| `progressToColor` | 未知文字列 | `DEFAULT_EVENT_COLOR` |
| `isMonthAllday` | 同一日フルデイ / 日跨ぎ | `true` |
| `isMonthAllday` | 単日時間イベント | `false` |
| `resolveEventColor` | week + null | `undefined` |
| `resolveEventColor` | week + 進捗（ラベル/英字） | 対応色 |
| `resolveEventColor` | month + フルデイ（進捗あり/なし） | `MONTH_FULLDAY_COLOR` |
| `resolveEventColor` | month + 単日時間（進捗あり） | `undefined` |

### `src/tests/CalendarView.spec.tsx`（変更）
| 対象 | ケース | 期待 |
|---|---|---|
| `eventPropGetter` | week + 進捗あり | `style.backgroundColor` = 進捗色 |
| `eventPropGetter` | week + null フルデイ | `{}`（`backgroundColor` undefined → default） |
| `eventPropGetter` | month（`fireView` 後）+ フルデイ | `MONTH_FULLDAY_COLOR` |
| `eventPropGetter` | month + 単日時間 | `{}` で進捗配色なし |

## 4. 実ブラウザ確認（user）
前提: バックエンド（`light_token_server` 8000）起動、ログイン済み、週ビュー表示が可能なこと。
1. `bun run dev` で Calendar を 'week' 表示。
2. 進捗なしフルデイイベントが `#3174ad` であること（デフォルトへ戻る）。
3. 進捗「これから / まだ / もうすぐ / 完了」のイベントがそれぞれ 4 色で表示されること。
4. 'month' に切替え、フルデイ `#00695c`・時間 `#3174ad` のまま（進捗配色が混ざらない）こと。
5. 'month' でイベント追加 → 'week' に戻し、進捗を設定 → 対応色で表示されること。
6. イベント編集で進捗を変更し「更新」→ 表示イベントの色が即時反映されること。
7. マイルストーン色・`#3174ad` / `#00695c` と紛らわしくないこと（視認）。

## 5. 回帰確認
- 月ビューの多日跨ぎイベントが `#00695c` のまま（`isMonthAllday` による維持）であること。
- 'week' 時間列・月ビューの DnD（移動・リサイズ）動作が従来どおり（今回は配色のみの変更。`draggableAccessor` / `resizableAccessor` に触れていないこと）。
- 既存の `CalendarView.spec.tsx` / `slot.spec.ts` / `InputItem.spec.tsx` が全てパスしていること。

## 6. リスク対応
| リスク | 対応 |
|---|---|
| 進捗 4 色の候補が UX 上不適切 | 実装前にユーザー確認。ユーザーの指定色に `PROGRESS_COLORS` を差し替え、テスト期待値も更新 |
| 月ビューの描画回帰（多日跨ぎが青に戻る） | `isMonthAllday` で `diff>1` も teal に維持。実ブラウザ確認 5 で検証 |
| 進捗値の保存形式違い（ラベル/英字） | `progressToColor` が両正規化 + 未知値フォールバック。単体テストで固定 |
| 即時反映されない | `eventPropGetter` は render ごと再評価のため、Query invalidate → 再 render で自動反映。ブラウザ確認 6 で検証 |
| `.css.ts` 削除後のビルド警告 | `globalStyle` は EW アンカーで未だ使用のため import 維持。lint/build で検証 |