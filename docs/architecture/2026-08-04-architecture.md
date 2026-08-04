# Architecture Snapshot: 2026-08-04 (PR #8)

## Purpose
Fix the "11PM issue" where events starting at 23:00 were incorrectly categorized as "all-day" events by `react-big-calendar`.

## Overview
- **Event Boundary Handling**: Introduced `resolveSlotEnd` utility to correctly round end times to 23:59, preventing incorrect UI categorization.
- **Application Invariant Enforcement**: Disabled all-day event handling at the component level in `CalendarView.tsx` to align with the domain model.
- **Data Flow Reliability**: Refactored event mutation to pass `Date` objects directly, removing fragile string-based date parsing.
- **Verification**: Added comprehensive unit tests in `slot.spec.ts`.

## Key Design Decisions
- Centralize library-specific quirk handling in `src/lib/slot.ts` instead of scattering logic in components.
- Enforce strict type safety and domain constraints (no all-day events) at the component boundary.

## Commits
- Fix: Add resolveSlotEnd utility and enforce no-all-day constraint
- Refactor: Use Date objects directly in event mutations

## Task 9: Timeline Overlapping (E-2)

### Purpose
Resolve timeline event overlapping issues for same-user events within the same time slot, ensuring both events remain visible by stacking them.

### Overview
- **Verification Plan**: Conducted browser-based verification (Scenario 1-5) using `react-calendar-timeline` demo data.
- **Requirement**: Identified that native `Date` objects are insufficient for `stackItems={true}` in `react-calendar-timeline` (0.30.0-beta.4), necessitating conversion to millisecond timestamps.
- **Implementation**: Created a pure function `toTimelineStackItems()` to handle the conversion from `Date` to `number` (milliseconds) specifically for Timeline rendering, preserving the application's overall reliance on `Date` objects.

## Changed Files (PR #8 & Task 9)
- `src/lib/slot.ts`
- `src/lib/TmelineData.ts`
- `src/components/organisms/InputTitleDialog.tsx`
- `src/components/pages/CalendarView.tsx`
- `src/components/pages/TimelinePage.tsx`
- `src/tests/slot.spec.ts`
- `src/tests/tmelineData.spec.ts`
- `tasks/task-08/README.md`
- `tasks/task-09/README.md`
- `tasks/task-09/stackItems-date-implementation.md`
