# Architecture Snapshot: 2026-07-28

## Purpose
This update documents the migration of the UI library from Chakra UI to Mantine v7 and the unification of date manipulation libraries to `date-fns`.

## Overview
- **Core Component Refactoring:** Migrated primary UI components (`CalendarComponent`, `InputItem`, `InputTitleDialog`, `EventsParent`) from Chakra UI primitives to Mantine `Box`, `Button`, and other Mantine v7 components.
- **Date Handling:** Replaced all `moment.js` usage with `date-fns` for better tree-shaking and modern JS date handling.
- **Linting:** Migrated ESLint to the flat configuration format (`eslint.config.js`).
- **Tooling:** Updated Storybook and test setups (`vitest`) to reflect the new library stack.

## Key Design Decisions
- **Mantine v7:** Chosen for better performance and alignment with modern React 19 standards.
- **date-fns:** Standardized to reduce bundle size and improve date manipulation reliability.

## Changed Files
- .eslintrc.cjs
- eslint.config.js
- package.json
- src/App.tsx
- src/components/molecules/EventUpdateButtonComponent.tsx
- src/components/organisms/DaysComponent.tsx
- src/components/pages/CalendarComponent.tsx
- src/components/templates/EventsParent.tsx
- src/hooks/useCallingForm.tsx
- src/lib/Localization.ts
- src/resources/queries.ts
- ... (and many others)

## Commits
- 42c27da fix #260724: react-calendar-timeline CSS パス修正（lib/→style.css）
- ee21148 feat #260724: CalendarComponent.tsx useRef 引数追 加
- 429a86f feat #260724: useCallingForm.tsx useRef 引数追加
- f76fa81 feat #260724: useMouseHandle.ts useRef 引数追加
- 6c0a6f9 feat #260724: Timeline.stories.tsx v3→react-calendar-timeline
- 6d50c46 feat #260724: TmelineData.ts v3→react-calendar-timeline
- 972e38f feat #260724: useTimelineDragZoom.ts v3 import 削 除
- ecfa96d feat #260724: TimelineComponent.tsx v3→react-calendar-timeline
- 65de773 feat #260724: テスト/Storybook の MantineProvider 対応 + date-fns 反映
- f506b44 feat #260724: TimelineComponent/DaysComponent/App moment→date-fns
- 7fc575a feat #260724: Calendar.stories.tsx moment→date-fns
- d1dafcb feat #260724: EventsParent.tsx moment→date-fns
- 59648e4 feat #260724: InputTitleDialog.tsx moment→date-fns
- 8cb0176 feat #260724: CalendarComponent.tsx moment import 削除
- c0c1f7e feat #260724: queries.ts moment→date-fns
- df69b98 feat #260724: SampleState.ts moment→date-fns
- 71f4da7 feat #260724: TimelineType.ts moment.Moment→Date
- a4b1fe9 feat #260724: Localization.ts date-fns import 修正
- 7dea526 feat #260724: date-fns インストール
- 46f6e50 feat #260724: useCallingForm chakra→Mantine Box 移行
- 3af1d64 feat #260724: CalendarWrapperComponent Chakra+Radix→Mantine 移行
- 42089db feat #260724: CalendarComponent chakra.div→Mantine Box 移行
- 9d4e870 feat #260724: InputItem Chakra→Mantine 移行
- e7f7964 feat #260724: InputTitleDialog Chakra→Mantine 移行
- 68d618d feat #260724: EventUpdateButton Chakra→Mantine 移 行
- de693b5 feat #260724: TimeUpdateButton Chakra→Mantine 移行
- c9dc3dc feat #260724: MantineProvider をアプリルートに追加
- 1ccc0f5 feat #260724: ESLint フラット設定移行（eslint.config.js）
