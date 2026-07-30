# Architectural Snapshot: 2026-07-30-04 (Refined)

## Purpose
Granular assessment of architectural modernization and refactoring compared to `origin/main`.

## Removals
- **UI Libraries**: Chakra UI, Radix UI, Emotion, Framer Motion.
- **Legacy Dependencies**: `moment.js`, `dayjs`.
- **Legacy Components/Files**: `src/App.tsx`, `src/DnDApp.tsx`, `src/lib/Theme.ts`, `src/lib/ClickOrDouble.js`, old `CalendarWrapperComponent`.
- **Tooling**: Yarn (replaced by Bun).

## Additions
- **Frameworks/UI**: React 19, Mantine UI v7, Vanilla Extract (styling).
- **Data Layer**: TanStack Query v5, date-fns (standardization).
- **Tooling**: Vite 6, ESLint 9 (Flat Config), Bun.

## Structural & Naming Changes
- **Atomic Design Enforcement**: Components categorized strictly into `molecules/`, `organisms/`, `pages/`, `templates/`.
- **Naming Simplification**:
  - Removed 'Component' suffix across components.
  - Renamed for clarity: `*Component` -> `*Page` (routing wrapper), `*Component` -> `*View` (actual component).
  - Example: `CalendarWrapperComponent` -> `CalendarPage`, `CalendarComponent` -> `CalendarView`.

---

## Phase A–F Refactoring (2026-07-30)

Phase A–F によるコードベース全体のクリーンアップを実施。詳細は [`tasks/task-07/README.md`](../../tasks/task-07/README.md) を参照。

### Phase A: コードベースクレンジング
- **Unused file removal**: `src/App.tsx`, `src/App.css`, `useMouseEvent` hook, `useUpdateDateMutation` hook, `cache` Map in `fetch.ts`.
- **Unused type cleanup** (`src/lib/TimelineType.ts`): `PickDate`, `AuthGuardContext`, `ExcludeQuery`, `PropertyToNumber`, `NumberOfId`, debug `const` declarations, `Option` type — all removed.
- **Commented-out code removal**: 26 files across `lib/`, `hooks/`, `resources/`, `components/` (pages, molecules, organisms, templates).

### Phase B: ESLint Safety Recovery
- Re-enabled 4 disabled ESLint rules as `warn`, fixed all warnings, then promoted to `error`:
  - `@typescript-eslint/no-unused-expressions`
  - `@typescript-eslint/no-unused-vars` (with `argsIgnorePattern: '^_'`)
  - `react-hooks/exhaustive-deps`
  - `no-console`
- **Result**: 0 errors, 0 warnings with `--max-warnings 0`.

### Phase C: Query Consolidation
- Merged `useEventsQuery` and `useEventsQueryForTL` into a single hook with `{ forTimeline?: boolean }` option.
- Both hooks used the same cache key (`eventKeys.all()`) and fetch function (`fetchEventsData`).

### Phase D: Type Safety & Fetch Cleanup
- Promoted all ESLint rules from `warn` to `error`.
- Removed duplicate `Authorization` headers from `src/resources/fetch.ts` — all 6 fetch functions were redundantly setting headers already provided by the Axios interceptor in `AxiosClientProvider.tsx`.

### Phase E: Bug Investigation
- **11PM issue**: `allDayAccessor` not set — react-big-calendar's default treats 23:00–00:00 as all-day. Fix: `allDayAccessor={() => false}`.
- **Timeline overlap**: `stackItems` prop missing on `<Timeline>`. Fix: `stackItems={true}`.
- **Timezone**: `format()` → `new Date()` round-trip is fragile (Safari compatibility). Fix: pass Date objects directly.
- Results documented in [`tasks/task-07/phase-e-findings.md`](../../tasks/task-07/phase-e-findings.md).

### Phase F: Quality Gate — All Passed
| Gate | Result |
|------|--------|
| `bun run lint` | 0 errors, 0 warnings |
| `bun run build` | 0 errors |
| `bun run testrun` | 13 passed, 1 skipped |
| `console.log` count | 0 |

---

## Technical Debt / Cleanup Items
- Remaining legacy `classnames` imports identified in some files (should be migrated to Vanilla Extract or remove).
- Finalize unification of `react-calendar-timeline`.
- ~~`no-console`, `no-unused-vars`, `no-unused-expressions`, `exhaustive-deps` が `'off'`~~ → 全ルール `'error'` に回復済み。

## 微妙な出来だったアーキテクチャファイルの修正

前回のアーキテクチャスナップショット（2026-07-30-04）は以下の理由で「微妙な出来」だった:

1. **Phase A–F の成果が反映されていなかった** — コメントアウトコード・未使用型・未使用フック等の大量削除、ESLint ルールの段階的回復、クエリ統合、fetch ヘッダー共通化といったリファクタリングの実態が記載されていなかった。
2. **コミットが「Consolidated from Phase 1-3」の曖昧な記述のみ** — 具体的な 17 コミットの内訳（A-1〜A-5, B-1〜B-3, C, D-1〜D-6, E, F）が欠落していた。
3. **バグ調査結果が未記載** — 11PM 問題、タイムライン重なり、タイムゾーン問題の原因と修正案がアーキテクチャ文書に反映されていなかった。
4. **ESLint ルールの状態が「off」のまま記載** — 実際は warn → error に段階的に回復済み。

上記を本スナップショットで修正・追記した。

## Commits (Phase A–F, 17 commits)
| Phase | Commit | Message |
|-------|--------|---------|
| A-1 | `5e5480e` | chore: 未使用クラスコンポーネント App.tsx 削除 |
| A-2 | `8ec6975` | chore: 未使用フック useMouseEvent / useUpdateDateMutation 削除 |
| A-3 | `269bc2b` | chore: fetch.ts 未使用 cache Map 削除 |
| A-4 | `99d5fb1` | chore: TimelineType.ts 未使用型とデバッグ定数を整理 |
| A-5 | `a997b18` | chore: lib/ のコメントアウトコード削除 |
| A-5 | `6c53658` | chore: hooks/ のコメントアウトコード削除 |
| A-5 | `33d829f` | chore: resources/ のコメントアウトコード削除 |
| A-5 | `7420efc` | chore: pages/ のコメントアウトコード削除 |
| A-5 | `5a98bc5` | chore: molecules/ のコメントアウトコード削除 |
| A-5 | `3bc5950` | chore: organisms/ のコメントアウトコード削除 |
| A-5 | `afd6380` | chore: templates/ のコメントアウトコード削除 |
| B-1 | `0f8fe43` | chore: no-unused-expressions を warn に戻し修正 |
| B-2 | `174e63a` | chore: no-unused-vars を warn に戻し修正 |
| B-3 | `ad720c3` | chore: exhaustive-deps を warn に戻し依存配列を修正 |
| C | `62a0a02` | refactor: useEventsQuery と useEventsQueryForTL を統合 |
| D | `701fa94` | chore: ESLint ルールを error に引き上げ + fetch ヘッダー共通化 |
| E | `e32564b` | docs: Phase E バグ調査結果 (11PM / 重なり / タイムゾーン) |

## Changed Files (34 source files, -586 lines net)
- `src/App.tsx`, `src/App.css` — deleted
- `src/components/` — 17 files (all layers: pages, molecules, organisms, templates)
- `src/hooks/` — 4 files
- `src/lib/` — 5 files
- `src/resources/` — 4 files
- `src/stories/` — 2 files
- `src/tests/` — 2 files
- `eslint.config.js` — rule configuration
- `storybook-static/` — deleted (68 build artifacts)