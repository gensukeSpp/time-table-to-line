# Issue #37 — test-plan.md

## 1. 静的品質ゲート（必須）
```bash
bun run testrun   # 単一 CI パス（全テスト緑）
bun run lint      # ESLint --max-warnings 0（console.log / 未使用 import / コメントコード禁止）
bun run build     # tsc + vite build 0 errors
```
- 基準は AGENTS.md の「コード修正後は必ず lint を通す」「console.log 削除」等。

## 2. 単体・集成テスト（実施済み）
| 対象 | テスト | 期待 |
|---|---|---|
| `src/tests/progressColor.spec.ts` | `resolveEventColor(..., 'day')` / `('agenda')` / `('work_week')`（`describe.each`） | 進捗あり → 対応色（`'完了'`→`#d81b60`）/ 進捗なし → `undefined` |
| 同上（既存） | `resolveEventColor(..., 'month')` | 単日時間 → `undefined`、フルデイ・日跨ぎ → `MONTH_FULLDAY_COLOR`（**変更なし**） |
| `src/tests/Calendar.spec.tsx`（新規） | ユーザーのイベントが 2 件以下でも描画（`stateAll.length > 2` ガード除去の回帰防止） | AuthUser のイベント 1 件が `.rbc-event` 1 個で描画 |
| `src/tests/Calendar.spec.tsx`（既存） | `defaultView='day'` で `exEvents` | 3 件描画（PASS 維持） |

実行・確認済み:
```
bunx vitest run src/tests/Calendar.spec.tsx src/tests/CalendarView.spec.tsx   # 15 passed / 1 skipped
bunx vitest run src/tests/progressColor.spec.ts                               # 18 passed
```

## 3. 実ブラウザ確認（ユーザー実施・確認済み）
バックエンド + `bun run dev` 起動後、`/calendar?userID=…` で確認。day / agenda は表示ウィンドウが `[displayDate]`（単日）／`[displayDate, +30日)`（未来）のため、**過去イベントは day / agenda では範囲外**に見える点に注意（見誤り防止）。

| # | 操作 | 期待 |
|---|---|---|
| 1 | week でイベント確認 | イベント表示（ベースライン） |
| 2 | `day` 切替 | その日の進捗付きイベントが表示され、対応色になる |
| 3 | `agenda` 切替 | 直近イベントが一覧表示され、進捗色が付く |
| 4 | `month` 切替 | 従来どおり `#3174ad` / `#00695c`（進捗配色なし） |
| 5 | 進捗なしイベント（ウィンドウ内） | デフォルト `#3174ad` |
| 6 | ユーザーのイベントが 2 件以下の状態 | 空にならず描画される（ガード除去の確認） |

→ ユーザーによる実ブラウザ確認で **1〜6 すべて正常**（研修中に day / agenda 描画・進捗色・DnD も確認済み）。

## 4. 回帰
- **Issue #30（month フルデイ teal）**: `resolveEventColor` の month 分岐は関数レベルでテスト固定済み。`progressColor.ts` の return を変更しない。
- **Issue #35（week 進捗色 / `.rbc-event-allday` 固定 CSS 削除）**: week の `eventPropGetter` 経由配色を壊さない。固定 CSS を復活させない。
- **DnD（Issue #30）**: month での時間イベント DnD ブロックは `shouldBlockMonthDnd`（不変）。day / agenda では DnD を制限しない（確認済み）。
- **`stateAll.length > 2` 除去**: `useEventsState()` は常に配列（undefined なら throw）のため副作用なし。空配列テスト・2 件以下テストで固定。

## 5. 残作業の検証
- `specs/2026-09-25-spec.md` と各 doc の view 表更新（`tasks/issue-35/` `docs/architecture/`）後、`grep` で「week のみ」残存ゼロを確認。

## 6. 完了判定
- 全単体・集成テスト PASS、lint / build 緑（`tasks.md` Task 5 で実行）。
- 実ブラウザで day / agenda のイベント + 進捗色をユーザー確認済み。
- `tasks/issue-37/*` と `specs/2026-09-25-spec.md` に本 Issue の確定仕様・実装記録が記録済み。