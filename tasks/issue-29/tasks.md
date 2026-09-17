# Issue #29 — tasks.md

実装タスク（TDD・bite-sized）。直列依存順に実施する。各タスクの後に品質ゲート（`bun run lint` / `bun run build` を可能な範囲で）と commit を行う。

> **検証コマンド（共通）**
> ```bash
> bun run testrun    # 単体テスト 1 回実行
> bun run lint       # --max-warnings 0
> bun run build      # tsc + vite build
> ```

---

### Task 1: `isFullDayEvent` 純関数を作る（RED → GREEN）

**Objective:** フルデイイベント（start=0:00, end=当日 23:59）を判定する純関数を追加する。

**Files:**
- Modify: `src/lib/slot.ts`
- Test: `src/lib/slot.spec.ts`（既存の `resolveSlotEnd` テストに追記）

**Step 1: 失敗するテストを書く**（`src/lib/slot.spec.ts`）
```ts
import { describe, expect, it } from 'vitest';
import { setHours, startOfDay, endOfDay } from 'date-fns';
import { resolveSlotEnd, resolveEventEnd, isFullDayEvent } from '../lib/slot';

describe('isFullDayEvent', () => {
  it('フルデイ（0:00–当日 23:59）は true', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    expect(isFullDayEvent(start, endOfDay(start))).toBe(true);
  });
  it('week 作成イベント（9:00–10:00）は false', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 9);
    expect(isFullDayEvent(start, new Date(start.getTime() + 3600000))).toBe(false);
  });
  it('23:00–23:59 の week イベントは false（start が 0:00 でない）', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 23);
    expect(isFullDayEvent(start, endOfDay(start))).toBe(false);
  });
  it('既存 date-only（0:00–0:00）は false（end が 23:59 でない）', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    expect(isFullDayEvent(start, start)).toBe(false);
  });
  it('日跨ぎは false', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    const end = startOfDay(new Date(2026, 8, 18));
    expect(isFullDayEvent(start, end)).toBe(false);
  });
});
```
**Step 2: 実行して失敗を確認**
Run: `bunx vitest run src/lib/slot.spec.ts`
Expected: FAIL — `isFullDayEvent` は未定義（`cannot find name` / import error）

**Step 3: 最小実装**（`src/lib/slot.ts` に追加。import は `addHours, endOfDay, startOfDay, isSameMinute, isSameDay, min`）
```ts
export function isFullDayEvent(start: Date, end: Date): boolean {
  return isSameMinute(start, startOfDay(start))
      && isSameDay(start, end)
      && isSameMinute(end, endOfDay(start));
}
```
**Step 4: 通過を確認**
Run: `bunx vitest run src/lib/slot.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/slot.ts src/lib/slot.spec.ts
git commit -m "feat(issue-29): add isFullDayEvent predicate for month-created full-day events"
```

---

### Task 2: `resolveEventEnd` 純関数を作る

**Objective:** `fullDay` なら `endOfDay`、でなければ従来の `resolveSlotEnd` を返す関数を追加する（月/週の作成分岐を純関数化して単体テスト可能にする）。

**Files:**
- Modify: `src/lib/slot.ts`
- Test: `src/lib/slot.spec.ts`

**Step 1: テスト追記**
```ts
describe('resolveEventEnd', () => {
  it('fullDay=true なら endOfDay を返す', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    expect(resolveEventEnd(start, true)).toEqual(endOfDay(start));
  });
  it('fullDay=false なら従来の resolveSlotEnd と同一', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 9);
    expect(resolveEventEnd(start, false)).toEqual(resolveSlotEnd(start));
  });
  it('fullDay=false で 23:00 は同日 endOfDay に丸まる（11PM 問題の挙動維持）', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 23);
    expect(resolveEventEnd(start, false)).toEqual(endOfDay(start));
  });
});
```
**Step 2: 実行（失敗）→ Step 3: 実装 → Step 4: 実行（通過）**
```ts
export function resolveEventEnd(slotStartTime: Date, fullDay: boolean): Date {
  return fullDay ? endOfDay(slotStartTime) : resolveSlotEnd(slotStartTime);
}
```
Run: `bunx vitest run src/lib/slot.spec.ts` → PASS

**Step 5: Commit**
```bash
git add src/lib/slot.ts src/lib/slot.spec.ts
git commit -m "feat(issue-29): add resolveEventEnd for month full-day / week branch"
```

---

### Task 3: `CalendarActionProps.onSlotInfo` に `view` を追加（型変更）

**Objective:** スロットクリック時に「どのビューでクリックしたか」を親へ伝えられるようにする。

**Files:**
- Modify: `src/lib/TimelineType.ts`

