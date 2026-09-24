# Issue #30 — tasks.md

> **対象リポジトリ**: `the-calendar-to-timeline/time-table-to-line`（フロントエンドのみ）
> 各タスクは TDD 形式。直列依存順に実施。コミットはタスク単位。

検証コマンド（共通）:
```bash
bun run testrun   # 単体テスト（CI モード）
bun run lint      # --max-warnings 0
bun run build     # tsc + vite build
```

---

## Task 1: `shouldBlockMonthDnd` 純関数を追加する

**Objective:** 'month' ビューかつフルデイでないイベントを判定する純関数を `src/lib/slot.ts` に追加し、単体テストで仕様を固定する。

**Files:**
- Modify: `src/lib/slot.ts`
- Test: `src/tests/slot.spec.ts`

**Step 1: 失敗テストを書く**

`src/tests/slot.spec.ts` の import に追加:
```ts
import { resolveSlotEnd, resolveEventEnd, isFullDayEvent, shouldBlockMonthDnd } from '../lib/slot';
```
末尾に describe を追加:
```ts
describe('shouldBlockMonthDnd', () => {
  const day = new Date(2026, 8, 16);
  const fullday = {
    start_time: startOfDay(day),
    end_time: endOfDay(day),
  };
  const timed = {
    start_time: setHours(startOfDay(day), 9),
    end_time: setHours(startOfDay(day), 10),
  };

  it('month ビュー + フルデイイベントはブロックしない', () => {
    expect(shouldBlockMonthDnd(fullday, 'month')).toBe(false);
  });

  it('month ビュー + 時間イベントはブロックする', () => {
    expect(shouldBlockMonthDnd(timed, 'month')).toBe(true);
  });

  it('week ビューは時間イベントでもブロックしない', () => {
    expect(shouldBlockMonthDnd(timed, 'week')).toBe(false);
  });

  it('month 以外の view（agenda）はブロックしない', () => {
    expect(shouldBlockMonthDnd(timed, 'agenda')).toBe(false);
  });
});
```

**Step 2: テストが失敗することを確認**
```bash
cd /home/nabu_dvl/workspace/the-calendar-to-timeline/time-table-to-line
bunx vitest run src/tests/slot.spec.ts 2>&1 | tail -20
```
Expected: FAIL — `shouldBlockMonthDnd is not defined`（import できない）

**Step 3: 最小実装**

`src/lib/slot.ts` の import を更新（`View` を type import で追加）:
```ts
import { addHours, endOfDay, min, startOfDay, isSameDay, isSameMinute } from 'date-fns';
import type { View } from 'react-big-calendar';
```
末尾に追加:
```ts
/**
 * Issue #30: 'month' ビューではフルデイイベント以外（時間ごとのイベント）の
 * ドラッグ（移動）・リサイズ（伸縮）を不可にする判定。
 * rbc の draggableAccessor / resizableAccessor に「! を付けて」渡す。
 *
 * view === 'month' かつ isFullDayEvent でない → true（DnD をブロック）。
 * 'week' の時間列（縦リサイズ・移動）には影響しない。
 */
export function shouldBlockMonthDnd(
  event: { start_time: Date; end_time: Date },
  view: View
): boolean {
  return view === 'month' && !isFullDayEvent(event.start_time, event.end_time);
}
```

**Step 4: テストが通ることを確認**
```bash
bunx vitest run src/tests/slot.spec.ts 2>&1 | tail -20
```
Expected: PASS（新規 4 件 + 既存 全件）

**Step 5: lint / build**
```bash
bun run lint
bun run build
```
Expected: 0 errors / 0 warnings（`View` は type import なので as-needed で問題なし。もし `Verbose` で warning が出たら `import type` を維持）

**Step 6: コミット**
```bash
git add src/lib/slot.ts src/tests/slot.spec.ts
git commit -m "feat(issue-30): add shouldBlockMonthDnd for month-view time-event DnD block"
```

---

## Task 2: `draggableAccessor` / `resizableAccessor` を `DnDCalendar` に配線し、旧 `eventPropGetter` を削除

**Objective:** 'month' ビューで時間イベントの DnD（移動・リサイズ）を無効化する。不要になった自他判定 `eventPropGetter` を削除する。

**Files:**
- Modify: `src/components/pages/CalendarView.tsx`
- Test: `src/tests/CalendarView.spec.tsx`

**Step 1: 実装**

