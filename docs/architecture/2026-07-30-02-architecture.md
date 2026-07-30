# Architecture Snapshot: 2026-07-30-02

## Purpose
コンポーネント再配置（Atomic Design 準拠）と命名簡略化。ファイル移動・リネームが中心で、新規コンポーネントの追加はなし。

## Overview
- **Component Relocation**: `Dialog.tsx`（+ CSS）を organisms → molecules に移動。`DaysComponent.tsx` を organisms → pages に移動。
- **Naming Simplification**: 10 ファイルのリネーム。`Component` 接尾辞を除去し、ページコンポーネントには Page/View の接尾辞を付与（`CalendarWrapperComponent` → `CalendarPage`, `CalendarComponent` → `CalendarView`, `TimelineComponent` → `TimelinePage` 等）。
- **Import Path Updates**: 全 15 ファイルの import パスを修正。Storybook ストーリーやテストファイルも含む。

## Key Design Decisions
- Atomic Design の molecules / organisms / pages / templates 分類に厳密に従う。
- `Component` 接尾辞は冗長なため削除。ページ単位のコンポーネントは `Page`、ビュー単位は `View` と命名。
- Vanilla Extract CSS ファイルはコンポーネント横置きを維持。

## Commits
- 4eb293a refactor #260724: Task 7-4 コンポーネント名簡略化
- db74f8d refactor #260724: Task 7 コンポーネント再配置

## Changed Files
### Task 7-1: Dialog 移動（organisms → molecules）
- src/components/organisms/Dialog.tsx → src/components/molecules/Dialog.tsx
- src/components/organisms/Dialog.css.ts → src/components/molecules/Dialog.css.ts
- src/components/organisms/dialog.module.css → src/components/molecules/dialog.module.css
- src/hooks/useDialog.tsx（import パス修正）
- src/components/organisms/DialogOnSlotComponent.tsx（import パス修正）

### Task 7-2: DaysComponent 移動（organisms → pages）
- src/components/organisms/DaysComponent.tsx → src/components/pages/DaysComponent.tsx

### Task 7-3: CSS ファイル名統一
- src/components/pages/CalendarComponentWrapper.css.ts → src/components/pages/CalendarWrapperComponent.css.ts
- src/components/pages/CalendarWrapperComponent.tsx（import パス修正）

### Task 7-4: コンポーネント名簡略化
- src/components/molecules/EventUpdateButtonComponent.tsx → EventUpdateButton.tsx
- src/components/molecules/TimeUpdateButtonComponent.tsx → TimeUpdateButton.tsx
- src/components/molecules/TimeUpdateButtonComponent.css.ts → TimeUpdateButton.css.ts
- src/components/organisms/DialogOnSlotComponent.tsx → DialogOnSlot.tsx
- src/components/pages/CalendarWrapperComponent.tsx → CalendarPage.tsx
- src/components/pages/CalendarWrapperComponent.css.ts → CalendarPage.css.ts
- src/components/pages/AuthLeaveComponent.tsx → AuthPage.tsx
- src/components/pages/CalendarComponent.tsx → CalendarView.tsx
- src/components/pages/CalendarComponent.css.ts → CalendarView.css.ts
- src/components/pages/TimelineComponent.tsx → TimelinePage.tsx
- src/components/organisms/InputItem.tsx（import パス修正）
- src/components/templates/ViewComponents.tsx（import パス修正）
- src/tests/Calendar.spec.tsx（import パス修正）
- src/stories/Calendar.stories.tsx（import パス修正）
- src/stories/Timeline.stories.tsx（import パス修正）