# Task 3 実装計画: 日付ライブラリ統一 (moment → date-fns)

> **For Hermes:** 各タスクは 1 ファイルずつ進める。TDD サイクルは skip（date-fns への機械的な置き換えのためテストパターン不変）。

**Goal:** コードベース全体で moment（＋dayjs）を date-fns に統一し、3 つの日付ライブラリ混在状態を解消する。

**Architecture:** date-fns v4 をインストールした上で、全 12 ファイルの moment 呼び出しを date-fns 相当の関数に置き換える。`TimelineType.ts` の `moment.Moment` 型は `Date` に変更し、`moment()` → `new Date()` に置き換え。`Localization.ts` は既に date-fns を使っているが、date-fns 未インストールのため import が壊れているので修正する。

**Tech Stack:** date-fns v4, TypeScript 5.7

---

## 事前確認: 現状分析

### date-fns の状態
- `node_modules/` に date-fns なし（未インストール）
- `package.json` の dependencies にもなし
- `Localization.ts` は date-fns v3 スタイルの deep import（`date-fns/format`）を参照しているが、date-fns v4 では main entry のみで tree-shaking する

### moment 使用ファイル (12 files)

| # | ファイル | moment の使用パターン |
|---|---------|---------------------|
| 1 | `src/lib/Localization.ts` | `moment` import + `dayjs` import（両方とも使用されていない） |
| 2 | `src/lib/TimelineType.ts` | `moment.Moment` 型 |
| 3 | `src/lib/SampleState.ts` | `moment()`, `.toDate()`, `.add(N, 'hour')` |
| 4 | `src/resources/queries.ts` | `moment(value).toDate()`, `moment(value)` 変換 |
| 5 | `src/components/pages/CalendarComponent.tsx` | `moment` import（start/end accessor で `.toDate()` を呼ぶ側） |
| 6 | `src/components/pages/TimelineComponent.tsx` | `moment().add(-12, 'hours').valueOf()`, `.toDate()` |
| 7 | `src/components/organisms/DaysComponent.tsx` | `moment().add()`, `.isSameOrBefore()`, `.toDate()` |
| 8 | `src/components/organisms/InputTitleDialog.tsx` | `moment(value).format('YYYY-MM-DD HH:mm:ss')`, `.add()` |
| 9 | `src/components/templates/EventsParent.tsx` | `moment()`, `.add(1, 'hours')` |
| 10 | `src/stories/Calendar.stories.tsx` | `moment().add(-2, 'hours')`, `.add(1, 'hours')` 等 |
| 11 | `src/tests/Calendar.spec.tsx` | `moment().hour(9)`, `.hour(10)` 等 |
| 12 | `src/App.tsx` | `moment().toDate()`, `.add(1, "days")` |

### moment → date-fns 置き換えマッピング

| moment パターン | date-fns 相当 |
|---|---|
| `moment()` | `new Date()` |
| `moment().toDate()` | `new Date()` |
| `moment(value).toDate()` | `new Date(value)` |
| `moment().add(N, 'hours')` | `addHours(new Date(), N)` |
| `moment().add(N, 'hour')` | `addHours(new Date(), N)` |
| `moment().add(N, 'days')` | `addDays(new Date(), N)` |
| `moment().add(N, 'day')` | `addDays(new Date(), N)` |
| `moment().add(-N, 'hour')` | `addHours(new Date(), -N)` |
| `moment(value).format('YYYY-MM-DD HH:mm:ss')` | `format(value, "yyyy-MM-dd HH:mm:ss")` |
| `moment().hour(N)` | `setHours(new Date(), N)` または `startOfDay(new Date())` に加算 |
| `moment(value).valueOf()` | `new Date(value).getTime()` または `+new Date(value)` |
| `moment(value1).isSameOrBefore(value2, 'day')` | `isBefore(startOfDay(value1), startOfDay(value2)) \|\| isEqual(...)` |
| `moment.Moment` | `Date` |
| `moment.isMoment(x)` | 削除（常に Date） |

