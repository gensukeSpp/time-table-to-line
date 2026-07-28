# Task 4・5 実装計画: react-calendar-timeline import 修正 + React 19 互換性修正

> **For Hermes:** 各タスクは 1 ファイルずつ進める。TDD サイクルは skip（機械的な import/型修正のためテストパターン不変）。

**Goal:** `react-calendar-timeline-v3` → `react-calendar-timeline` への import 修正と、React 19 の `useRef` API 変更に対応する。

**Architecture:**
- **Task 4**: 4 ファイルの `react-calendar-timeline-v3` import を `react-calendar-timeline` に書き換える。CSS import も同様に修正。既に正しい import を使っている 3 ファイルは変更不要。
- **Task 5**: 3 ファイルの `useRef<T>()` 引数なし呼び出しを `useRef<T>(undefined)` に修正。`prevRef.current = undefined` の型エラーは `useRef<TimelineEventProps | undefined>(undefined)` で解決。

**Tech Stack:** react-calendar-timeline 0.30.0-beta.4, @types/react-calendar-timeline 0.28.6, React 19, TypeScript 5.7

---

## 事前確認: 現状分析

### 現在の build エラー（12 件）

| ファイル | エラー | 要因 | タスク |
|----------|--------|------|-------|
| `TimelineComponent.tsx:3` | Cannot find module 'react-calendar-timeline-v3' | v3 import | Task 4 |
| `TimelineComponent.tsx:100` | 3x implicit any | v3 型がないため | Task 4 |
| `useTimelineDragZoom.ts:2` | Cannot find module 'react-calendar-timeline-v3' | v3 import | Task 4 |
| `TmelineData.ts:1` | Cannot find module 'react-calendar-timeline-v3' | v3 import | Task 4 |
| `Timeline.stories.tsx:3` | Cannot find module 'react-calendar-timeline-v3' | v3 import | Task 4 |
| `CalendarComponent.tsx:94` | Type 'undefined' not assignable | useRef 型 | Task 5 |
| `CalendarComponent.tsx:121` | Expected 1 arguments, got 0 | useRef() | Task 5 |
| `useCallingForm.tsx:23` | Expected 1 arguments, got 0 | useRef() | Task 5 |
| `useMouseHandle.ts:10` | Expected 1 arguments, got 0 | useRef() | Task 5 |

### 既に正しい import を使っているファイル（変更不要）
- `src/lib/TimelineType.ts` — `import { TimelineItemBase } from 'react-calendar-timeline'` ✓
- `src/lib/SampleState.ts` — `import { TimelineItemBase } from 'react-calendar-timeline'` ✓
- `src/components/organisms/DaysComponent.tsx` — `import 'react-calendar-timeline/lib/Timeline.css'` ✓

### react-calendar-timeline パッケージの状態
- `react-calendar-timeline` v0.30.0-beta.4 がインストール済み
- `@types/react-calendar-timeline` v0.28.6 がインストール済み
- `react-calendar-timeline-v3` は未インストール（存在しないパッケージ名）

### useRef の React 19 互換性
React 19 では `useRef<T>()` の引数なし呼び出しが許可されなくなった。明示的に初期値を渡す必要がある。

| 修正前 | 修正後 |
|--------|--------|
| `useRef<number \| undefined>()` | `useRef<number \| undefined>(undefined)` |
| `useRef<TimelineEventProps>()` | `useRef<TimelineEventProps \| undefined>(undefined)` |

---

## 実装タスク: Task 4

### Task 4-1: TimelineComponent.tsx — v3 → react-calendar-timeline

**Objective:** TimelineComponent の import を `react-calendar-timeline-v3` から `react-calendar-timeline` に変更する。

**Files:**
- Modify: `src/components/pages/TimelineComponent.tsx`

**Step 1: import 修正**

Before:
```typescript
import { addHours, addDays } from 'date-fns';
import React, { useRef, useEffect, useState } from 'react';
import { Timeline, TimelineGroupBase } from "react-calendar-timeline-v3";

...

import 'react-calendar-timeline-v3/style.css';
```

After:
```typescript
import { addHours, addDays } from 'date-fns';
import React, { useRef, useEffect, useState } from 'react';
import { Timeline, TimelineGroupBase } from "react-calendar-timeline";

...

import 'react-calendar-timeline/lib/Timeline.css';
```

**Step 2: ビルド確認**

```bash
bun run build 2>&1 | grep "TimelineComponent.tsx"
```

Expected: `Cannot find module 'react-calendar-timeline-v3'` エラーが消え、`react-calendar-timeline` のエラーのみ残る（implicit any は解消される可能性あり）。

**Step 3: Commit**

```bash
git add src/components/pages/TimelineComponent.tsx
git commit -m "feat #260724: TimelineComponent.tsx v3→react-calendar-timeline"
```

---

### Task 4-2: useTimelineDragZoom.ts — v3 → react-calendar-timeline

**Objective:** カスタムフックの import を修正する。

