# Architecture Snapshot: 2026-08-25 (PR #17)

## Purpose
タイムライン画面への「マイルストーン」追加・表示機能の実装（PR #17）。プロジェクト進捗管理の可視化と制御を強化する。

## Overview
- **Milestone Components**: マイルストーン操作用コンポーネントの新設 (`MilestoneAddButton`, `MilestoneCreateDialog`, `MilestoneList`)。
- **UI Integration**: `TimelinePage.tsx` にツールバーとして統合。管理者権限 (`useAuthInfo`) に基づく操作制限を実装。
- **Data Layer**: マイルストーン取得・操作用のカスタムフック (`useMilestoneMutation.ts`) とクエリ (`queries.ts`) を追加。

## Key Design Decisions
- **Role-Based Access**: マイルストーン作成は管理者のみに制限し、閲覧は全ユーザーに開放する権限設計。
- **Atomic Design**: 新規コンポーネントは Atomic Design の分類（Organisms）に従い適切に配置。

## Next Steps / Improvements
- マイルストーンの編集および削除機能の実装。
- マイルストーンとイベントの連動性の強化。

## Commits List
- PR #17 (Feature/add milestone/16)

## Changed Files List
- `src/components/organisms/MilestoneAddButton.tsx`
- `src/components/organisms/MilestoneCreateDialog.tsx`
- `src/components/organisms/MilestoneList.tsx`
- `src/components/pages/TimelinePage.tsx`
- `src/hooks/useMilestoneMutation.ts`
- `src/resources/queries.ts`
- `package.json`
- `tasks/issue-16/` (関連ドキュメント一式)