### 注意点
- `moment().hour(9)` は「今日の 9 時」→ `setHours(new Date(), 9, 0, 0, 0)`
- `moment(start).isSameOrBefore(moment(end), 'day')` は日付が同じか以前かをチェック → `isBefore(startOfDay(start), startOfDay(end)) || isEqual(startOfDay(start), startOfDay(end))`
- `react-big-calendar` は `momentLocalizer`, `dayjsLocalizer`, `dateFnsLocalizer` を全て提供 → `Localization.ts` は既に dateFnsLocalizer を使っているので修正不要
- CalendarComponent の `stateEvent.start_time.toDate()` は `TimelineEventProps` の `start_time` が `moment.Moment` 型 → Date に変えることで `toDate()` 不要になる

---

## 実装タスク

### Task 3-1: date-fns インストール

**Objective:** date-fns v4 を依存関係に追加し、型定義を確認する。

**Files:**
- Modify: `package.json`（`bun add date-fns` で自動更新）

**Step 1: インストール**

```bash
bun add date-fns
```

Expected: `package.json` と `bun.lock` が更新される。

**Step 2: 型定義の確認**

date-fns v4 は TypeScript 型を内包している。`@types/date-fns` は不要。

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "feat #260724: date-fns インストール"
```

---

### Task 3-2: Localization.ts の date-fns import 修正

**Objective:** `Localization.ts` の壊れた deep import を date-fns v4 の main entry import に修正する。不要な moment/dayjs import を削除する。

**Files:**
- Modify: `src/lib/Localization.ts`

**Step 1: import 修正**

Before:
```typescript
import { dateFnsLocalizer, momentLocalizer, dayjsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
// import enUS from 'date-fns/locale/en-US';
import { ja } from 'date-fns/locale/ja';
import { addHours } from 'date-fns/addHours';
import { startOfHour } from 'date-fns/startOfHour';

import moment from 'moment';
import dayjs from 'dayjs'
```

After:
```typescript
import { dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay,
  addHours, startOfHour,
} from 'date-fns';
import { ja } from 'date-fns/locale';
```

**Step 2: ビルド確認**

```bash
bun run build 2>&1 | grep "Localization"
```

Expected: Localization.ts に関するエラーが出ない。

**Step 3: Commit**

```bash
git add src/lib/Localization.ts
git commit -m "feat #260724: Localization.ts date-fns import 修正"
```

---

### Task 3-3: TimelineType.ts — moment.Moment → Date

**Objective:** `TimelineEventProps` の `start_time` / `end_time` の型を `moment.Moment` から `Date` に変更する。

**Files:**
- Modify: `src/lib/TimelineType.ts`

**Step 1: import と型を変更**

- `import moment from 'moment';` を削除
- `start_time: moment.Moment;` → `start_time: Date;`
- `end_time: moment.Moment;` → `end_time: Date;`

**修正後の型:**

```typescript
export type TimelineEventProps = Merge<NewTimelineItem, {
  title: React.ReactNode;
  start_time: Date;
  end_time: Date;
  isDraggable?: boolean;
}>;
```

**Step 2: 影響の確認**

```bash
bun run build 2>&1 | wc -l
```

この変更により多くのファイルで `start_time.toDate()` 呼び出しが不要になり、代わりに型エラーが発生する可能性がある。各ファイルを順次修正する。

**Step 3: Commit**

```bash
git add src/lib/TimelineType.ts
git commit -m "feat #260724: TimelineType.ts moment.Moment→Date"
```

---

### Task 3-4: SampleState.ts — moment → date-fns

**Objective:** モックデータファイルの moment 呼び出しを date-fns に置き換える。

**Files:**
- Modify: `src/lib/SampleState.ts`

**Step 1: import 変更**

Before:
```typescript
import moment from "moment";
```

After:
```typescript
import { addHours } from 'date-fns';
```

**Step 2: moment 呼び出しを置き換え**

全置き換えパターン:

| Before | After |
|---|---|
| `moment()` | `new Date()` |
| `moment().toDate()` | `new Date()` |
| `moment().add(1, 'hours').toDate()` | `addHours(new Date(), 1)` |
| `moment().add(1, 'hour')` | `addHours(new Date(), 1)` |
| `moment().add(-0.5, 'hour')` | `addHours(new Date(), -0.5)` |
| `moment().add(0.5, 'hour')` | `addHours(new Date(), 0.5)` |
| `moment().add(2, 'hour')` | `addHours(new Date(), 2)` |
| `moment().add(3, 'hour')` | `addHours(new Date(), 3)` |

**Step 3: `TimelineItemBase<moment.Moment>` → `TimelineItemBase<Date>`**

```typescript
export const exItems: TimelineItemBase<Date>[] = [
```

**Step 4: ビルド確認**

```bash
bun run build 2>&1 | grep "SampleState"
```

Expected: SampleState.ts に関するエラーが出ない。

**Step 5: Commit**

```bash
git add src/lib/SampleState.ts
git commit -m "feat #260724: SampleState.ts moment→date-fns"
```

---

### Task 3-5: queries.ts — moment → date-fns

**Objective:** `src/resources/queries.ts` の moment 呼び出しを date-fns に置き換える。

**Files:**
- Modify: `src/resources/queries.ts`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { addHours } from 'date-fns';
```

**Step 2: 3 箇所のデータ変換ロジックを修正**

各 `moment(item.start).toDate()` は「item.start を Date に変換」の意味。item.start が既に Date なら不要だが、API から string で来る可能性がある。

以下のように修正:
```typescript
start: item.start = new Date(item.start),
end: item.end = new Date(item.end),
```

また `useEventsQueryForTL` の start_time/end_time:
```typescript
// Before:
start_time: item.start_time = moment(item.start),
end_time: item.end_time = moment(item.end)
// After:
start_time: item.start_time = new Date(item.start),
end_time: item.end_time = new Date(item.end)
```

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "queries.ts"
```

Expected: queries.ts に関するエラーが出ない。

**Step 4: Commit**

```bash
git add src/resources/queries.ts
git commit -m "feat #260724: queries.ts moment→date-fns"
```

---

### Task 3-6: CalendarComponent.tsx — moment import 削除

**Objective:** `CalendarComponent.tsx` から不要な moment import を削除する（型変更後は `start_time.toDate()` が不要になるため）。

**Files:**
- Modify: `src/components/pages/CalendarComponent.tsx`

**Step 1: import 削除**

```typescript
// 削除
import moment from 'moment';
```

**Step 2: アクセサーを修正**

`stateEvent.start_time.toDate()` → `stateEvent.start_time`（Date 型になったので toDate() 不要）

```typescript
startAccessor={(stateEvent: TimelineEventProps) => {
  return stateEvent.start_time;
}}
endAccessor={(stateEvent: TimelineEventProps) => {
  return stateEvent.end_time;
}}
```

**Step 3: lint + build 確認**

```bash
bun run lint && bun run build 2>&1 | grep "CalendarComponent.tsx"
```

Expected: 0 errors for CalendarComponent.tsx

**Step 4: Commit**

```bash
git add src/components/pages/CalendarComponent.tsx
git commit -m "feat #260724: CalendarComponent.tsx moment import 削除"
```

---

### Task 3-7: TimelineComponent.tsx — moment → date-fns

**Objective:** タイムラインページの moment 呼び出しを date-fns に置き換える。

**Files:**
- Modify: `src/components/pages/TimelineComponent.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { addHours, addDays } from 'date-fns';
```

**Step 2: defaultTimeStart / defaultTimeEnd の修正**

Before:
```typescript
const defaultTimeStart = moment().add(-12, 'hours').valueOf();
const defaultTimeEnd = moment().add(12, 'hours').valueOf();
```

After:
```typescript
const defaultTimeStart = addHours(new Date(), -12).getTime();
const defaultTimeEnd = addHours(new Date(), 12).getTime();
```

**Step 3: console.log 内の moment 呼び出し修正（除去）**

これらは console.log 内のデバッグ出力。Task 1 で no-console は off になっている。単純に new Date() に置き換えてもよいが、null 安全でない。保存しておくなら:

```typescript
console.log(`Bounds changed: ${new Date(canvasTimeStart).toISOString()}`);
console.log(`Bounds changed: ${new Date(canvasTimeEnd).toISOString()}`);
```

**Step 4: テンプレート内の moment 呼び出し修正**

```typescript
// Before:
defaultTimeStart={moment(defaultTimeStart).toDate()}
defaultTimeEnd={moment(defaultTimeEnd).toDate()}
// After:
defaultTimeStart={new Date(defaultTimeStart)}
defaultTimeEnd={new Date(defaultTimeEnd)}
```

**Step 5: ビルド確認**

```bash
bun run build 2>&1 | grep "TimelineComponent.tsx"
```

Expected: TimelineComponent.tsx に関するエラーが出ない（v3 インポートは別タスク）。

**Step 6: Commit**

```bash
git add src/components/pages/TimelineComponent.tsx
git commit -m "feat #260724: TimelineComponent.tsx moment→date-fns"
```

---

### Task 3-8: DaysComponent.tsx — moment → date-fns（最も複雑）

**Objective:** `MyWeek` カスタムビューの moment 呼び出しを date-fns に置き換える。`isSameOrBefore` は date-fns に直接相当がないため、`isBefore` + `isEqual` を組み合わせる。

**Files:**
- Modify: `src/components/organisms/DaysComponent.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { addDays, startOfDay, isBefore, isEqual } from 'date-fns';
```

**Step 2: range 関数の修正**

Before:
```typescript
MyWeek.range = (date: Date) => {
  const start = date;
  const end = moment(start).add(2, 'day').toDate();
  let current = start;
  const range = [];
  while (moment(current).isSameOrBefore(moment(end), 'day')) {
    range.push(current);
    current = moment(current).add(1, 'day').toDate();
  }
  return range;
}
```

After:
```typescript
MyWeek.range = (date: Date) => {
  const start = date;
  const end = addDays(start, 2);
  let current = start;
  const range: Date[] = [];
  while (isBefore(startOfDay(current), startOfDay(end)) || isEqual(startOfDay(current), startOfDay(end))) {
    range.push(current);
    current = addDays(current, 1);
  }
  return range;
}
```

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "DaysComponent"
```

Expected: DaysComponent.tsx に関するエラーが出ない。

**Step 4: Commit**

```bash
git add src/components/organisms/DaysComponent.tsx
git commit -m "feat #260724: DaysComponent.tsx moment→date-fns"
```

---

### Task 3-9: InputTitleDialog.tsx — moment → date-fns

**Objective:** イベント作成ダイアログの moment 呼び出しを date-fns に置き換える。日付フォーマットと時刻加算が必要。

**Files:**
- Modify: `src/components/organisms/InputTitleDialog.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { addHours, format } from 'date-fns';
```

**Step 2: フォーマットと加算を置き換え**

Before:
```typescript
const startDT = moment(slotStartTime).format('YYYY-MM-DD HH:mm:ss');
const endDT = moment(slotStartTime).add(1, 'hours').format('YYYY-MM-DD HH:mm:ss');
...
start_time: moment(startDT),
end_time: moment(endDT)
```

After:
```typescript
const startDT = format(slotStartTime, "yyyy-MM-dd HH:mm:ss");
const endDT = format(addHours(slotStartTime, 1), "yyyy-MM-dd HH:mm:ss");
...
start_time: new Date(startDT),
end_time: new Date(endDT)
```

注意: date-fns のフォーマットパターンは `YYYY` ではなく `yyyy`、`DD` ではなく `dd`。

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "InputTitleDialog"
```

Expected: InputTitleDialog.tsx に関するエラーが出ない。

**Step 4: Commit**

```bash
git add src/components/organisms/InputTitleDialog.tsx
git commit -m "feat #260724: InputTitleDialog.tsx moment→date-fns"
```

---

### Task 3-10: EventsParent.tsx — moment → date-fns

**Objective:** イベント Context Provider の moment 呼び出しを date-fns に置き換える。

**Files:**
- Modify: `src/components/templates/EventsParent.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { addHours } from 'date-fns';
```

**Step 2: 初期データ修正**

Before:
```typescript
start_time: moment(),
end_time: moment().add(1, 'hours'),
```

After:
```typescript
start_time: new Date(),
end_time: addHours(new Date(), 1),
```

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "EventsParent"
```

Expected: EventsParent.tsx に関するエラーが出ない。

**Step 4: Commit**

```bash
git add src/components/templates/EventsParent.tsx
git commit -m "feat #260724: EventsParent.tsx moment→date-fns"
```

---

### Task 3-11: App.tsx — moment → date-fns

**Objective:** レガシー App.tsx の moment 呼び出しを date-fns に置き換える。

**Files:**
- Modify: `src/App.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from "moment";
```

After:
```typescript
import { addDays } from 'date-fns';
```

**Step 2: イベントデータ修正**

Before:
```typescript
start: moment().toDate(),
end: moment().add(1, "days").toDate(),
```

After:
```typescript
start: new Date(),
end: addDays(new Date(), 1),
```

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "App.tsx"
```

Expected: App.tsx に関するエラーが出ない。

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat #260724: App.tsx moment→date-fns"
```

---

### Task 3-12: Calendar.stories.tsx — moment → date-fns

**Objective:** Storybook ストーリーの moment 呼び出しを date-fns に置き換える。

**Files:**
- Modify: `src/stories/Calendar.stories.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { addHours, addDays } from 'date-fns';
```

**Step 2: モックデータ修正**

Before:
```typescript
const mockEvents: TimelineEventProps[] = [
  { id: 1, title: 'My Event 1', start_time: moment().add(-2, 'hours'), end_time: moment().add(-1, 'hours'), staff_id: 1, group: 1 },
  { id: 2, title: 'Another User Event', start_time: moment(), end_time: moment().add(1, 'hours'), staff_id: 2, group: 2 },
  { id: 3, title: 'My Event 2', start_time: moment().add(2, 'hours'), end_time: moment().add(3, 'hours'), staff_id: 1, group: 1 },
];
```

After:
```typescript
const mockEvents: TimelineEventProps[] = [
  { id: 1, title: 'My Event 1', start_time: addHours(new Date(), -2), end_time: addHours(new Date(), -1), staff_id: 1, group: 1 },
  { id: 2, title: 'Another User Event', start_time: new Date(), end_time: addHours(new Date(), 1), staff_id: 2, group: 2 },
  { id: 3, title: 'My Event 2', start_time: addHours(new Date(), 2), end_time: addHours(new Date(), 3), staff_id: 1, group: 1 },
];
```

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "Calendar.stories"
```

Expected: Calendar.stories.tsx に関するエラーが出ない。

**Step 4: Commit**

```bash
git add src/stories/Calendar.stories.tsx
git commit -m "feat #260724: Calendar.stories.tsx moment→date-fns"
```

---

### Task 3-13: Calendar.spec.tsx — moment → date-fns

**Objective:** テストファイルの moment 呼び出しを date-fns に置き換える。`moment().hour(N)` は `setHours()` を使う。

**Files:**
- Modify: `src/tests/Calendar.spec.tsx`

**Step 1: import 変更**

Before:
```typescript
import moment from 'moment';
```

After:
```typescript
import { setHours, startOfDay } from 'date-fns';
```

**Step 2: モックデータ修正**

Before:
```typescript
const mockEvents: TimelineEventProps[] = [
  { id: 1, title: 'User 1 Event', start_time: moment().hour(9), end_time: moment().hour(10), staff_id: 1, group: 1 },
  ...
];
```

After:
```typescript
const mockEvents: TimelineEventProps[] = [
  { id: 1, title: 'User 1 Event', start_time: setHours(startOfDay(new Date()), 9), end_time: setHours(startOfDay(new Date()), 10), staff_id: 1, group: 1 },
  ...
];
```

`moment().hour(9)` は「今日の 0 時から 9 時間経過した時刻」→ `setHours(startOfDay(new Date()), 9)`。

**Step 3: テスト実行**

```bash
bun run testrun 2>&1 | grep -E "Calendar.spec|PASS|FAIL"
```

Expected: Calendar.spec.tsx がパスする（ただし date-fns の import 解決に失敗していたのが解消されるはず）。

**Step 4: Commit**

```bash
git add src/tests/Calendar.spec.tsx
git commit -m "feat #260724: Calendar.spec.tsx moment→date-fns"
```

---

### Task 3-14: 最終確認 — moment import 残存チェック + lint + build + test

**Objective:** 全タスク完了後、moment import が残っていないこと、リントとテストが問題なく通ることを確認する。

**Step 1: moment import 残存チェック**

```bash
grep -rn "import moment\|from 'moment'\|from \"moment\"" src/ --include="*.{ts,tsx}" || echo "No moment imports remaining"
```

Expected: moment import がゼロ。

**Step 2: lint 実行**

```bash
bun run lint
```

Expected: 0 errors, 0 warnings。

**Step 3: テスト実行**

```bash
bun run testrun
```

Expected: Calendar.spec.tsx の date-fns 関連エラーが解消。timelineZoomUtils.spec.ts の 8 tests も引き続き PASS。

---

## テスト / 検証

| 確認項目 | 方法 | 期待結果 |
|---|---|---|
| date-fns インストール完了 | `grep date-fns package.json` | dependencies に存在 |
| moment import 残存ゼロ | `grep -r "from 'moment'" src/` | 空 |
| dayjs import 残存ゼロ | `grep -r "from 'dayjs'" src/` | 空（Localization.ts から削除） |
| ビルドエラー減少 | `bun run build 2>&1 \| grep "error TS" \| wc -l` | date-fns 関連エラー消滅（19→12 程度に減少） |
| lint パス | `bun run lint` | 0 errors, 0 warnings |
| テストパス | `bun run testrun` | Calendar.spec.tsx の date-fns エラー解消 |

## リスク・トレードオフ・未解決の質問

1. **`moment().hour(N)` の正確な動作**: `moment().hour(9)` は「今日の日付を保持しつつ時刻を 9:00:00.000 に設定する」。date-fns の `setHours(date, hours)` は `setHours(new Date(), 9)` のみ。分/秒/ミリ秒を 0 にしたい場合は `setHours(startOfDay(new Date()), 9)` が等価。テストデータでは分/秒が 0 でなくても動作に影響しないため、簡易版で OK。

2. **`moment().add(-12, 'hours').valueOf()` の互換性**: `.valueOf()` は `Date.getTime()` で代替。`react-calendar-timeline` は `number`（Unix タイムスタンプ）を期待するため、`getTime()` の戻り値型は一致。

3. **`isSameOrBefore` の date-fns 代替**: date-fns には `isSameOrBefore` がないため、`isBefore || isEqual` で代替。パフォーマンスへの影響は無視できるレベル。

4. **API から返る日付の形式**: `new Date(item.start)` で string → Date 変換が可能。ただし API が ISO 8601 形式で返すことを前提とする（現在 moment で変換できているので問題ないはず）。