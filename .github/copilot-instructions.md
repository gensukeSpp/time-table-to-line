# Copilot Instructions — time-table-to-line

This file helps Copilot sessions work effectively in this React + Vite codebase. It consolidates verified commands, architecture notes, and coding conventions.

---

## Quick Commands

**Package Management (Bun)**
```bash
bun install          # Install dependencies
bun add <pkg>       # Add a package
bun add -d <pkg>    # Add dev dependency
bun remove <pkg>    # Remove a package
```

**Development**
```bash
bun run dev         # Start dev server (HMR enabled)
bun run build       # Build for production (tsc + vite build)
bun run preview     # Preview built app
```

**Code Quality**
```bash
bun run lint        # ESLint check (enforces --max-warnings 0)
```

**Testing**
```bash
bun test                                        # Watch mode
bun run testrun                                 # Single run (CI)
bun test -- path/to/file.spec.tsx             # Single test file
bun test -- -t "pattern"                       # Tests matching name
```

**Storybook**
```bash
bun run storybook          # Dev server (port 6006)
bun run build-storybook    # Static build
```

---

## High-Level Architecture

**Two Views, One Event Model**
- **Calendar View** (react-big-calendar): Week/day grid for personal event management with drag-and-drop.
- **Timeline View** (react-calendar-timeline): Gantt-like horizontal timeline for group resources and milestones.
- Both views operate on the same event model (`TimelineEventProps` in `src/lib/TimelineType.ts`).

**State Management Layers**
- **Server State**: @tanstack/react-query 5 → queries in `src/resources/queries.ts`, cache keys in `resources/cache.ts`.
- **Client State**: Context API → auth and events contexts via `useContextFamily.ts`.
- **Component State**: `useState`/`useReducer` for form controls, dialogs, etc.

**Request Flow**
1. Auth token passed via URL query (`?token=xxx`) → stored in auth context.
2. Axios interceptor (`AxiosClientProvider.tsx`) attaches token to all requests via `Authorization: Bearer`.
3. Server state mutations via TanStack Query (e.g., `useEventMutation`, `useMilestoneMutation`).

**Styling & UI**
- **CSS**: Vanilla Extract (zero-runtime) with per-component `.css.ts` files colocated with components.
- **UI Library**: Mantine v7 (unified from Chakra/Radix; do not introduce other UI libraries).
- **Dates**: date-fns (legacy code may reference moment/dayjs; standardize on date-fns in new work).

---

## Key Conventions

### Component Organization (Atomic Design)
```
src/components/
├── molecules/      # Simple reusable components (e.g., EventUpdateButtonComponent)
├── organisms/      # Complex stateful components (e.g., Dialog, InputItem, MilestoneCreateDialog)
├── pages/          # Full page components (e.g., CalendarComponent, TimelinePage)
└── templates/      # Layout wrappers & global providers (e.g., AuthParent, AxiosClientProvider)
```

### Directory Overview
```
src/
├── hooks/          # Custom hooks (useEventMutation, useAuthGuard, useContextFamily)
├── lib/            # Type definitions & utilities (TimelineType.ts = canonical event shape)
├── resources/      # TanStack Query integration (queries, mutations, cache keys)
├── tests/          # Vitest test files
├── stories/        # Storybook component stories
└── assets/         # Static files
```

### Event Shape (Central Contract)
The canonical event model is `TimelineEventProps` in `src/lib/TimelineType.ts`. Always include:
- `start`, `end` — Date instances for react-big-calendar.
- `start_time`, `end_time` — For timeline compatibility (backend may store as string; normalize in queries).
- Other fields: `id`, `title`, `resource_id` (staff), `milestone_id` (optional), etc.

### React Query Integration
- Define cache keys in `src/resources/cache.ts` (e.g., `queryKeys.events()`, `queryKeys.milestones()`).
- Queries live in `src/resources/queries.ts` (hooks like `useEventsQuery`, `useMilestonesQuery`).
- Mutations in hooks (e.g., `useEventMutation`, `useMilestoneMutation`).
- **Important**: Avoid mutating fetched objects; use non-mutating transformations (e.g., `.map()` not direct mutation).

