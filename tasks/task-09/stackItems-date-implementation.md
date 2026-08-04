# E-2 stackItems の Date 扱い — 実装プラン

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**どの中にあるか:** [`tasks/task-09/README.md`](./README.md) — E-2 タイムライン重なり表示の**検証プラン**にて、<< Scenario 4 >>（最重要リスク）の `stackItems` × native `Date` で機能しない場合の対処策を、独立した実装プランとして切り出したもの。

**紐付け元:** `react-calendar-timeline/README.md:276` — "**stackItems ... Requires millisecond or `Moment` timestamps, not native JavaScript `Date` objects.**"

**Goal:** `Timeline` へ渡す item の `start_time` / `end_time` を native `Date` → **ミリ秒の数値**（`number`）に変換し、`stackItems` が確実に機能するようにする。変換は純関数化して単体テストで担保する（DRY / TDD）。

**Architecture:** アプリ全体は `Date` のまま維持（カレンダー・DnD・フォームに影響させない）。**`Timeline` に渡す直前**で、`start_time`/`end_time` を `.getTime()` の数値に置き換えた item 配列へ変換する純関数 `toTimelineStackItems()` を設け、`TimelinePage` でそれを用いる。変換済み item は `TimelineItemBase<number>` を満たし、`stackItems` の内部衝突判定（`.valueOf()` ベース）が数値で確実に動く。

**Tech Stack:** react-calendar-timeline 0.30.0-beta.4 / React 19 / TypeScript / date-fns / Vitest。

> **前提:** まず `tasks/task-09/README.md` の Scenario 1（同一ユーザー・時間重複の積み重ね表示）を **native `Date` のままで**実ブラウザ確認する。ここで Stack が機能していれば本プランは不要。機能しない・崩れる場合のみ本プランを実行する。

---

## 対象コードの現状

- `src/lib/TimelineType.ts:15-20` — `TimelineEventProps` は `start_time: Date; end_time: Date`。
- `src/lib/TmelineData.ts:19-27` — `getItems()` が `TimelineEventProps[]` を返す（`group = staff_id` を付与）。
- `src/components/pages/TimelinePage.tsx:80-99` — `<Timeline items={state.map((item) => ({...item}))} ... />`。`state` は `getItems(stateAll)` の結果。つまり **dates のままで渡している**。

## 変更対象ファイル

- **Modify:** `src/lib/TmelineData.ts` — 純関数 `toTimelineStackItems()` を追加。
- **Modify:** `src/components/pages/TimelinePage.tsx:80-86` — items を `toTimelineStackItems(state)` に置換。
- **Test:** `src/tests/tmelineData.spec.ts`（新規）— `toTimelineStackItems()` の単体テスト。
- **任意:** `src/lib/TimelineType.ts` — 変換結果の型 `TimelineStackItem` を追加（型明示に使う）。

---

## 実装タスク

### Task 1: 失敗するテストを書く

**Objective:** `toTimelineStackItems()` が `Date` → `number`（ミリ秒）へ変換することをテストで固定する。

**Files:**
- Create: `src/tests/tmelineData.spec.ts`

**Step 1: テストコード**

```ts
import { describe, expect, it } from 'vitest';
import { toTimelineStackItems } from '../lib/TmelineData';
import type { TimelineEventProps } from '../lib/TimelineType';

describe('toTimelineStackItems', () => {
  const base: TimelineEventProps = {
    id: 1,
    group: 500,
    staff_id: 500,
    title: 'x',
    start_time: new Date('2026-08-04T00:00:00.000Z'),
    end_time: new Date('2026-08-04T01:00:00.000Z'),
    start: new Date('2026-08-04T00:00:00.000Z'),
    end: new Date('2026-08-04T01:00:00.000Z'),
  };

  it('start_time / end_time をミリ秒の number に変換する', () => {
    const [out] = toTimelineStackItems([base]);
    expect(out.start_time).toBe(base.start_time.getTime());
    expect(out.end_time).toBe(base.end_time.getTime());
    expect(typeof out.start_time).toBe('number');
    expect(typeof out.end_time).toBe('number');
  });

  it('他のフィールド（id / group / title 等）は維持する', () => {
    const [out] = toTimelineStackItems([base]);
    expect(out.id).toBe(1);
    expect(out.group).toBe(500);
    expect(out.title).toBe('x');
  });
});
```

**Step 2: テストを実行して失敗を確認**

Run: `bun run testrun -- src/tests/tmelineData.spec.ts`
Expected: FAIL — `toTimelineStackItems` is not defined / export なし。

### Task 2: 純関数 `toTimelineStackItems()` を実装

**Objective:** 変換ロジックを純関数として追加する（アプリの他の場所へ波及させない）。

**Files:**
- Modify: `src/lib/TmelineData.ts`