`CalendarView.tsx` の import に追加:
```ts
import { isFullDayEvent, shouldBlockMonthDnd } from '../../lib/slot';
```
※ 既存 `import { isFullDayEvent } from '../../lib/slot';` に `shouldBlockMonthDnd` を足す形。

`eventPropGetter`（`34-51` 行、`uncontrolStyle` / `controlStyle` / `eventPropGetter` の定義）を**削除**し、`withDragAndDrop` の下にアクセサを追加:
```tsx
const DnDCalendar = withDragAndDrop(Calendar<TimelineEventProps>);
const { onEventResize, onEventDrop, eventList } = useMouseEvents();

// Issue #30: 'month' ビューの時間イベントへの DnD（移動・リサイズ）を無効化。
// closure で currentView を参照するため、ビュー切替で作り直される（再レンダー1回）。
const draggableAccessor = useCallback(
  (event: TimelineEventProps) => !shouldBlockMonthDnd(event, currentView),
  [currentView]
);
const resizableAccessor = useCallback(
  (event: TimelineEventProps) => !shouldBlockMonthDnd(event, currentView),
  [currentView]
);
```

`<DnDCalendar ...>` の props を変更:
```tsx
allDayAccessor={(stateEvent: TimelineEventProps) => isFullDayEvent(stateEvent.start_time, stateEvent.end_time)}
draggableAccessor={draggableAccessor}
resizableAccessor={resizableAccessor}
resizable
// eventPropGetter={eventPropGetter}
onEventDrop={onEventDrop}
```
- `resizable` は global のまま（per-event は `resizableAccessor` で絞る）
- `eventPropGetter` 行は削除

補足: `TimelineEventProps` の `isDraggable` フィールドは DnD に直接効いておらず、fluent 実装の `draggableAccessor` が正。既存の `useMouseHandle` の `isDraggable: true` は編集用オブジェクトのフラグなので変更不要。

**Step 2: テストを追加**

`src/tests/CalendarView.spec.tsx` の `describe('MyCalendar ...')` 内に追加（`stubRegistry.props` からアクセサを取り検証。既存の stub 構成でそのまま使える）:
```ts
it('アクセサは month ビューで時間イベントの DnD を無効化する', () => {
  renderCalendar();
  const day = new Date(2026, 8, 16);
  const timed = {
    start_time: setHours(startOfDay(day), 9),
    end_time: setHours(startOfDay(day), 10),
  } as TimelineEventProps;
  const fullday = {
    start_time: startOfDay(day),
    end_time: endOfDay(day),
  } as TimelineEventProps;

  // 既定 view は week → 時間イベントも操作可
  let props = stubRegistry.props as {
    draggableAccessor: (e: TimelineEventProps) => boolean;
    resizableAccessor: (e: TimelineEventProps) => boolean;
  };
  expect(props.draggableAccessor(timed)).toBe(true);
  expect(props.resizableAccessor(timed)).toBe(true);

  // month に切替 → 時間イベントだけ操作不可、フルデイは可
  act(() => { fireView('month'); });
  props = stubRegistry.props as {
    draggableAccessor: (e: TimelineEventProps) => boolean;
    resizableAccessor: (e: TimelineEventProps) => boolean;
  };
  expect(props.draggableAccessor(timed)).toBe(false);
  expect(props.resizableAccessor(timed)).toBe(false);
  expect(props.draggableAccessor(fullday)).toBe(true);
  expect(props.resizableAccessor(fullday)).toBe(true);
});
```
※ 既存の `describe` 冒頭の `endOfDay, setHours, startOfDay` は import 済み、`act` / `fireView` / `stubRegistry` も利用可能。

**Step 3: テストが通ることを確認**
```bash
bunx vitest run src/tests/CalendarView.spec.tsx 2>&1 | tail -20
```
Expected: PASS（既存 + 新規）

**Step 4: lint / build / 全テスト**
```bash
bun run lint
bun run build
bun run testrun
```
Expected: 全て緑。`useCallback` は既に import 済みであること。`eventPropGetter` 削除後、未使用 import が残らないこと。

**Step 5: コミット**
```bash
git add src/components/pages/CalendarView.tsx src/tests/CalendarView.spec.tsx
git commit -m "feat(issue-30): block DnD on time events in month view via accessors"
```

---

## Task 3: 対策 1 — `.rbc-event-allday`（フルデイイベント）の色分け CSS

**Objective:** フルデイイベントをデフォルト色 `#3174ad` から区別する色にする。赤・紫系統（マイルストーン色）を避け、白抜き文字が読める濃色を選ぶ。

