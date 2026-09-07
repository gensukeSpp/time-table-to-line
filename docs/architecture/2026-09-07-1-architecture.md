# Architecture Snapshot: 2026-09-07-1

## Purpose
Implement milestone-event association and color coding in the Timeline view based on issue #23.

## Overview
- Events can now "belong" to a specific milestone.
- The Timeline view dynamically styles events using their assigned milestone's color.
- Events in "waiting" status are visually distinguished with `opacity: 0.7`.
- The Calendar edit form was updated to support selecting a milestone for an event.

## Key Components Changed
- `src/lib/milestoneLookup.ts`: New helper created for milestone color resolution.
- `src/components/pages/TimelinePage.tsx`: Updated to apply dynamic styling based on milestone association.
- `src/components/organisms/InputItem.tsx`: Updated to include milestone selection in the event creation/editing flow.

## Key Design Decisions
- Utilized a lookup helper (`milestoneLookup`) to keep color resolution logic centralized and testable.
- Default to `#2196f3` for events without a milestone or closed milestones (YAGNI).

## Tests
- Added `src/tests/milestoneLookup.spec.ts` for the new helper.
- Updated `src/tests/InputItem.spec.tsx` to account for milestone selection.

## Changed Files
- `src/components/organisms/InputItem.tsx`
- `src/components/pages/TimelinePage.tsx`
- `src/lib/milestoneLookup.ts`
- `src/tests/InputItem.spec.tsx`
- `src/tests/milestoneLookup.spec.ts`
- `tasks/issue-23/*` (Documentation)