**Step 1: 型変更**
```ts
import { Event, SlotInfo, View } from 'react-big-calendar';
...
export interface CalendarActionProps {
  onTimeChangeEvents?: (movedEvents: TimelineEventProps[]) => void
  onSlotInfo?: (selectedSlot: SlotInfo, view: View) => void   // view 追加
}
```
**Step 2: 型チェック**
Run: `bun run build`
Expected: 変更箇所は未配線のため現状では同シグネチャの実装がまだない → 後続 Task で配線。ここでは既存モック（`() => {}` / `action(...)`）が互換であることを tsc が許すことのみ確認。エラーが出るなら後続 Task の順序で吸収（配線後）。

**Step 3: Commit**
```bash
git add src/lib/TimelineType.ts
git commit -m "feat(issue-29): extend onSlotInfo callback with current view"
```

---

### Task 4: `CalendarView` で `onSlotInfo` に `currentView` を渡す + `allDayAccessor` を更新

**Objective:** スロット情報とともにビュー種別を親へ渡し、フルデイイベントを rbc に `allDay` として認識させる。

**Files:**
- Modify: `src/components/pages/CalendarView.tsx`

**Step 1: `onSlotInfo` 呼び出しに view を渡す**（ii の useEffect 内、currentView を deps に追加）
```tsx
useEffect(() => {
  onSlotInfo?.(slotInfoState!, currentView);
}, [onSelectSlot, slotInfoState, onSlotInfo, currentView]);
```
**Step 2: `allDayAccessor` をフルデイ判定へ**
```tsx
// import 追加
import { isFullDayEvent } from '../../lib/slot';
...
allDayAccessor={(stateEvent: TimelineEventProps) =>
  isFullDayEvent(stateEvent.start_time, stateEvent.end_time)}
```
（従来の `() => false` を置換。フルデイ以外は false のまま。）

**Step 3: 型チェックと単体テスト**
Run: `bun run build && bunx vitest run`
Expected: 既存 `Calendar.spec.tsx` に影響が出ないこと（時間イベントのみを使うなら allDay は false のまま）。壊れたら `src/tests/Calendar.spec.tsx` をコメントで修正内容を確認してから直す。

**Step 4: Commit**
```bash
git add src/components/pages/CalendarView.tsx src/tests/Calendar.spec.tsx
git commit -m "feat(issue-29): pass view via onSlotInfo; mark full-day events as allDay"
```

---

### Task 5: `CalendarPage` で view を捕捉し `DialogOnSlot` へ渡す

**Objective:** 月/週の区別をダイアログまで届ける。

**Files:**
- Modify: `src/components/pages/CalendarPage.tsx`

**Step 1: 状態を `{ slotInfo, view }` に拡張**
```tsx
import { SlotInfo, View } from 'react-big-calendar';
...
const [slotPicker, setSlotPicker] = useState<{ slotInfo?: SlotInfo; view?: View }>({});
...
<MyCalendar
  onTimeChangeEvents={childData => setMovedEvents(childData)}
  onSlotInfo={(childSlotInfo, view) => setSlotPicker({ slotInfo: childSlotInfo, view })}
/>
...
<DialogOnSlot slotInfo={slotPicker.slotInfo} view={slotPicker.view} />
```
**Step 2: 型チェック**
Run: `bun run build`
Expected: PASS

**Step 3: Commit**
```bash
git add src/components/pages/CalendarPage.tsx
git commit -m "feat(issue-29): capture view in CalendarPage and forward to DialogOnSlot"
```

---

### Task 6: `DialogOnSlot` に `view` prop を追加して `TitleInput` に `isMonth` を渡す

**Objective:** ダイアログが月/週の別を知る。

**Files:**
- Modify: `src/components/organisms/DialogOnSlot.tsx`

**Step 1: prop 追加と受け渡し**
```tsx
import { SlotInfo, View } from "react-big-calendar";
interface SlotOpenProps {
  slotInfo?: SlotInfo,
  view?: View,
}
export const DialogOnSlot = ({ slotInfo, view }: SlotOpenProps) => {
  ...
  const isMonth = view === 'month';
  ...
  <TitleInput authInfo={guard} slotStartTime={slotInfo.start}
    isMonth={isMonth} closeDialog={handleClose} />
```
**Step 2: 型チェック**
Run: `bun run build`
Expected: PASS（`TitleInput` に `isMonth` がまだ無いため仮エラー → 次の Task 7 で追加）

**Step 3: Commit**
```bash
git add src/components/organisms/DialogOnSlot.tsx
git commit -m "feat(issue-29): pass isMonth from DialogOnSlot to TitleInput"
```

---

### Task 7: `TitleInput` を月ビューでフルデイ作成に（`resolveEventEnd` 適用）

