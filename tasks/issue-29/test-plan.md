# Issue #29 — test-plan.md

## 静的品質ゲート（全て通すこと）
```bash
bun run testrun    # 全テスト（Vitest + jsdom）
bun run lint       # --max-warnings 0
bun run build      # tsc + vite build、0 エラー
```
- `console.log` の混入禁止（AGENTS.md セキュリティ方針）
- 未使用 import / 変数 / 型は lint が検出（Task の import 置換で注意）

## 単体テスト
| 対象 | ファイル | 検証内容 |
|------|---------|---------|
| `isFullDayEvent` | `src/lib/slot.spec.ts` | フルデイ true / week(9:00) false / 23:00 false / date-only(0:00–0:00) false / 日跨ぎ false |
| `resolveEventEnd` | `src/lib/slot.spec.ts` | fullDay=true→endOfDay / false→resolveSlotEnd / 23:00 は endOfDay 丸め（11PM 挙動維持） |
| `TitleInput`（任意） | `src/tests/TitleInput.spec.tsx` | isMonth=true で `end_time=endOfDay` を mutation に渡す |
| 回帰 | `src/tests/Calendar.spec.tsx` | `allDayAccessor` 変更後も既存アサートが通る |

> **rbc 描画は jsdom で信頼できない**（`react-big-calendar-11pm-overnight` スキル参照）。描画位置・クラス付与の最終確認は**実ブラウザ**で行う。

## 実ブラウザ確認（事前調査で環境構築済み）
- バックエンド: `http://127.0.0.1:8000/`（`/login` でサインイン）
- フロント: `http://localhost:5173/calendar?userID=201`
- ログイン: 社員番号 `201` / パスワード `projectA2` → ホーム → 「time-table-to-line へ」→ フロント `/calendar` へ自動遷移

### 手順 1: 週ビューのベースライン（変更後も不変）
1. 'Week' に切り替え、空スロット（例: 9:00）をクリック → タイトル入力 → 追加
2. `POST /event/all` で作成イベントの `start_time` / `end_time` を確認 → `start=クリック時刻, end=+1h` であること
3. DOM 上、そのイベントが `.rbc-time-content`（時間列）にあり、クラスが `rbc-event`（`rbc-event-allday` なし）であること
   ```js
   // チェック: 対象タイトルを含む .rbc-event の className と祖先に .rbc-time-content が含まれるか
   ```

### 手順 2: 月ビューのフルデイ作成（受け入れ 1）
1. 'Month' に切り替え、空の日セル（例: 22 日）をクリック → タイトル入力 → 追加
2. `POST /event/all` で `start=0:00（前日 15:00 UTC）`, `end=23:59:59（14:59:59 UTC）` であることを確認
   - UTC 表現: `start_time: "2026-09-21T15:00:00.000Z"`, `end_time: "2026-09-22T14:59:59.000Z"`（= JST 22 日 0:00–23:59）

### 手順 3: 週ビューでの配置（受け入れ 2・3）
1. 手順 2 で作ったイベントを含む週に 'Week' へ切り替え
2. そのタイトルを含む `.rbc-event` の祖先に `.rbc-row-segment → .rbc-row`（`rbc-allday-cell` 内）が含まれることを確認
3. その `.rbc-event` の className に **`rbc-event-allday`** が含まれることを確認
   （= `.rbc-row` 配置 + `.rbc-event-allday` の両立が、`allDayAccessor` 経由で達成された証拠）

### 手順 4: 回帰（既存イベント）
- 既存「日跨ぎサンプル」: `.rbc-row` + `rbc-event-allday` のまま（変更なし）
- 既存 date-only（0:00–0:00）イベント: `.rbc-row` に残る（`allDayAccessor` は false のまま、date-only 判定で配置）
- week 作成イベント（9:00 等）: 時間列のまま
- 月ビューでフルデイイベントがその日のセルに表示され、崩れない

## 回帰スイート（メイン）
```bash
bun run testrun
bun run lint
bun run build
```

## リスク対応
| 症状 | 対応 |
|------|------|
| `allDayAccessor` 変更で既存月セル描画が崩れる | `isFullDayEvent` 条件を再確認（フルデイ以外 false のはず）。実ブラウザで週・月を回帰確認 |
| DnD 伸縮が `allDay` で想定外になる | issue スコープ外。許容できない場合は、`allDayAccessor` を戻しつつ `eventPropGetter` でカスタム className（例: `rbc-event-month-day`）を付与する代替案へ切替（次 Issue #30 の区別は styleUrls/class で担保） |
| `Calendar.stories.tsx` の `onSlotInfo` が型エラー | `action('onSlotInfo')` は任意引数互換のはず。壊れたら Storybook 側で第 2 引数を受ける形に調整 |
| date-fns の import 名ミス | `isStartOfDay` / `isEndOfDay` は v4 に無い。`startOfDay` / `endOfDay` / `isSameMinute` / `isSameDay` を使用（build / lint で検出） |

## 事前調査で作成したテストデータ（検証後は削除推奨）
実ブラウザ確認の過程で dev DB に入れた確認用イベント:
- id 29 `TEST-fullday-2359`（0:00–23:59）
- id 30 `TEST-dateless`（0:00–0:00）
- id 31 `TEST-current-month-create`（月クリック不具合の再現、0:00–1:00）

手順検証後に掃除する場合:
```bash
curl -X DELETE "http://127.0.0.1:8000/event/remove/29" -H "Authorization: Bearer <token>"
curl -X DELETE "http://127.0.0.1:8000/event/remove/30" -H "Authorization: Bearer <token>"
curl -X DELETE "http://127.0.0.1:8000/event/remove/31" -H "Authorization: Bearer <token>"
```
（別の検証用に残したい場合は残して構わない。計画の主張箇所は上記 id を参照。）