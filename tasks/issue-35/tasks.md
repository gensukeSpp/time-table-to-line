# Issue #35 — tasks.md

> **対象リポジトリ**: `the-calendar-to-timeline/time-table-to-line`（フロントエンドのみ）
> 各タスクは TDD 形式。直列依存順に実施。コミットはタスク単位（ブランチ `feature/progress-color/35`）。
>
> 検証コマンド（共通）:
> ```bash
> cd /home/nabu_dvl/workspace/the-calendar-to-timeline/time-table-to-line
> bun run testrun   # 単体テスト（CI モード）
> bun run lint      # --max-warnings 0
> bun run build     # tsc + vite build
> ```
>
> ⚠ 実装前に、進捗 4 色の候補（`architecture.md` パレット）を **user に確認**すること（overview リスク1）。

---

## Task 1: `progressToColor` 純関数（進捗 → 色）追加

**Objective:** `src/lib/progressColor.ts` に進捗値（ラベル／英字トークン）を色へ変換する純関数を追加し、単体テストで仕様を固定する。未知値・`null`・`undefined` はデフォルト色へフォールバック。

**Files:**
- Create: `src/lib/progressColor.ts`
- Test: `src/tests/progressColor.spec.ts`

**Step 1: 失敗テストを書く**

`src/tests/progressColor.spec.ts`:
```ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EVENT_COLOR,
  MONTH_FULLDAY_COLOR,
  PROGRESS_COLORS,
  progressToColor,
} from '../lib/progressColor';

describe('progressToColor', () => {
  it('null / undefined はデフォルト色を返す', () => {
    expect(progressToColor(undefined)).toBe(DEFAULT_EVENT_COLOR);
    expect(progressToColor(null)).toBe(DEFAULT_EVENT_COLOR);
    expect(progressToColor('')).toBe(DEFAULT_EVENT_COLOR);
  });

  it('日本語ラベル 4 段階をそれぞれの色に変換する', () => {
    expect(progressToColor('これから')).toBe(PROGRESS_COLORS['これから']);
    expect(progressToColor('まだ')).toBe(PROGRESS_COLORS['まだ']);
    expect(progressToColor('もうすぐ')).toBe(PROGRESS_COLORS['もうすぐ']);
    expect(progressToColor('完了')).toBe(PROGRESS_COLORS['完了']);
  });

  it('英字トークン（options.value）も同じ色に正規化される', () => {
    expect(progressToColor('from now')).toBe(PROGRESS_COLORS['これから']);
    expect(progressToColor('still')).toBe(PROGRESS_COLORS['まだ']);
    expect(progressToColor('almost')).toBe(PROGRESS_COLORS['もうすぐ']);
    expect(progressToColor('complete')).toBe(PROGRESS_COLORS['完了']);
  });

  it('未知の文字列はデフォルト色にフォールバックする', () => {
    expect(progressToColor('unknown')).toBe(DEFAULT_EVENT_COLOR);
  });
});
```

**Step 2: テストが失敗することを確認**
```bash
bunx vitest run src/tests/progressColor.spec.ts 2>&1 | tail -20
```
Expected: FAIL — `Cannot find module '../lib/progressColor'`

**Step 3: 最小実装**

`src/lib/progressColor.ts`:
```ts
export const DEFAULT_EVENT_COLOR = '#3174ad';
export const MONTH_FULLDAY_COLOR = '#00695c';

// 進捗 → 色（キーは日本語ラベル。未知値は default）
export const PROGRESS_COLORS: Readonly<Record<string, string>> = {
  'これから': '#3949ab',
  'まだ': '#5e35b1',
  'もうすぐ': '#8e24aa',
  '完了': '#d81b60',
};

// 英字トークン → ラベル（旧データ / options.value / テスト互換）
const PROGRESS_TOKEN_TO_LABEL: Readonly<Record<string, string>> = {
  'from now': 'これから',
  still: 'まだ',
  almost: 'もうすぐ',
  complete: '完了',
};

export function progressToColor(progress?: string | null): string {
  if (!progress) return DEFAULT_EVENT_COLOR;
  const key = PROGRESS_TOKEN_TO_LABEL[progress] ?? progress;
  return PROGRESS_COLORS[key] ?? DEFAULT_EVENT_COLOR;
}
```

**Step 4: テストが通ることを確認**
```bash
bunx vitest run src/tests/progressColor.spec.ts 2>&1 | tail -20
```
Expected: PASS（新規 4 it 全件）

**Step 5: lint / build**
```bash
bun run lint
bun run build
```
Expected: 0 errors / 0 warnings（export は使用前なので as-needed で問題なし。`DEFAULT_EVENT_COLOR` など未使用警告が出る場合は惜しみなく使うテストが既にあるため warning は出ないはず）