**Step 1: 実装**

`src/lib/TmelineData.ts` の末尾に追加:

```ts
export const toTimelineStackItems = (items: TimelineEventProps[]) =>
  items.map((item) => ({
    ...item,
    start_time: item.start_time.getTime(),
    end_time: item.end_time.getTime(),
  }));
```

> 変換結果の各要素は `TimelineItemBase<number>`（`id` / `group` / `start_time: number` / `end_time: number` / `title`）を満たす。`...item` で付随フィールド（`staff_id` 等）も維持される。

**Step 2: テストを実行して成功を確認**

Run: `bun run testrun -- src/tests/tmelineData.spec.ts`
Expected: PASS（2 passed）。

**Step 3: コミット**

```bash
git add src/lib/TmelineData.ts src/tests/tmelineData.spec.ts
git commit -m "feat: add toTimelineStackItems to convert Dates to ms for stackItems (E-2)"
```

### Task 3: TimelinePage に適用

**Objective:** `<Timeline>` へ渡す items を変換済みに置き換える。

**Files:**
- Modify: `src/components/pages/TimelinePage.tsx:80-86`

**Step 1: import を追加**

```ts
import { getGroup, getItems, toTimelineStackItems } from '../../lib/TmelineData';
```

**Step 2: items を置換**

`<Timeline>` の `items` を次に変更:

```tsx
<Timeline
  groups={groupMember}
  items={toTimelineStackItems(state)}
  ...
  lineHeight={60}
  stackItems={true}
  ...
/>
```

> `state`（`getItems(stateAll)` → `TimelineEventProps[]`）を変換して渡す。`Timeline` は `CustomItem = TimelineItemBase<number>` として推論され、`stackItems` の衝突判定が数値ベースで動く。`canMove={false}` / `canResize={false}` のためレンダリング以外に影響はない。

**Step 3: TypeScript で型が通ることを確認**

Run: `bun run build`
Expected: tsc + vite build が PASS。

> もし `Timeline` のジェネリクス推論が不安定なら、`TimelineType.ts` に `TimelineStackItem` 型を追加し `<Timeline<TimelineStackItem, ...>>` と明示してもよい（任意）。

**Step 4: コミット**

```bash
git add src/components/pages/TimelinePage.tsx
git commit -m "fix: convert timeline item dates to ms for stackItems (E-2)"
```

### Task 4: 詳細検証（tasks/task-09/README.md の Scenario と連動）

**Objective:** `tasks/task-09/README.md` のシナリオを、変換後アイテムに対して再実行し、積み重ね表示を確定する。

**Step 1:** Storybook で再確認

```bash
bun run storybook
```

→ `MyTimeline` ストーリーで:
- Scenario 1: 同一ユーザー・時間重複（item1 / item4）が上下に積み重なる。
- Scenario 2: 同一ユーザー・時間非重複は従来どおり（回帰なし）。
- Scenario 3: 異なるユーザーは別行のまま。
- Scenario 5: グループ行高の伸長で崩れない。

**Step 2: 品質ゲート**

```bash
bun run lint        # 0 error / 0 warning
bun run build       # PASS
bun run testrun     # 全 PASS（tmelineData.spec.ts 含む）
```

---

## 完了条件（Done）

- [ ] `toTimelineStackItems()` が `Date` → ミリ秒 `number` に変換する（単体テスト PASS）
- [ ] `TimelinePage` が `toTimelineStackItems(state)` を `<Timeline items>` に渡す
- [ ] Storybook で同一ユーザー・時間重複のアイテムが積み重ねて表示される
- [ ] lint / build / testrun 全て緑
- [ ] 既存のカレンダー・DnD・フォーム（`Date` のまま）に影響なし

## リスク・トレードオフ・未解決点

- **2 系統の item 型が生じる**: アプリ全体（Calendar / DnD / Form）は `Date`、Timeline 描画のみ `number` という二重化が生じる。`toTimelineStackItems()` を唯一の変換点とし、`TimelinePage` 以外からは数字版 item を触らせないことで影響を限定する（YAGNI の範囲で実装は最小）。
- **`title`（React.ReactNode）の扱い**: 変換後も `...item` で `title` が維持されるため、既定/カスタム itemRenderer はそのまま動く。
- **README の注意書きが実は誤り（Date のままで動く）場合**: 本プランは不要。**必ず先に native `Date` での検証（task-09 README Scenario 4）を行い、機能しないことを確定してから**本プランを適用する。両対応（Date と number）を同時に積む必要はない。
- **`Timeline` ジェネリクス推論**: ビルド時に対象ジェネリクスで型エラーが出た場合のみ、`TimelineStackItem` 型 + `<Timeline<TimelineStackItem>>` の明示を追加する（Task 3 Step 3 の任意対応）。
