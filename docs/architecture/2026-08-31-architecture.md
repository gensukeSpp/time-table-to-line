# Architecture Snapshot: 2026-08-31 (PR #19)

## Purpose
マイルストーン更新機能の実装および、`waiting` 状態の視覚化による進捗管理の強化。

## Overview
- **Data Model**: マイルストーンの `status` プロパティ (`open` | `waiting` | `closed`) を導入。`guideline_end_date` のスペルミスを修正。
- **UI Interaction**: マイルストーンタイトルのクリックによる詳細モーダル表示、および編集機能の追加。
- **Status Visualization**: `waiting` 状態のマイルストーンを一覧で識別可能にする視覚的調整。

## Key Design Decisions
- **編集機能**: 詳細モーダルより、説明、ガイドライン終了日、達成日等の編集および API を介した更新に対応。
- **未実装事項**:
    - `closed` 状態に関連する動作（削除/自動完了処理など）の実装は、今回の範囲外（未実装）。

## Next Steps / Improvements
- `closed` 動作の実装（一覧からの除外など）。
- `closed` に伴う自動イベント完了処理 (`TimelineEventProps.completed = True`) の実装。

## Commits List
- `a618389` feat #260831: マイルストーン更新実装 & waiting 状態

## Changed Files List
- .hermes/rules/TASKS.md
- requirement-03.md
- src/components/organisms/MilestoneCreateDialog.tsx
- src/components/organisms/MilestoneDetailDialog.css.ts
- src/components/organisms/MilestoneDetailDialog.tsx
- src/components/organisms/MilestoneList.css.ts
- src/components/organisms/MilestoneList.test.tsx
- src/components/organisms/MilestoneList.tsx
- src/components/organisms/MilestoneListTitle.tsx
- src/hooks/useMilestoneMutation.test.tsx
- src/hooks/useMilestoneMutation.ts
- src/lib/TimelineType.ts
- src/lib/milestone.spec.ts
- src/lib/milestone.ts
- src/stories/Timeline.stories.tsx
- tasks/issue-18/README.md
- tasks/issue-18/architecture.md
- tasks/issue-18/overview.md
- tasks/issue-18/tasks.md
- tasks/issue-18/test-plan.md
