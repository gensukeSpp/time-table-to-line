# Copilot instructions for time-table-to-line

This file collects repository-specific instructions that help future Copilot/assistant sessions start quickly and produce high-quality results. It consolidates verified commands, architecture notes, and conventions found in the codebase (package.json, src/, resources/, tasks/).

---

## Quick commands (from package.json)
Use the project's package scripts. The project uses Bun for package management and scripts.

Install
- bun: bun install

Dev (HMR)
- bun: bun run dev

Build (production)
- bun: bun run build

Preview
- bun: bun run preview

Lint
- bun: bun run lint

Tests
- Watch mode (dev): bun run test
- Single-run (CI): bun run testrun
- Run a single test file: bun run test -- path/to/file.spec.tsx
- Run tests matching a name: bun run test -- -t "Test name pattern"

Storybook
- bun run storybook
- Build static: bun run build-storybook

Notes
- package.json scripts: `dev`, `build` (runs `tsc && vite build`), `lint` (eslint with --max-warnings 0), `test` (vitest), `testrun` (vitest run).

---

## High-level architecture (big picture)
- React 19 + TypeScript + Vite front-end app exposing two primary views:
  - Calendar view (react-big-calendar) — date-grid UI for day/week operations and drag-and-drop.
  - Timeline view (react-calendar-timeline) — horizontal timeline (Gantt-like) for staff resources.
- State layers:
  - Client context: Context API via useContextFamily for local global state (EventsStateContext, Auth contexts).
  - Server state: @tanstack/react-query (resources/*) — queries live in `src/resources` and cache keys in `resources/cache`.
  - Mutations: useEventMutation pattern (React Query) centralizes create/update/delete semantics.
- Styling: Vanilla Extract with per-component `.css.ts` files and Sprinkles for responsive utilities.
- UI toolkit: Mantine v7 (project migrated from Chakra/Radix), Framer Motion for interactions.
- Dates: Project standard is date-fns (some legacy code still references moment/dayjs; prefer date-fns in new work).
- Networking: Axios instance at `src/lib/AuthInfo.ts` used throughout; authentication logic and interceptors live in templates (`AxiosClientProvider.tsx`).

---

## Key codebase conventions (non-obvious)
- Atomic component organization: `src/components/{molecules,organisms,pages,templates}`. Look under templates for global providers (AuthParent, EventsParent).
- Timeline event shape: `TimelineEventProps` (src/lib/TimelineType.ts). Many components expect both `start`/`end` (Date) and `start_time`/`end_time` for timeline-compat.
- React Query keys: defined in `src/resources/cache.ts`. Use these helpers for invalidation.
- Avoid mutating fetched objects: queries often transform server payloads into Date instances — prefer non-mutating map to avoid shared-reference bugs (see `src/resources/queries.ts`).
- Token/auth flow: prefer reading from the auth context (useAuthContext) first, then refresh query, then localStorage fallback. Interceptor code was recently fixed to follow this order; follow that pattern when adding network logic.
- No build artifacts in repo: storybook static files should not be committed. If you find build artifacts included, prefer removing them and adding to .gitignore.
- ESLint setup: repo enforces `--max-warnings 0`. Fix lint issues before pushing.
- Keep `console.log` removed — security and noise policy; CI may fail if logs are too noisy.

---

## Where to look first when debugging
- Authentication/token issues: `src/components/templates/AxiosClientProvider.tsx`, `src/lib/AuthInfo.ts`, `src/resources/fetch.ts` (API wrappers).
- Events / timeline issues: `src/hooks/useContextFamily.tsx`, `src/resources/queries.ts`, `src/lib/TmelineData.ts` (watch for typo in filename), `src/lib/TimelineType.ts`.
- Drag & drop / interactions: `src/hooks/useMouseHandle.ts`, `src/hooks/useTimelineDragZoom.ts`.

---

## Automation, CI and tests
- CI should run: `lint`, `testrun`, and `build`. Ensure `eslint` and `tsc` are green.
- Vitest is configured in vite.config.ts; use `vite`-based runner (scripts already wired).

---

## Files from other AI assistants (checked)
No Claude/Cursor/Aider/Cline/Windsurf assistant configs detected in repo root.

---

## Suggested additions for future Copilot sessions
- Add a short top-level README fragment that lists the canonical commands and the main contexts (Auth, Events, Timeline) — Copilot sessions use these to prioritize files.
- Add `docs/architecture/quick-glossary.md` with the canonical shapes (TimelineEventProps) and React Query keys.

---

Created/updated by an automated assistant. Want me to add this file to the repo now? If yes, will write the updated `.github/copilot-instructions.md`. Also: configure an MCP server for Playwright/Browser testing or Storybook visual testing? (yes/no)
