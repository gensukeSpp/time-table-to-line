# Architecture Snapshot: 2026-08-03

## Purpose
Addressing identified bugs and functional improvements, specifically related to event management, view switching, timeline zoom, and authentication security (PR #7).

## Overview
- **Event Management**: Fixed event edit/delete functionality, resolved form closing issues and error messages.
- **View Switching**: Enabled switching between Calendar and Timeline views.
- **Timeline Interactivity**: Improved responsiveness and smoothness of the zoom feature.
- **Authentication**: Transitioned from URL-based tokens to payload-based authentication, enhancing security.

## Key Design Decisions
- Refactored authentication to use payloads in `AuthPage.tsx` instead of exposing tokens in URLs.

## Next Steps
- Implement backend token lifecycle management (issuance, revocation, reissuance).

## Commits
- 2 commits merged from `fix/repaire-points/6`

## Changed Files
- `package.json`
- `src/components/molecules/EventUpdateButton.tsx`
- `src/components/organisms/InputItem.tsx`
- `src/components/pages/AuthPage.tsx`
- `src/components/pages/CalendarView.tsx`
- `src/components/pages/TimelinePage.tsx`
- `src/components/sprinkles.responsive.css.ts`
- `src/components/templates/AuthParent.tsx`
- `src/hooks/useAuthGuard.ts`
- `src/hooks/useTimelineDragZoom.ts`
- `src/lib/AuthInfo.ts`
- `src/lib/authPayload.ts`
- `src/resources/fetch.ts`
- `src/resources/queries.spec.tsx`
- `src/resources/queries.ts`
- `src/tests/Calendar.spec.tsx`
- `vite.config.ts`
