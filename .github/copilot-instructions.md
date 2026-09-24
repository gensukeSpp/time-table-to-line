# Copilot instructions for time-table-to-line

This repository is a React + Vite SPA for managing events in two synchronized views: a calendar and a timeline. The app is refactor-heavy and uses a shared event model across both views, so prefer incremental, architecture-aware changes over isolated fixes.

## Commands

Use Bun for all package scripts.

```bash
bun install
bun run dev
bun run build        # runs tsc && vite build
bun run preview      # build then preview with Wrangler
bun run lint         # eslint . --report-unused-disable-directives --max-warnings 0
bun test             # watch mode
bun run testrun      # single CI-style run
bun test -- src/tests/Calendar.spec.tsx
bun test -- -t "pattern"
bun run storybook
bun run build-storybook
```

## Architecture at a glance

- App bootstrap: `src/main.tsx` mounts React Router and Mantine, then renders `src/components/index.tsx`.
- `src/components/index.tsx` wraps the app with `QueryClientProvider` and routes via `RoutesComponent`.
- Calendar and timeline are both first-class entry points. The shared data contract is `TimelineEventProps` in `src/lib/TimelineType.ts`.
- `src/resources/queries.ts` and `src/resources/cache.ts` define server-state fetching and cache keys; `src/hooks/*` owns mutations and drag/zoom logic.
- `src/components/templates/` provides providers and route-level composition. `AuthParent` stores auth state and `AxiosClientProvider` attaches the bearer token.
- `react-big-calendar` handles the personal calendar view; `react-calendar-timeline` handles the group timeline view.

## Repo-specific conventions

- Keep the calendar and timeline aligned around the same event shape. When editing event behavior, start from `src/lib/TimelineType.ts`.
- Prefer TanStack Query for server data and Context API for app-wide client state; keep component-local state local to the component.
- Auth tokens are expected in the URL as `?token=...`; the app stores this in auth context and sends it via `Authorization: Bearer ...`.
- Use Mantine v7, date-fns, and Vanilla Extract `.css.ts` files for styling; do not introduce new UI libraries or date libraries.
- Maintain the existing folder pattern: `components/molecules`, `components/organisms`, `components/pages`, `components/templates`, plus `hooks`, `lib`, `resources`, `tests`.
- Avoid mutating fetched objects in-place; prefer derived transformations (`map`, `filter`, etc.) when adjusting data.
- Do not leave `console.log` or commented-out code behind. Remove unused imports, types, and dead modules as part of refactor work.
- Tests live in `src/tests/` and as colocated `*.spec.tsx` files. Use Vitest + Testing Library, not Jest.

## Refactor and feature notes

- This project is intentionally refactoring toward a cleaner architecture, not a greenfield app. Preserve existing patterns while reducing technical debt.
- `requirement-01.md` tracks known refactoring and bug work; `requirement-03.md` tracks the milestone feature.
- The app previously mixed old patterns (moment/dayjs, Chakra/Radix), so prefer the current Mantine + date-fns setup in new work.
- For timeline-related bug fixes, check `src/hooks/useTimelineDragZoom.ts`, `src/lib/TmelineData.ts`, and related timeline components before changing behavior.

## Relevant files to read first

- `src/lib/TimelineType.ts` — canonical event and milestone contract
- `src/components/index.tsx` — app root and QueryClient wiring
- `src/components/templates/ViewComponents.tsx` — route composition
- `src/resources/cache.ts` and `src/resources/queries.ts` — cache keys and data fetching
- `src/hooks/useEventMutation.ts` — mutation patterns for event CRUD
- `README.md`, `AGENTS.md`, and `QWEN.md` — project context and refactor notes