**Files:**
- Modify: `src/components/pages/CalendarView.css.ts`

**Step 1: 実装**

`CalendarView.css.ts` の import を `globalStyle` 込みに変更:
```ts
import { globalStyle, style } from '@vanilla-extract/css';
```
末尾（`gridArea` の後）に追加:
```ts
// Issue #30 - 対策1: フルデイイベントの色分け。
// デフォルト .rbc-event の #3174ad から区別し、赤・紫（マイルストーン色）を避け、
// 白抜き文字（rbc 既定 color:#fff）が読める濃色にする。候補 #00695c（Teal 800）。
globalStyle(':global(.rbc-event-allday)', {
  backgroundColor: '#00695c',
});
```
- `.rbc-event-allday` は Issue #29 で `allDayAccessor`＝`isFullDayEvent` 経由で付与済み。CSS が単一情報源になる
- **注**: 色の最終決定はユーザーと確認する（overview.md のリスク4 参照）。候補: `#00695c`（Teal 800）/ `#2e7d32`（Green 800）

**Step 2: 検証（実ブラウザ）**
- `bun run dev` で 'month' ビュー表示
- フルデイイベント（Issue #29 の `0:00–23:59`）が `#00695c` 表示、時間イベントは `#3174ad` のまま区別できること
- 白い文字が読めること（候補色で沈む場合は `color` を明示）
- マイルストーン色（赤・紫）と紛らわしくないこと

**Step 3: lint / build**
```bash
bun run lint
bun run build
```

**Step 4: コミット**
```bash
git add src/components/pages/CalendarView.css.ts
git commit -m "style(issue-30): distinguish full-day events with allday color"
```

---

## Task 4: 対策 3 — EW リサイズアンカーのヒット領域拡大 + z-index

**Objective:** 'month' ビューで隣セルにイベントがあっても、フルデイイベントの横リサイズハンドルを確実に掴めるようにする。`eventPropGetter` の width 縮小は**使わない**（時間列で上書きされ効果がなく、行セグメントではグリッド配置が崩れるため。architecture.md 参照）。

**Files:**
- Modify: `src/components/pages/CalendarView.css.ts`

**Step 1: 実装**

`CalendarView.css.ts` に追加:
```ts
// Issue #30 - 対策3: EW リサイズアンカーのヒット領域拡大 + 隣イベントより上に。
// dnd styles.css の既定は中身（3px の icon）しか当たり判定がなく、z-index 未指定のため、
// 隣スロットのイベントと重なると掴めない。幅を持たせ、上に重ねる。
globalStyle(':global(.rbc-addons-dnd-resize-ew-anchor)', {
  width: '20px',
  zIndex: 2,
});
```
- アンカーは `.rbc-event` 内の `position:absolute` 要素（`styles.css:49-59`）。`width` を与えると click 判定域が広がる
- 広げすぎるとイベント選択（onClick）を邪魔するため、実ブラウザで最小値に調整

**Step 2: 検証（実ブラウザ）**
- 'month' ビューで、隣のセルに別イベントがあるフルデイイベントを用意
- EW ハンドル（右端）でリサイズが拾えること（カーソル `ew-resize`、ドラッグで端が動く）
- リサイズ対象外（対策2で無効化された時間イベント）にはアンカーが出ないこと
- イベントクリック（詳細ダイアログ）がアンカー拡大で邪魔されないこと

**Step 3: lint / build**
```bash
bun run lint
bun run build
```

**Step 4: コミット**
```bash
git add src/components/pages/CalendarView.css.ts
git commit -m "style(issue-30): widen EW resize anchor hit area for month view"
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
Expected: 全て緑

**Step 2: 実ブラウザ受け入れ（user 確認）**
- 'month': 時間イベントのリサイズ不可 / フルデイは EW で伸縮可（隣にイベントがあっても）
- 'month': 時間イベントの移動（ドラッグ）も不可
- 'week': 時間列の移動・縦リサイズが従来どおり
- 'week': フルデイイベントは `.rbc-row`（バンド行）に表示、`.rbc-event-allday` 色がついていること

**Step 3: 記録**
- `.hermes/rules/TASKS.md` に Issue #30 の実施記録を追記（該当行が無ければ末尾）
- 本タスク群の完了時点で `gh issue close 30`（または user の指示に従う）

**Step 4: コミット**
```bash
git add .hermes/rules/TASKS.md
git commit -m "docs(issue-30): record implementation in TASKS.md"
```