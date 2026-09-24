# アーキテクチャスナップショット

| Date | Purpose |
|---|---|
| 2026-07-28 | Migration to Mantine v7 and date-fns |
| 2026-07-30 | Code cleanup and ESLint config update |
| 2026-07-30 | Component reorganization and naming cleanup |
| 2026-07-30-03 | Phase A–F refactoring (unused code removal, ESLint recovery, query consolidation, type safety, bug investigation, quality gate) |
| 2026-08-04 | Fix 11PM issue, refactor date handling, and implement timeline overlapping (PR #8 & Task 9) |
| 2026-08-10 | Add admin property to TimelineEventProps for future RBAC (PR #9) |
| 2026-08-25 | Add milestone add/display (PR #17): MilestoneProps, /milestone/add & /milestone/all wiring, admin-based RBAC via useAuthInfo().admin |
| 2026-08-31 | Milestone update feature and waiting status (PR #19): MilestoneStatus (open/waiting/closed), guideline_end_date typo fix, update/remove mutations, MilestoneDetailDialog |
| 2026-09-01 | Timeline detail modal implementation (PR #21): AddChildForm readOnly prop, EventDetailOverlay, onItemClick wiring in TimelinePage |
| 2026-09-07 | Milestone assignment & color coding (PR #24 / Issue #23): milestoneLookup.ts, InputItem milestone select, TimelinePage itemRenderer colors, waiting opacity 0.7 |
| 2026-09-08 | Fix milestone color persistence on deselection (task-12): imperative style with !important in itemRenderer ref callback |
| 2026-09-11 | Mirror backend auto-close on the frontend (PR #26 / task-11-FE): useMilestonesQuery refetchInterval, grace days / refresh interval env-ified (VITE_MILESTONE_CLOSE_GRACE_DAYS / VITE_MILESTONE_REFRESH_INTERVAL_MS) |
| 2026-09-14 | Open milestone detail read-only to all users (PR #27 / task-13): MilestoneListTitle gate removal, MilestoneDetailDialog read-only view, EventDetailOverlay padding |
| 2026-09-17 | Add month view full-day event creation (PR #32 / Issue #29): isFullDayEvent / resolveEventEnd (endOfDay rounding), onSlotInfo view param, rbc-event-allday in week .rbc-row, useCallback fix for infinite loop |
| 2026-09-18 | DnD preprocessing in month view (PR #33 / Issue #30, branch feature/before-dnd-reflect/30, マージ前): shouldBlockMonthDnd, draggableAccessor/resizableAccessor, eventPropGetter removal, allday color #00695c, EW anchor hit-area widening |