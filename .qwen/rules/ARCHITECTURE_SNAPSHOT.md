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