### Authentication & Networking
- Token from URL: `new URLSearchParams(location.search).get('token')`.
- Store in auth context via `AuthParent.tsx`.
- **Order of precedence**: auth context → refresh query → localStorage fallback.
- **Security**: Axios interceptor must prepend `Authorization: Bearer` to all requests.

### Code Quality & Linting
- **ESLint**: Enforced with `--max-warnings 0`. All warnings must be fixed.
- **No console.log**: Remove all logging before committing (security policy).
- **No commented code**: Delete instead of commenting out.
- **Unused imports/variables**: Remove via `bun run lint --fix` where possible.
- **TypeScript**: Strict mode; always use precise types.

### Styling Rules
- All new styles must use Vanilla Extract (`.css.ts` files).
- Colocate `ComponentName.css.ts` with `ComponentName.tsx`.
- Use Mantine's responsive utilities via Sprinkles when possible.
- CSS Modules (`.module.css`) are legacy only; do not introduce new ones.

### Testing
- **Framework**: Vitest with jsdom.
- **Setup**: `src/tests/vitest-setup.ts` (auto-included in vite.config.ts).
- **Component Tests**: Prefer Storybook interaction tests (covers Testing Library internally).
- **Unit Tests**: Place colocated as `*.spec.ts` or in `src/tests/`.

---

## Known Issues & Refactoring Status

### Current Refactoring Priority (from requirement-01.md)
1. **Code Quality**: Remove `console.log`, commented code, unused types/imports.
2. **UI Library**: Unified to Mantine v7 (Chakra/Radix deprecated).
3. **Date Library**: Standardize on date-fns (moment/dayjs being phased out).
4. **Unused Files**: Clean up Theme.ts and other stale modules.

### Known Bugs (from requirement-01.md)
- **Calendar PM 11:00 issue**: Events added at 11:00 PM are placed in all-day section instead of the intended time slot.
- **Timezone issue**: Server stores times in non-JST; UI displays correctly except for above bug.

### Milestone Feature (requirement-03.md) — In Progress
- Milestones are long-span tasks shared across groups (admin-only create/close).
- Database: `M_MILESTONE` table with color, status, accomplished_date.
- UI: Appears in Timeline view only (group scope, not personal).
- Colors: 10 fixed patterns; defaults differ from event colors (#2196f3, #ffc107).

---

## Debug Checklist

| Issue | Look Here |
|-------|-----------|
| Auth token missing / Bearer header not sent | `src/components/templates/AxiosClientProvider.tsx`, `src/lib/AuthInfo.ts`, `src/resources/fetch.ts` |
| Event not showing / CRUD failing | `src/hooks/useEventMutation.ts`, `src/resources/queries.ts`, `src/lib/TimelineType.ts` |
| Timeline rendering wrong / zoom broken | `src/hooks/useTimelineDragZoom.ts`, `src/lib/TmelineData.ts` (note: typo in filename) |
| Calendar drag-drop not working | `src/hooks/useMouseHandle.ts`, `src/components/pages/CalendarComponent.tsx` |
| Types not matching | `src/lib/TimelineType.ts` (single source of truth for event schema) |

---

## CI/CD Expectations

Before pushing, ensure:
1. `bun run lint` ✓ (0 errors, 0 warnings)
2. `bun run testrun` ✓ (all tests pass)
3. `bun run build` ✓ (tsc passes, no Vite errors)
4. No `console.log` in source files
5. No build artifacts (dist/, storybook-static/) staged

---

## Useful References

- **Architecture Deep Dive**: See `QWEN.md` (Japanese) for detailed component hierarchy and refactoring roadmap.
- **Requirement Specs**: `requirement-01.md` (initial refactor plan), `requirement-03.md` (milestone feature).
- **Existing Instruction Files**: `AGENTS.md` (other agent contexts), `GEMINI.md`, `QWEN.md` for additional perspectives.

---

Last updated: 2026-08-31. Maintained by Copilot session automation.