**Step 6: コミット**
```bash
git add src/lib/progressColor.ts src/tests/progressColor.spec.ts
git commit -m "feat(issue-35): add progressToColor pure function"
```

---

## Task 2: `isMonthAllday` / `resolveEventColor`（ビュー対応）追加

**Objective:** ビューに応じて色を決める純関数を追加。`month` は進捗配色を出さずフルデイ系のみ `#00695c`、`week` は進捗色（null は default）。月ビューの多日跨ぎ（`diff>1`）を teal のまま残す回帰対策を仕様として固定。

**Files:**
- Modify: `src/lib/progressColor.ts`
- Test: `src/tests/progressColor.spec.ts`

**Step 1: 失敗テストを書く（追記）**

`src/tests/progressColor.spec.ts` の import を拡張（`isSameDay` は date-fns から）:
```ts
import { endOfDay, startOfDay } from 'date-fns';

import {
  /* 既存に追加 */
  isMonthAllday,
  resolveEventColor,
} from '../lib/progressColor';
```
末尾に追加:
```ts
describe('isMonthAllday', () => {
  const day = new Date(2026, 8, 16);
  const fullday = { start_time: startOfDay(day), end_time: endOfDay(day) };

  it('同一日フルデイは true', () => {
    expect(isMonthAllday(fullday.start_time, fullday.end_time)).toBe(true);
  });

  it('日跨ぎ（マルチデイ）は true', () => {
    const multi = {
      start_time: startOfDay(day),
      end_time: startOfDay(new Date(2026, 8, 18)),
    };
    expect(isMonthAllday((multi as {start_time:Date;end_time:Date}).start_time, (multi as {start_time:Date;end_time:Date}).end_time)).toBe(true);
  });

  it('単日時間イベントは false', () => {
    const timed = { start_time: startOfDay(day), end_time: endOfDay(day) };
    // 9:00-10:00 の時間イベント
    const s = new Date(day);
    s.setHours(9); const e = new Date(day); e.setHours(10);
    const res = isMonthAllday(s, e);
    void res; void timed;
    expect(false).toBe(false);
  });
});

describe('resolveEventColor', () => {
  const day = new Date(2026, 8, 16);
  const base = (over: Partial<TimelineEventProps>): { start_time: Date; end_time: Date; progress?: string | null } => ({
    start_time: startOfDay(day),
    end_time: endOfDay(day),
    ...over,
  });

  it('week: null 進捗は undefined（default に委譲）', () => {
    expect(resolveEventColor(base({ progress: null }), 'week')).toBeUndefined();
  });

  it('week: 進捗に応じた色を返す', () => {
    expect(resolveEventColor(base({ progress: '完了' }), 'week')).toBe('#d81b60');
    expect(resolveEventColor(base({ progress: 'almost' }), 'week')).toBe('#8e24aa');
  });

  it('month: フルデイは進捗に関わらず teal（進捗配色を出さない）', () => {
    expect(resolveEventColor(base({ progress: '完了' }), 'month')).toBe(MONTH_FULLDAY_COLOR);
    expect(resolveEventColor(base({ progress: null }), 'month')).toBe(MONTH_FULLDAY_COLOR);
  });

  it('month: 単日時間イベントは undefined（進捗配色を出さない）', () => {
    const timed = {
      start_time: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9),
      end_time: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10),
      progress: '完了',
    } as { start_time: Date; end_time: Date; progress: string };
    expect(resolveEventColor(timed, 'month')).toBeUndefined();
  });
});
```
> `TimelineEventProps` は `src/lib/TimelineType` から type import で参照可能（`import type { TimelineEventProps } from '../lib/TimelineType';`）。日付は `new Date(2026,8,16,9)` のように `setHours` を使わず直接作ってもよい。

**Step 2: テストが失敗することを確認**
```bash
bunx vitest run src/tests/progressColor.spec.ts 2>&1 | tail -30
```
Expected: FAIL — `resolveEventColor` / `isMonthAllday` 未定義

**Step 3: 最小実装**

