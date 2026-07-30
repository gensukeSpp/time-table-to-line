# Architecture Snapshot: 2026-07-30

## Purpose
Code cleanup, removal of debug console logs, and adjustment of ESLint configuration.

## Overview
- **Core Changes**: Removed pervasive console logs from components, hooks, and libraries.
- **Cleanup**: Deleted unused `Theme.ts`.
- **Configuration**: Adjusted ESLint `no-console` rule to `warn` and permitted it in test files.

## Key Design Decisions
- Maintain console logs as warnings in development, while ensuring clean production-ready code.

## Commits
- 57bcb44 chore #260724: ESLint no-console を warn に戻す + テストファイルの console.log 許可
- a4d4ca5 chore #260724: 残存コメントアウト console.log 削除
- a816aaa chore #260724: console.log 削除（components）
- 5d62b85 chore #260724: console.log 削除（hooks）
- d52e1ed chore #260724: console.log 削除（resources/lib）
- 99dc629 feat #260724: 未使用ファイル Theme.ts 削除

## Changed Files
- .gitignore
- .yarn/releases/yarn-4.3.1.cjs
- .yarnrc.yml
- eslint.config.js
- src/DnDApp.tsx
- src/components/molecules/EventUpdateButtonComponent.tsx
- src/components/molecules/TimeUpdateButtonComponent.tsx
- src/components/molecules/WrapComponent.tsx
- src/components/organisms/DaysComponent.tsx
- src/components/organisms/Dialog.tsx
- src/components/organisms/DialogOnSlotComponent.tsx
- src/components/organisms/InputItem.tsx
- src/components/organisms/InputTitleDialog.tsx
- src/components/pages/AuthLeaveComponent.tsx
- src/components/pages/CalendarComponent.tsx
- src/components/pages/TimelineComponent.tsx
- src/components/templates/AuthParent.tsx
- src/components/templates/AxiosClientProvider.tsx
- src/components/templates/EventsParent.tsx
- src/hooks/useAuthGuard.ts
- src/hooks/useCallingForm.tsx
- src/hooks/useDialog.tsx
- src/hooks/useEventMutation.ts
- src/hooks/useMouseHandle.ts
- src/hooks/useTimelineDragZoom.ts
- src/lib/ClickOrDouble.js
- src/lib/Theme.ts
- src/lib/TmelineData.ts
- src/resources/fetch.ts
- src/tests/Calendar.spec.tsx
