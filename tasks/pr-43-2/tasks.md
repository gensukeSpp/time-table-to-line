# 実装タスク一覧

## タスク一覧

| ID | タスク | 優先度 | 対象ファイル | 状態 |
|----|--------|--------|-------------|------|
| T-1 | `MilestoneEventsDrawer.css.ts` の `eventRow` に `display: flex` と `minWidth: 0` を追加 | 高 | `src/components/organisms/MilestoneEventsDrawer.css.ts` | 完了 |
| T-2 | `MilestoneEventsDrawer.tsx` の `MilestoneEventRow` でメタ情報を `Collapse` で囲み、開閉機能を実装 | 高 | `src/components/organisms/MilestoneEventsDrawer.tsx` | 完了 |
| T-3 | `clampText.css.ts` の `flex: 1; minWidth: 0` 変更理由をコメントに残し、Issue #40 への影響を文書化 | 中 | `src/components/molecules/clampText.css.ts` | 完了 |
| T-4 | `ClosedMilestoneDrawer.tsx` に `aria-controls` を付与し、段 3 のボタン構成を整理 | 中 | `src/components/organisms/ClosedMilestoneDrawer.tsx` | 完了 |
| T-5 | `formatAccomplishedDate` の日付解釈を検討し、spec に 1 行で記録 | 低 | `src/lib/milestone.ts` | 完了 |
| T-6 | `useEventMutation.ts` の closed キー無効化に関するテストを 1 件追加 | 中 | `src/tests/useEventMutation.test.tsx` | 完了 |
| T-7 | `bun run testrun` / `lint` / `build` と `light_token_server` の pytest を再実行し、結果を記録 | 低 | - | 完了 |

## 実行順序

1. T-1 → T-2（Issue #40 の三点リーダーと開閉機能修正）
2. T-3 → T-4（PR #43 [#2][#4] の修正）
3. T-5（PR #43 [#3] の検討）
4. T-6（PR #43 [#1] のテスト追加）
5. T-7（PR #43 [#5] の品質ゲート再実行）