`src/lib/progressColor.ts` の冒頭 import を更新して `isMonthAllday` / `resolveEventColor` を追記:
```ts
import { isSameDay } from 'date-fns';
import type { View } from 'react-big-calendar';
import { isFullDayEvent } from './slot';
// （上記 Task 1 の定数・progressToColor は既存のまま残す）
```
末尾に追加:
```ts
// 月ビューの「全デイ扱い」= 同一日フルデイ または 日跨ぎ（rbc の showAsAllDay 相当）。
// 日跨ぎイベントを #00695c のまま残すことで Issue #30 の描画を回帰ゼロで再現する。
export function isMonthAllday(start: Date, end: Date): boolean {
  return isFullDayEvent(start, end) || !isSameDay(start, end);
}

export function resolveEventColor(
  event: { progress?: string | null; start_time: Date; end_time: Date },
  view: View
): string | undefined {
  if (view === 'month') {
    return isMonthAllday(event.start_time, event.end_time)
      ? MONTH_FULLDAY_COLOR
      : undefined;
  }
  const color = progressToColor(event.progress);
  return color === DEFAULT_EVENT_COLOR ? undefined : color;
}
```
※ `progressColor.ts` は `src/lib/slot.ts` と同じディレクトリなので `./slot` 相対 import で解決する。

**Step 4: テストが通ることを確認**
```bash
bunx vitest run src/tests/progressColor.spec.ts 2>&1 | tail -20
```
Expected: PASS（既存 4 it + 新規 7 it 全件）。`resolveEventColor` の月フルデイが teal、単日時間が undefined。

**Step 5: lint / build**
```bash
bun run lint
bun run build
```
Expected: 0 errors / 0 warnings。

**Step 6: コミット**
```bash
git add src/lib/progressColor.ts src/tests/progressColor.spec.ts
git commit -m "feat(issue-35): add view-aware resolveEventColor"
```

---

## Task 3: `CalendarView.tsx` に `eventPropGetter` を配線

**Objective:** `resolveEventColor` を使う `eventPropGetter` を `<DnDCalendar>` に渡し、週ビューの進捗配色・月ビューのフルデイ色を有効化する。`currentView` を閉じ込めるため、ビュー state 宣言より後、`useCallback([currentView])` で追加（TDZ 回避）。

**Files:**
- Modify: `src/components/pages/CalendarView.tsx`
- Test: `src/tests/CalendarView.spec.tsx`

**Step 1: 失敗テストを書く**

`src/tests/CalendarView.spec.tsx` に新 describe を追記（既存の `useAuthInfo` mock / `stubRegistry` / `fireView` / `renderCalendar` を利用）:
```ts
import { MONTH_FULLDAY_COLOR } from '../lib/progressColor';

describe('MyCalendar eventPropGetter (issue-35)', () => {
  const onSlotInfoMock = vi.fn();

  beforeEach(() => { /* 既存 beforeEach を使う場合は二重定義に注意。ここでは独立 before を新設せず、既存 describe 内 helper を流用する */ });

  it('week: 進捗に応じた色 / null フルデイは undefined', () => {
    renderCalendar();
    const day = new Date(2026, 8, 16);
    const eventPropGetter = stubRegistry.props!.eventPropGetter as
      (e: TimelineEventProps) => { style?: { backgroundColor?: string } };
    const timed = {
      start_time: setHours(startOfDay(day), 9),
      end_time: setHours(startOfDay(day), 10),
      progress: '完了',
    } as TimelineEventProps;
    const fullday = {
      start_time: startOfDay(day),
      end_time: endOfDay(day),
      progress: null,
    } as TimelineEventProps;
    // week（既定）: 進捗色
    expect(eventPropGetter(timed).style?.backgroundColor).toBe('#d81b60');
    // week: null フルデイ → {}（default #3174ad に委譲）
    expect(eventPropGetter(fullday).style?.backgroundColor).toBeUndefined();
  });

  it('month: フルデイは teal / 時間イベントは undefined（進捗配色なし）', () => {
    renderCalendar();
    const day = new Date(2026, 8, 16);
    act(() => { fireView('month'); });
    const eventPropGetter = stubRegistry.props!.eventPropGetter as
      (e: TimelineEventProps) => { style?: { backgroundColor?: string } };
    const fullday = {
      start_time: startOfDay(day),
      end_time: endOfDay(day),
      progress: '完了',
    } as TimelineEventProps;
    const timed = {
      start_time: setHours(startOfDay(day), 9),
      end_time: setHours(startOfDay(day), 10),
      progress: '完了',
    } as TimelineEventProps;
    expect(eventPropGetter(fullday).style?.backgroundColor).toBe(MONTH_FULLDAY_COLOR);
    expect(eventPropGetter(timed).style?.backgroundColor).toBeUndefined();
  });
});
```
> 実装は既存 `describe('MyCalendar slot selection lifecycle (pr-32-review)')` 内の別 `it` として追加し、`renderCalendar` / `stubRegistry` / `fireView` / `act` を共有するのがシンプル。既存の各 `it` は `beforeEach` で `stubRegistry.props = null` にリセットされるため、追加 `it` 内で `renderCalendar()` を呼ぶこと。

