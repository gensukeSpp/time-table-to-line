# Architecture Snapshot: 2026-09-24 (PR #36)

## Purpose
進捗（TimelineEventProp.progress）に応じたイベントの配色変更の実装（Issue #35）。

## Overview
- **Progress Coloring**: 'week' ビューにおいて、イベントの進捗度合い（なし, これから, まだ, もうすぐ, 完了）に応じて配色を自動適用。
- **Color Logic**: 新規作成の `src/lib/progressColor.ts` にて、進捗値から色コードへのマッピングおよび、'month' ビューでの描画互換性（Issue #30 対策）を維持するロジックを実装。
- **UI Integration**: `CalendarView.tsx` において、`eventPropGetter` を通じて進捗色を適用。既存の固定色スタイルを調整し、inline style との競合を解消。

## Key Design Decisions
- **疎結合な配色ロジック**: 配色決定ロジックをコンポーネントから分離し、テスト容易性を確保。
- **段階的実装**: 'month' ビューは既存の Teal 系配色を維持し、ユーザーにとっての視覚的混乱を回避。
- **互換性維持**: 固定的な CSS ではなく inline style を採用することで、ビュー間でのスタイル衝突を防止。

## Commits List
- PR #36 ([Feature] 進捗別に色分けをする)

## Changed Files List
- `src/lib/progressColor.ts` (新規追加)
- `src/tests/progressColor.spec.ts` (新規追加)
- `src/components/pages/CalendarView.css.ts`
- `src/components/pages/CalendarView.tsx`
- `src/tests/CalendarView.spec.tsx`
- `tasks/issue-35/` (関連ドキュメント一式)