**Objective:** 月クリック時は `end = endOfDay(0:00) = 23:59` でイベントを作成する。

**Files:**
- Modify: `src/components/organisms/InputTitleDialog.tsx`

**Step 1: prop と end 計算を変更**
```tsx
import { resolveEventEnd, resolveSlotEnd } from '../../lib/slot';  // resolveSlotEnd import を置換
interface TitleInputProps {
  authInfo: AuthInfoProp,
  slotStartTime: Date,
  isMonth: boolean,          // 追加
  closeDialog: () => void
}
export const TitleInput = ({ authInfo, slotStartTime, isMonth, closeDialog }: TitleInputProps) => {
  ...
  const startTime = slotStartTime;
  const endTime = resolveEventEnd(slotStartTime, isMonth);   // month → endOfDay
  ...
```
（`resolveSlotEnd` の直接 import は不要になるため削除し、lint の未使用 import 警告を避ける。）

**Step 2: 型チェック + 単体テスト**
Run: `bun run build && bunx vitest run src/lib/slot.spec.ts`
Expected: PASS

**Step 3: Commit**
```bash
git add src/components/organisms/InputTitleDialog.tsx
git commit -m "feat(issue-29): create full-day event from month slot in TitleInput"
```

---

### Task 8: `TitleInput` の作成ペイロード単体テスト（月ビュー）

**Objective:** `isMonth=true` のとき mutation に `end_time = endOfDay` が渡ることを、フックをモックして検証する。

**Files:**
- Create: `src/tests/TitleInput.spec.tsx`

**Step 1: テスト（provider 構成は `src/tests/InputItem.spec.tsx` に倣う）**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { endOfDay } from 'date-fns';

vi.mock('../../hooks/useEventMutation', () => ({
  useCreateMutation: vi.fn(),
}));
vi.mock('../../hooks/useContextFamily', async (org) => {
  const mod = await org();
  return { ...mod, useEventsState: () => [] };
});

import { TitleInput } from '../components/organisms/InputTitleDialog';
import { useCreateMutation } from '../hooks/useEventMutation';
import { AuthStateContext } from '../hooks/useContextFamily';
```
（※ 実際のモックはイベント一覧 `useEventsState` の戻り値に依存する `id` 計算に注意。既存 `InputItem.spec.tsx` の AuthStateContext / QueryClientProvider のラップを流用する。`useCreateMutation` の `mutate` を `vi.fn()` で捕捉し、`fireEvent.click(追加)` 後に呼ばれたペイロードの `end_time` が `endOfDay(slotStartTime)` と一致することを assert。）

**Step 2: 実行**
Run: `bunx vitest run src/tests/TitleInput.spec.tsx`
Expected: PASS

> 補足: 対話コンポーネントのモックが重い場合は、**Task 2 の `resolveEventEnd` 単体テストを最終的な回帰の要**とし、本テストは書けなければ省略可（実ブラウザ確認で代替）。ただし lint に未使用 import を残さない。

**Step 3: Commit**
```bash
git add src/tests/TitleInput.spec.tsx
git commit -m "test(issue-29): TitleInput creates full-day payload on month"
```

---

### Task 9: 静的品質ゲート（全タスク締め）

**Objective:** 全変更が tsc / lint / 全テストを緑で通ることを確定する。

**Files:** 変更分すべて

**Step 1: 全ゲート実行**
```bash
bun run lint
bun run build
bun run testrun
```
Expected: エラー 0・警告 0・全テスト PASS

**Step 2: 残差分がないか確認**
```bash
git status
git diff --stat
```
（`console.log` の混入禁止。不要な差分・未使用 import がないこと。）

**Step 3: 実ブラウザ確認（test-plan.md の手順で /）**
- 月ビューで作成 → `0:00–23:59` 保存
- 週ビューで `.rbc-row` + `.rbc-event-allday`
- 'week' 作成は従来どおり時間列

**Step 4: Commit（最終）**
```bash
git add -A
git commit -m "feat(issue-29): month view full-day event creation (week .rbc-row + .rbc-event-allday)"
```

---

## 補足・注意
- **date-fns 4.4.0 には `isStartOfDay` / `isEndOfDay` が無い**。`startOfDay` / `endOfDay` / `isSameMinute` / `isSameDay` を使う（Task 1 の実装）。
- `allDayAccessor` 変更は rbc の月ビュー描画にも影響し得る。`isFullDayEvent` が真になるのはフルデイのみなので、既存イベントへの影響は原則なし。実ブラウザで週・月両方の回帰を test-plan に従い確認。
- 既存の「月クリックで作った 0:00–1:00 イベント」は本修正では直らない（新規作成経路のみ）。必要なら別タスクでデータ移行（対象外）。