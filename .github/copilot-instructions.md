# Copilot Instructions for time-table-to-line

A React + TypeScript + Vite project for timeline/calendar-based event management, featuring drag-and-drop event scheduling and Storybook component documentation.

## Build & Development

**Install dependencies:**
```bash
yarn install
```

**Local development (HMR enabled):**
```bash
yarn dev
```
Runs Vite dev server with ESLint and TypeScript checking overlays.

**Build for production:**
```bash
yarn build
```
Runs TypeScript compiler first, then Vite bundle. Outputs to `/dist`.

**Preview production build locally:**
```bash
yarn preview
```

## Testing & Linting

**Run tests (watch mode):**
```bash
yarn test
```

**Run tests once (CI mode):**
```bash
yarn testrun
```

Tests use Vitest with jsdom environment and Testing Library. Configuration in `vite.config.ts` under the `test` section.

**Lint code:**
```bash
yarn lint
```
Runs ESLint on `src/**/*.{ts,tsx}` with `--max-warnings 0` enforced. See `.eslintrc.cjs` for rules.

**Storybook (component documentation & visual testing):**
```bash
yarn storybook
```
Runs Storybook dev server on port 6006. Stories use Storybook Vitest integration.

## Architecture & Patterns

### Component Organization

Components follow an **Atomic Design** pattern in `src/components/`:

- **`molecules/`** - Simple composed components (e.g., `TimeUpdateButtonComponent`, `EventUpdateButtonComponent`)
- **`organisms/`** - Complex, stateful components (e.g., `Dialog`, `InputItem`)
- **`pages/`** - Full page components (e.g., `CalendarComponent`)
- **`templates/`** - Layout wrappers and providers (e.g., `AuthParent`, `AxiosClientProvider`, `EventsParent`)

### State Management & Hooks

- **Context API** - Used for global state via `useContextFamily` hook
- **React Query** - Integrated via `@tanstack/react-query` for server state (`useSearchQuery`)
- **Custom hooks in `src/hooks/`** - Business logic separation:
  - `useAuthGuard` / `useAuthInfo` - Authentication state
  - `useEventMutation` - Event CRUD operations
  - `useMouseHandle` - Drag-and-drop event handling
  - `useCallingForm` - Dialog/form state management
  - `useTimelineDragZoom` - Timeline interaction utilities

### Styling

- **Vanilla Extract** - CSS-in-JS with zero-runtime via `@vanilla-extract/css` and Sprinkles for utility generation
- CSS files are colocated: `ComponentName.css.ts` next to `ComponentName.tsx`
- Responsive utilities in `src/components/sprinkles.responsive.css.ts`
- Global styles in `src/index.css` and `src/App.css`

### UI Library & Animation

- **Chakra UI** - Component library for modals, buttons, boxes, text
- **Framer Motion** - Animations and interactions
- **React Big Calendar** - Main calendar component with drag-and-drop addon
- **React Calendar Timeline** - Alternative timeline visualization

### Calendar Utilities

- **Moment.js** - Date manipulation (used as localizer for React Big Calendar)
- **Day.js** - Lighter alternative for some date parsing
- **date-fns** - Utility functions for date operations
- Localization setup in `src/lib/Localization.ts`

### Type Definitions

- Event type: `TimelineEventProps` in `src/lib/TimelineType.ts`
- Sample events for development: `src/lib/SampleState.ts`
- All components properly typed with TypeScript (strict: true in `tsconfig.json`)

## Key Conventions

### Testing Patterns

1. **Unit tests** - Test individual hooks and utility functions
2. **Component tests** - Use Storybook Vitest integration via `composeStories()`
3. **Mocking hooks** - Use `vi.mock()` to mock API/context hooks (see `Calendar.spec.tsx` for examples)
4. **Setup files** - Test utilities imported in `src/tests/vitest-setup.ts`

Test file pattern: `ComponentName.spec.tsx` colocated in `/tests` directory.

### Component Export Pattern

- Functional components with `forwardRef` when ref access needed (see `TimesUpdateButton`)
- Use default exports (ESLint allows via config)
- Components exported from `src/components/index.tsx` for convenience

### Event Mutation & Side Effects

- `useEventMutation` returns a mutation object with `.mutate()` method (React Query pattern)
- Batch operations: Pass arrays of event IDs or full event objects
- Reset operations use `setTimeout` for async queue flushing (see `TimeUpdateButtonComponent` pattern)

### Development Environment

- Environment variables loaded from `env/` directory (via Vite `envDir` config)
- `.npmrc` specifies yarn instead of npm
- Yarn v4.3.1 required (enforced in `package.json` engines)

## ESLint Rules & Overrides

- `react-refresh/only-export-components` - Warn only, allows `allowConstantExport`
- `@typescript-eslint/no-unused-vars` - Disabled (watch TypeScript compiler instead)
- `react-hooks/exhaustive-deps` - Disabled (review manually when needed)
- `import/no-default-export` - Disabled (default exports allowed)
- Comments in Japanese allowed and encouraged (matches codebase style)

## Storybook

- Story files: `*.stories.tsx` or `*.stories.mdx`
- Plugins: `@storybook/addon-essentials`, `@storybook/addon-interactions`, `@storybook/addon-onboarding`
- Static output: `storybook-static/`

## Common Dependencies

- Axios for HTTP requests
- classnames for conditional CSS classes
- Interact.js for gesture recognition
- prop-types for runtime prop validation (legacy, alongside TypeScript)
- interactjs for complex drag-and-drop scenarios

## TypeScript Configuration

- **Target:** ES2020
- **JSX:** react-jsx (new JSX transform)
- **Module resolution:** bundler mode
- **Strict mode:** Enabled
- **`noUnusedLocals` / `noUnusedParameters`:** Disabled (let ESLint and TypeScript report separately)
- See `tsconfig.json` and `tsconfig.node.json` for full config
