# Project Overview: vite-timetable4

A React-based time table/calendar application built with TypeScript, Vite, and Mantine UI. It allows authenticated users to manage events through two views: a Calendar (react-big-calendar) and a Timeline (react-calendar-timeline), featuring drag-and-drop scheduling and CRUD operations.

# Technologies

| Category | Technology |
|---|---|
| **Framework** | React 19 + TypeScript 5.7 |
| **Build** | Vite 6 |
| **Package Manager**| **Bun** |
| **Routing** | React Router 7 |
| **State Management**| Context API + @tanstack/react-query 5 |
| **UI Library** | Mantine v7 |
| **Styling** | Vanilla Extract (CSS-in-JS, zero-runtime) |
| **HTTP Client** | Axios 1 |
| **Date Manipulation**| date-fns (primary) |
| **Testing** | Vitest + jsdom + Testing Library |
| **Development** | Storybook 8 |
| **Linting** | ESLint 9 + Prettier 3 |

# Development Workflow

Use **Bun** for all package management and script execution.

- `bun install`: Install dependencies.
- `bun dev`: Start the development server (HMR enabled).
- `bun build`: Build for production (runs `tsc` + `vite build`).
- `bun run lint`: Run ESLint (`--max-warnings 0`).
- `bun test`: Run tests in watch mode.
- `bun run testrun`: Run tests once (CI mode).
- `bun run storybook`: Start Storybook development server (port 6006).
- `bun run build-storybook`: Build Storybook for static deployment.

# Architecture & Conventions

### Component Organization (Atomic Design)
- `molecules/`: Simple composed components (e.g., `EventUpdateButtonComponent`).
- `organisms/`: Complex, stateful components (e.g., `Dialog`, `InputItem`).
- `pages/`: Full page components (e.g., `CalendarComponent`).
- `templates/`: Layout wrappers and providers (e.g., `AuthParent`, `AxiosClientProvider`).

### Coding Standards
- **TypeScript**: Strictly used for all source files.
- **Styling**: All styles must be defined using [Vanilla Extract](https://vanilla-extract.style/) in `.css.ts` files. Colocate `ComponentName.css.ts` with `ComponentName.tsx`.
- **Testing**:
  - Framework: Vitest.
  - Pattern: `src/tests/` or colocated `ComponentName.spec.tsx`.
  - Prefer Storybook component tests using Vitest integration where possible.
- **Linting**: Enforced with `--max-warnings 0`.

### Data Management
- **Server State**: Managed via **TanStack Query** (keys defined in `resources/cache.ts`).
- **Client State**: Managed via **Context API**.

# Refactoring Status

This project is actively undergoing refactoring. Refer to `QWEN.md` for the current roadmap and `requirement-01.md` for known issues and upcoming tasks. Prioritize refactoring to Mantine v7 and standardizing on `date-fns`.
