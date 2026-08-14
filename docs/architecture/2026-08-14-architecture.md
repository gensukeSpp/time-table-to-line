# Architecture Snapshot: 2026-08-14 (PR #12)

## Purpose
This architecture snapshot covers the changes introduced in PR #12, which focuses on completing the Atomic Design refactoring and stabilizing the scheduling views (Timeline and Calendar).

## Overview
Completion of Atomic Design migration and stabilization of event scheduling components (CRUD and rendering).

## Dataflow
- Data fetch: Consolidated hooks in `resources/queries.ts`.
- Mutation layer: Refactored in `hooks/useEventMutation.ts`.
- View rendering: Updated to leverage `ResizeObserver` for robust response to layout changes.

## Key Design Decisions
- **Atomic Components**: Fully migrated to `molecules`, `organisms`, `pages`, and `templates`.
- **Responsive Stability**: Replaced window resize listeners with `ResizeObserver` in `TimelinePage.tsx`.
- **Query Consolidation**: Merged redundant React Query hooks to improve maintainability and performance.

## Changed Files
- `src/components/pages/TimelinePage.tsx`
- `src/hooks/useEventMutation.ts`
- `src/components/pages/CalendarView.tsx`
- `src/resources/queries.ts`

## Next Steps
- Implement further optimizations for the calendar drag-and-drop performance.
- Expand test coverage for the consolidated hooks.
