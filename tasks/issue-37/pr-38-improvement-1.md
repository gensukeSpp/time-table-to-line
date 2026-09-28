# PR #38 改善提案 1 — CalendarView の eventPropGetter 接続テスト（day / agenda / work_week）

参照: `.github/reports/pr-38-review.md` 改善提案

## 目的

`progressColor.spec.ts` は `resolveEventColor` の色解決を直接検証しているが、
`CalendarView.tsx` がビューごとに `eventPropGetter` へ正しい `currentView` を渡す
**接続（配線）** までは検証していない。`CalendarView.spec.tsx` に day / agenda /
work_week ビュー時の `eventPropGetter` 戻り値（inline style の backgroundColor）を
検証するテストを追加し、Issue #37 の受け入れ条件をより直接に固定する。

## 計画

1. `src/tests/CalendarView.spec.tsx` に `describe.each(['day', 'agenda', 'work_week'])`
   でビュー切替（`fireView`）後の `eventPropGetter` を検証するテストを追加する。
   - 進捗あり（`'完了'`）→ `style.backgroundColor` が `#d81b60`
   - 進捗なし（null）→ `{}`（backgroundColor なし = rbc 既定へ委譲）
2. 既存テスト（week / month の `eventPropGetter` テスト）は変更しない。
3. 品質ゲート（`bun run testrun` / `bun run lint` / `bun run build`）を実行する。

## タスク

- [x] `CalendarView.spec.tsx` に day / agenda / work_week の `eventPropGetter` 接続テストを追加する。
- [x] 対象テストと品質ゲートを実行する。
- [x] `tasks/issue-37/tasks.md` に本改善の実施記録を追記する。

## 実装方針

- 既存の RBC スタブ（`stubRegistry.props`）経路をそのまま利用する。
  `fireView(view)` でビューを切り替えた後、`stubRegistry.props.eventPropGetter` を
  取り出してイベントオブジェクトを渡し、戻り値の `style.backgroundColor` を検証する。
- 色の期待値は `PROGRESS_COLORS['完了']`（`#d81b60`）を直接参照せず、
  既存テストと同様のリテラル比較で固定する（既存テストのスタイルに合わせる）。

## 実施結果

- `src/tests/CalendarView.spec.tsx` に `describe.each(['day', 'agenda', 'work_week'])` の
  `eventPropGetter` 接続テストを追加した（各ビューで `fireView` 切替後、
  `stubRegistry.props.eventPropGetter` の戻り値を検証）。
  - 進捗あり（`'完了'`）→ `style.backgroundColor === '#d81b60'`
  - 進捗なし（null）→ `backgroundColor` なし（rbc 既定 `#3174ad` へ委譲）
- 既存の week / month の `eventPropGetter` テストは変更していない。
- 品質ゲート（2026-09-28 実施）:
  - `bunx vitest run src/tests/CalendarView.spec.tsx` → 14 passed
  - `bun run testrun` → 19 files / 138 passed / 1 skipped（テスト中の localhost:8000 接続拒否 stderr は既知の環境ノイズで結果に影響なし）
  - `bun run lint` → 0 warnings（`--max-warnings 0`）
  - `bun run build` → tsc + vite 0 errors
