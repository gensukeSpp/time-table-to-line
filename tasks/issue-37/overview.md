# Issue #37 — overview.md

## 目的
- [確認済み] 「day / agenda にイベントが表示されない」は**実ブラウザ確認で見誤りと判明**。描画は正常、進捗色は既に 'week' を踏襲して 'day' に適用、'day' の DnD も動作。→ 機能実装は不要。
- 残作業は 2 点のみ：(1) リファクタ前残骸 `stateAll.length > 2` ガードの除去と回帰防止テスト、(2) `resolveEventColor` の day / agenda / work_week テスト追加（既存挙動の固定）とドキュメントの view 表更新。

## 調査サマリ（静的調査 → 実ブラウザ確認で解決）
本計画着手時に実施した調査。初期は「day / agenda 空表示」を疑ったが、実ブラウザ確認で**描画正常と判明**。

### 確定した事実（ソース＋テストハーネスで確認済み）
| # | 事実 | 根拠 |
|---|---|---|
| 1 | `CalendarView.tsx` は `views` プロパティを**指定していない** → rbc の全 5 ビュー（month / week / work_week / day / agenda）が有効 | `lib/Calendar.js:70-85`、`lib/Views.js:15` |
| 2 | `withDragAndDrop` HOC は全ビューを透過する | `lib/addons/dragAndDrop/withDragAndDrop.js:102-129` |
| 3 | day ビューはスコープ内のイベントを描画できる（`Calendar.spec.tsx` の `defaultView='day'` が 3 件描画で PASS） | `bunx vitest run src/tests/Calendar.spec.tsx` |
| 4 | day / agenda / week / month のイベント除外は全て同じ `localizer.inEventRange` を使い、スコープ内なら描画される | `lib/Agenda.js:132-134`、`lib/eventLevels.js:81-94`、`lib/localizer.js:85-98` |
| 5 | `resolveEventColor` は `view === 'month'` のみを除外し、**day / agenda / work_week / week にも進捗色を返す**（→ Issue #37 のコアロジックは既存） | `src/lib/progressColor.ts:54-64` |
| 6 | **実ブラウザで day / agenda の描画・進捗色・DnD が正常（ユーザー確認）** | ユーザー報告 |
| 7 | `stateAll.length > 2` はリファクタリング前からの残骸で、**ユーザーのイベントが 2 件以下だと描画されない**潜在バグ。`useEventsState()` は常に配列を返すため除去しても副作用なし | `src/hooks/useContextFamily.ts:13-17`、`src/components/pages/CalendarView.tsx:32-34` |

### 表示ウィンドウ（各ビューの描画範囲・参考記録）
`react-big-calendar` は `date`（= `displayDate`、初期値 `new Date()`＝今日）をアンカーに範囲を決める。day は単日、agenda は未来 30 日のみのため、過去イベントは月/週では見えるが day/agenda では範囲外になり得る（今回の「見誤り」の原因となった性質）。

| ビュー | 範囲 |
|---|---|
| `month` | 月全体（過去日も含む） |
| `week` | `date` を含む週 7 日 |
| `day` | `[displayDate]` 単日のみ |
| `agenda` | `[displayDate, +30日)`（未来方向のみ） |
| `work_week` | `date` を含む平日 5 日 |

## ユーザーストーリー
- 管理者/ユーザーとして、`day` ビューでその日のタイムテーブルを確認したい。その日の進捗付きイベントが正しい色で表示される。
- ユーザーとして、`agenda` ビューで直近の予定一覧を確認したい。進捗に応じた色で一覧表示される。
- （先行）ユーザーとして、`week` で見えていたイベントが `day` / `agenda` でも同一データで見えることを前提にしたい。

## 前提・依存
- 依存: Issue #35（週ビューの進捗配色）、PR #36（`resolveEventColor` 導入・マージ済み `c27c91a`）
- rbc は `react-big-calendar` **1.20.0**（`package.json`）
- 進捗の 4 色は確定済み（`src/lib/progressColor.ts` の `PROGRESS_COLORS`）
- 実ブラウザ確認はプロジェクト慣行どおりユーザー自身が実施（本計画の test-plan は手順を提供）

## リスク
1. **進捗 4 色のトーン**: Issue #35 で確定済みの `#3949ab / #5e35b1 / #8e24aa / #d81b60` を維持。トーン調整はスコープ外（別途協議）。
2. **`stateAll.length > 2` 除去の回帰**: `useEventsState()` は常に配列を返すため副作用なしと確認済み。集成テスト（2 件以下でも描画）で固定。
3. **ドキュメントの view 表の更新漏れ**: 複数ファイルを跨ぐため、grep で一括洗い出しする。
4. **誤って month 分岐を変更**: `resolveEventColor` の month は `isMonthAllday`（Issue #30 回帰）。単体テストで固定し return を変更しない。

## 完了条件
1. `CalendarView.tsx` の `stateAll.length > 2` ガードが除去され、ユーザーのイベントが 2 件以下でも描画される（集成テストで固定済み）
2. `resolveEventColor` が week / day / agenda / work_week で進捗色を返す（単体テストで固定済み）
3. 実ブラウザで day / agenda にイベントと進捗色が表示される（ユーザー確認済み）
4. 仕様・計画・アーキテクチャ文書の view 表が week / day / agenda / work_week に統一されている
5. `bun run testrun` / `bun run lint` / `bun run build` が全て緑