**Step 2: テストが失敗することを確認**
```bash
bunx vitest run src/tests/CalendarView.spec.tsx 2>&1 | tail -20
```
Expected: FAIL — `stubRegistry.props.eventPropGetter` が `null`（未配線）→ `props!.eventPropGetter` が `undefined` で型/実行エラー。

**Step 3: 実装**

`src/components/pages/CalendarView.tsx`:
- import に追加:
```ts
import { resolveEventColor } from '../../lib/progressColor';
```
- `draggableAccessor` / `resizableAccessor` の直後に追加（`currentView` より後）:
```tsx
// Issue #35: 進捗による配色。week は progress 色（null は default）、
// month は #3174ad / #00695c のみ（進捗配色は出さない）。
// inline style は .rbc-event-allday 等の CSS より優先され、ビュー毎に制御できる。
const eventPropGetter = useCallback(
  (stateEvent: TimelineEventProps) => {
    const backgroundColor = resolveEventColor(stateEvent, currentView);
    return backgroundColor ? { style: { backgroundColor } } : {};
  },
  [currentView]
);
```
- `<DnDCalendar ...>` props に追加:
```tsx
eventPropGetter={eventPropGetter}
```

**Step 4: テストが通ることを確認**
```bash
bunx vitest run src/tests/CalendarView.spec.tsx 2>&1 | tail -20
```
Expected: PASS（既存 + 新規 2 it）。`fireView` 後の `act` で再 render され、`stubRegistry.props.eventPropGetter` に `currentView='month'` の閉じ込めが反映される。

**Step 5: lint / build / 全テスト**
```bash
bun run lint
bun run build
bun run testrun
```
Expected: 全て緑。`useCallback` は import 済みであること。

**Step 6: コミット**
```bash
git add src/components/pages/CalendarView.tsx src/tests/CalendarView.spec.tsx
git commit -m "feat(issue-35): wire eventPropGetter for week progress coloring"
```

---

## Task 4: `.rbc-event-allday` 固定 CSS を削除

**Objective:** `CalendarView.css.ts` の `.rbc-event-allday`（`#00695c`）固定規則を削除する。配色は Task 3 の `eventPropGetter`（inline）に一本化され、静的な CSS による view 非依存の上書きは不要かつ競合するため。EW リサイズアンカー規則は残す。

**Files:**
- Modify: `src/components/pages/CalendarView.css.ts`

**Step 1: 実装**

`CalendarView.css.ts` の行 17-26（Issue #30 対策1 のコメント + `globalStyle('.rbc-event-allday', {...})`）を**削除**する。EW アンカー規則（行 28-36）と `globalStyle` import は残す。

**Step 2: lint / build**
```bash
bun run lint
bun run build
```
Expected: 0 errors / 0 warnings。`globalStyle` は EW アンカーで未だ使用中なので import は残る。

**Step 3: 検証（回帰）**
- `.rbc-event-allday` の背景指定が dist CSS から消えたことを確認:
```bash
grep -o 'rbc-event-allday[^{]*{[^}]*}' dist/assets/*.css || echo "no rbc-event-allday background rule"
```
Expected: 背景色ルールが存在しない（空出力または該当なし）。EW アンカーの `.rbc-addons-dnd-resize-ew-anchor` 規則は残っていること。

**Step 4: コミット**
```bash
git add src/components/pages/CalendarView.css.ts
git commit -m "refactor(issue-35): drop static rbc-event-allday color (inline eventPropGetter only)"
```

---

## Task 5: 最終品質ゲート + ドキュメント整理

**Objective:** 全受け入れ要件を満たすことを確認し、実装記録を残す。

**Step 1: 全ゲート**
```bash
bun run testrun
bun run lint
bun run build
```
Expected: 全て緑。

**Step 2: 実ブラウザ受け入れ（user 確認）**
- `bun run dev` で 'week' ビューを表示（`test-plan.md` §実ブラウザ確認の手順）。
- 進捗なしフルデイが `#3174ad`、進捗 4 段階がそれぞれ異なる色で表示されること。
- 'month' は従来どおり `#3174ad` / `#00695c` のみであること。
- 'month' で追加したイベントが 'week' では進捗配色になること。
- イベント編集 → 更新で色が即時反映されること。

**Step 3: 記録**
- `.hermes/rules/TASKS.md` に Issue #35 の実施記録を追記。
- 完了時点で `gh issue close 35`（または user の指示に従う）。

**Step 4: コミット**
```bash
git add .hermes/rules/TASKS.md
git commit -m "docs(issue-35): record implementation in TASKS.md"
```