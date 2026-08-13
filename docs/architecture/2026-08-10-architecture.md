# Architecture Snapshot: 2026-08-10 (PR #9)

## Purpose
Add the `admin: boolean` property to `TimelineEventProps` as a foundational step for implementing role-based access control (RBAC) and upcoming group permission features.

## Overview
- **Data Model Evolution**: Added `admin: boolean` to the central `TimelineEventProps` type definition.
- **Cascade Updates**: Propagated the new property through consuming components, data mocks, Storybook stories, and unit tests to maintain type consistency.

## Key Design Decisions
- **Binary Role Model**: Implemented as a simple `boolean` flag to support immediate needs for admin/non-admin functionality.
- **Future-proofing**: Future requirements for more granular roles (e.g., 'viewer', 'editor') should be considered for a potential refactor to an enum or union type.
- **Safe Defaults**: Backend integration is pending; frontend implementation ensures `admin` defaults to `false` or `undefined` where necessary to maintain UI stability.

## Commits
- `71a9ae1` feat #260810: admin 属性追加

## Changed Files
- `src/lib/TimelineType.ts` (Core model change)
- `src/components/organisms/InputTitleDialog.tsx`
- `src/components/templates/EventsParent.tsx`
- `src/lib/SampleState.ts`
- `src/resources/queries.ts`
- `src/stories/Calendar.stories.tsx`
- `src/stories/Timeline.stories.tsx`
- `src/tests/Calendar.spec.tsx`
- `src/tests/tmelineData.spec.ts`