**Files:**
- Modify: `src/hooks/useTimelineDragZoom.ts`

**Step 1: import 修正**

Before:
```typescript
import { OnItemDragObjectResize } from 'react-calendar-timeline-v3';
```

After（デフォルトの名前付きエクスポートがない場合は削除、または適切な型に置き換え）:

`react-calendar-timeline` 0.30.0-beta.4 の型定義を確認する。

```bash
cd node_modules/@types/react-calendar-timeline && grep -r "OnItemDragObjectResize" .
```

もし型が存在しない場合:
```typescript
// 型をローカルで定義するか、any を使用
type OnItemDragObjectResize = any;
```

もしくはコメントアウトして削除（`useTimelineDragZoom.ts` では実際にこの型は使われていない）。

**Step 2: 検証**

Before:
```typescript
import { OnItemDragObjectResize } from 'react-calendar-timeline-v3';
```

After（型が存在しない場合）:
```typescript
// ファイル内で使用されていない型なので削除
```

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "useTimelineDragZoom"
```

Expected: `Cannot find module 'react-calendar-timeline-v3'` エラーが消える。

**Step 4: Commit**

```bash
git add src/hooks/useTimelineDragZoom.ts
git commit -m "feat #260724: useTimelineDragZoom.ts v3→react-calendar-timeline"
```

---

### Task 4-3: TmelineData.ts — v3 → react-calendar-timeline

**Objective:** データ変換ユーティリティの import を修正する。

**Files:**
- Modify: `src/lib/TmelineData.ts`

**Step 1: import 修正**

Before:
```typescript
import { TimelineGroupBase } from 'react-calendar-timeline-v3';
```

After:
```typescript
import { TimelineGroupBase } from 'react-calendar-timeline';
```

**Step 2: ビルド確認**

```bash
bun run build 2>&1 | grep "TmelineData"
```

Expected: `Cannot find module 'react-calendar-timeline-v3'` エラーが消える。

**Step 3: Commit**

```bash
git add src/lib/TmelineData.ts
git commit -m "feat #260724: TmelineData.ts v3→react-calendar-timeline"
```

---

### Task 4-4: Timeline.stories.tsx — v3 → react-calendar-timeline

**Objective:** Storybook ストーリーの import を修正する。

**Files:**
- Modify: `src/stories/Timeline.stories.tsx`

**Step 1: import 修正**

Before:
```typescript
import { Timeline } from 'react-calendar-timeline-v3';
...
import "react-calendar-timeline-v3/style.css";
```

After:
```typescript
import { Timeline } from 'react-calendar-timeline';
...
import "react-calendar-timeline/lib/Timeline.css";
```

**Step 2: ビルド確認**

```bash
bun run build 2>&1 | grep "Timeline.stories"
```

Expected: `Cannot find module 'react-calendar-timeline-v3'` エラーが消える。

**Step 3: テスト確認**

```bash
bun run testrun 2>&1 | grep "Timeline.spec"
```

Expected: Timeline.spec.tsx の v3 関連エラーが解消（ただし Timeline テストが他の理由で失敗する可能性あり）。

**Step 4: Commit**

```bash
git add src/stories/Timeline.stories.tsx
git commit -m "feat #260724: Timeline.stories.tsx v3→react-calendar-timeline"
```

---

### Task 4-5: 最終確認（Task 4）

**Objective:** 全ファイルの v3 import が残っていないことを確認する。

**Step 1: v3 import 残存チェック**

```bash
grep -rn "react-calendar-timeline-v3" src/ --include="*.{ts,tsx}" || echo "No v3 imports remaining"
```

**Step 2: lint + build 確認**

```bash
bun run lint && bun run build 2>&1 | grep "error TS" | wc -l
```

Expected: v3 関連エラーが消え、残りエラー数が減少（12 → 8 程度に）。

---

## 実装タスク: Task 5

### Task 5-1: useMouseHandle.ts — useRef 引数追加

**Objective:** `useRef<TimelineEventProps>()` に undefined 初期値を渡す。

**Files:**
- Modify: `src/hooks/useMouseHandle.ts`

**Step 1: useRef 呼び出しを修正**

Before:
```typescript
const prevRef = useRef<TimelineEventProps>();
```

After:
```typescript
const prevRef = useRef<TimelineEventProps | undefined>(undefined);
```

これにより `prevRef.current` が `TimelineEventProps | undefined` 型になり、`prevRef.current = undefined` の代入も許可される。

**Step 2: ビルド確認**

```bash
bun run build 2>&1 | grep "useMouseHandle"
```

Expected: `useMouseHandle.ts` のエラーが消える。

**Step 3: Commit**

```bash
git add src/hooks/useMouseHandle.ts
git commit -m "feat #260724: useMouseHandle.ts useRef 引数追加"
```

---

### Task 5-2: useCallingForm.tsx — useRef 引数追加

**Objective:** `useRef<number | undefined>()` に undefined 初期値を渡す。

**Files:**
- Modify: `src/hooks/useCallingForm.tsx`

**Step 1: useRef 呼び出しを修正**

Before:
```typescript
const countRef = useRef<number | undefined>();
```

After:
```typescript
const countRef = useRef<number | undefined>(undefined);
```

**Step 2: ビルド確認**

```bash
bun run build 2>&1 | grep "useCallingForm"
```

Expected: `useCallingForm.tsx` のエラーが消える。

**Step 3: Commit**

```bash
git add src/hooks/useCallingForm.tsx
git commit -m "feat #260724: useCallingForm.tsx useRef 引数追加"
```

---

### Task 5-3: CalendarComponent.tsx — useRef 引数追加 + undefined 代入修正

**Objective:** 2 箇所の `useRef` 呼び出しを修正し、`prevRef.current = undefined` の型エラーを解消する。

**Files:**
- Modify: `src/components/pages/CalendarComponent.tsx`

**Step 1: useRef 呼び出しを修正（2 箇所）**

Before:
```typescript
const countRef = useRef<number | undefined>();
```

After:
```typescript
const countRef = useRef<number | undefined>(undefined);
```

`clickRef` は既に `useRef<number | undefined>(undefined)` と初期値ありなので修正不要。

**Step 2: prevRef.current = undefined の型エラーを修正**

`prevRef` は `useMouseEvents()` の戻り値。`useMouseHandle.ts` で `useRef<TimelineEventProps | undefined>(undefined)` に修正すれば、`prevRef.current` の型が `TimelineEventProps | undefined` になり、`undefined` 代入が許可される。CalendarComponent.tsx 側の変更は不要。

**Step 3: ビルド確認**

```bash
bun run build 2>&1 | grep "CalendarComponent.tsx"
```

Expected: CalendarComponent.tsx のエラーが 2 件減る（94, 121 行目）。

**Step 4: Commit**

```bash
git add src/components/pages/CalendarComponent.tsx
git commit -m "feat #260724: CalendarComponent.tsx useRef 引数追加"
```

---

### Task 5-4: 最終確認（Task 5）

**Objective:** 全修正後、lint + build + test が通ることを確認する。

**Step 1: lint 実行**

```bash
bun run lint
```

Expected: 0 errors, 0 warnings。

**Step 2: build 確認**

```bash
bun run build 2>&1 | grep "error TS"
```

Expected: `useRef` 関連エラーが全滅。残るエラーは `Theme.ts` の `@emotion/react` のみ（未使用ファイル）。

**Step 3: テスト実行**

```bash
bun run testrun
```

Expected: `timelineZoomUtils.spec.ts` (8 tests) が引き続き PASS。Calendar.spec.tsx の各テストも維持。

---

## テスト / 検証

| 確認項目 | 方法 | 期待結果 |
|---|---|---|
| v3 import 残存ゼロ | `grep -rn "react-calendar-timeline-v3" src/` | 空 |
| useRef 引数なし残存ゼロ | `grep -rn "useRef<[^>]*>()" src/` | 空 |
| lint パス | `bun run lint` | 0 errors, 0 warnings |
| build エラー減少 | `bun run build 2>&1 \| grep "error TS" \| wc -l` | 12 → 1（Theme.ts のみ） |
| テスト維持 | `bun run testrun` | 既存テストが引き続き PASS |

## リスク・トレードオフ・未解決の質問

1. **`OnItemDragObjectResize` 型の互換性**: `react-calendar-timeline` 0.30.0-beta.4 の型定義に `OnItemDragObjectResize` が存在するか不明。存在しない場合、`useTimelineDragZoom.ts` から未使用の import を削除するだけで解決。

2. **`TimelineGroupBase` 型の互換性**: `react-calendar-timeline-v3` と `react-calendar-timeline` 0.30.0-beta.4 で型の互換性が崩れている可能性。その場合は型キャストが必要になるが、まずは単純な import 置き換えで試す。

3. **`react-calendar-timeline/lib/Timeline.css` のパス**: 0.30.0-beta.4 の CSS パスが `dist/` 内にある可能性。`DaysComponent.tsx` が既に `react-calendar-timeline/lib/Timeline.css` を使用しているので、同じパスで問題ないはず。

4. **`prevRef.current = undefined` の副作用**: `useMouseHandle.ts` で `useRef<TimelineEventProps | undefined>(undefined)` に変更すると、`prevRef.current` が `TimelineEventProps | undefined` 型になる。`prevRef.current.isDraggable = true` の呼び出し（30, 50 行目）で Optional Chaining が必要になる可能性がある。修正後は `prevRef.current!.isDraggable = true` または `if (prevRef.current) prevRef.current.isDraggable = true` で対応。

5. **Theme.ts のエラー**: `@emotion/react` が見つからないエラーは、`Theme.ts` 自体が未使用ファイルのため、このタスクでは削除して対応するのがベスト。ただし方針確認が必要なため、別タスクとして扱うか本タスクで削除するか要判断。