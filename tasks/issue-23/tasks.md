# 実装タスク — イベントのマイルストーン所属と配色

> 各タスクの後に `bun run build` / `bun run lint` / `bun run testrun` を適宜実行し、進捗を止めない。
> 実行順序は 1 → 7 の直列依存。サブエージェントに投げる場合は、**Task 1〜2（純粋ヘルパ + テスト）を先に完了**させてから、Task 3（Timeline 配線）と Task 4〜6（InputItem 側）を並列で投げてよい（互いに触るファイルが異なるため disjoint）。
> 親は最終の `bun run build` / `bun run lint` / `bun run testrun` を必ず自身で実行して品質ゲートを締める。

---

## Task 1: 純粋ヘルパ `milestoneLookup.ts` を作成

**Objective:** マイルストーン一覧から color / status の lookup map を構築し、イベントの `milestone_id` → 適用スタイルを計算する純粋関数を用意する（Timeline 配色の中核）。

**Files:**
- Create: `src/lib/milestoneLookup.ts`

**Step 1:** ファイル作成。

```ts
import { MilestoneProps, MilestoneStatus } from './TimelineType';

export function buildMilestoneColorMap(milestones: MilestoneProps[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of milestones ?? []) map.set(m.id, m.color);
  return map;
}

export function buildMilestoneStatusMap(milestones: MilestoneProps[]): Map<number, MilestoneStatus> {
  const map = new Map<number, MilestoneStatus>();
  for (const m of milestones ?? []) map.set(m.id, m.status);
  return map;
}

// イベントの milestone_id から、適用する装飾（色 / 網掛け）を返す。
// milestone_id が undefined / null（未所属）なら {} を返し、デフォルト色 #2196f3 のままにする。
export function computeItemDecorations(
  colorMap: Map<number, string>,
  statusMap: Map<number, MilestoneStatus>,
  milestoneId?: number | null
): { backgroundColor?: string; opacity?: number } {
  if (milestoneId == null) return {};
  const out: { backgroundColor?: string; opacity?: number } = {};
  const color = colorMap.get(milestoneId);
  if (color) out.backgroundColor = color;
  if (statusMap.get(milestoneId) === 'waiting') out.opacity = 0.7;
  return out;
}
```

**Step 2:** ビルド確認。

```bash
bun run build   # Expected: 0 errors（新規ファイルのみ）
```

---

## Task 2: ヘルパの単体テスト

**Objective:** open / waiting / closed / 未所属（undefined / null）の各ケースで `computeItemDecorations` が正しいスタイルを返すことを証明する（受け入れ 2, 3 の根拠）。

**Files:**
- Create: `src/tests/milestoneLookup.spec.ts`

**Step 1:** 失敗テストを書く。

```ts
import { describe, it, expect } from 'vitest';
import {
  buildMilestoneColorMap,
  buildMilestoneStatusMap,
  computeItemDecorations,
} from '../lib/milestoneLookup';
import { MilestoneProps } from '../lib/TimelineType';

const milestones: MilestoneProps[] = [
  { id: 1, staff_id: 1000, title: 'open1', color: '#9c27b0', status: 'open', created_at: '2026-01-01', guideline_end_date: null },
  { id: 2, staff_id: 1000, title: 'waiting1', color: '#009688', status: 'waiting', created_at: '2026-01-02', guideline_end_date: null },
  { id: 3, staff_id: 1000, title: 'closed1', color: '#795548', status: 'closed', created_at: '2026-01-03', guideline_end_date: null },
];

describe('milestoneLookup', () => {
  it('builds color map id -> color', () => {
    const map = buildMilestoneColorMap(milestones);
    expect(map.get(1)).toBe('#9c27b0');
    expect(map.get(99)).toBeUndefined();
  });

  it('colors an event belonging to a milestone', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, 1)).toEqual({ backgroundColor: '#9c27b0' });
  });

  it('applies opacity 0.7 only when the milestone is waiting', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, 2)).toEqual({ backgroundColor: '#009688', opacity: 0.7 });
  });

  it('returns empty decoration for unassigned (undefined / null) events', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, undefined)).toEqual({});
    expect(computeItemDecorations(colors, statuses, null)).toEqual({});
  });
});
```

**Step 2:** テストが通ること（グリーン）を確認。

```bash
bun run testrun   # Expected: milestoneLookup.spec.ts が PASS
```

---

## Task 3: Timeline への配色配線（`GroupHorizonTimeline`）

**Objective:** `useMilestonesQuery()` でマイルストーンを取得し、`itemRenderer` 経由で各イベントへ所属色 / waiting 網掛けを反映する。

**Files:**
- Modify: `src/components/pages/TimelinePage.tsx`

**Step 1:** import 追加。

```tsx
import { useMilestonesQuery } from '../../resources/queries';
import { buildMilestoneColorMap, buildMilestoneStatusMap, computeItemDecorations } from '../../lib/milestoneLookup';
```

**Step 2:** コンポーネント冒頭（`isAdmin` の直後など）でマイルストーン取得と map 構築。

```tsx
const { data: milestones } = useMilestonesQuery();
const colorByMilestoneId = useMemo(() => buildMilestoneColorMap(milestones ?? []), [milestones]);
const statusByMilestoneId = useMemo(() => buildMilestoneStatusMap(milestones ?? []), [milestones]);
```

> `useMemo` は既に import 済み（L2）。

**Step 3:** `<Timeline>` に渡す `itemRenderer` を定義（`GroupHorizonTimeline` 内、return の直前）。デフォルト描画（resize ハンドル + `rct-item-content`）を `getItemProps` / `getResizeProps` で再現し、`computeItemDecorations` の結果を style にマージする。

```tsx
const itemRenderer = ({ item, itemContext, getItemProps, getResizeProps }: any) => {
  const { useResizeHandle, title, dimensions } = itemContext;
  const { left, right } = getResizeProps();
  const decor = computeItemDecorations(colorByMilestoneId, statusByMilestoneId, item.milestone_id);
  const { key, ref, ...rest } = getItemProps({ style: decor });
  return (
    <div {...rest} ref={ref} key={`${key}-outer`}>
      {useResizeHandle ? <div {...left} /> : null}
      <div className="rct-item-content" style={{ maxHeight: `${dimensions.height}px` }}>{title}</div>
      {useResizeHandle ? <div {...right} /> : null}
    </div>
  );
};
```

> `itemRenderer` は `<Timeline>` の型（`ItemRendererProps`）が推論できる場合はアノテーション最小化。`: any` は避け、ライブラリ型推論に任せる推奨。`canResize={false}` のため `useResizeHandle` は false になり resize ハンドルは描画されない。

**Step 4:** `<Timeline ... items={toTimelineStackItems(state)}` に `itemRenderer={itemRenderer}` を追加。

**Step 5:** ビルド確認。

```bash
bun run build   # Expected: 0 errors
```

**Step 6:** lint。

```bash
bun run lint    # Expected: 0 error / 0 warning（--max-warnings 0）
```

> 未使用 import が残らないよう注意（`import { useMilestonesQuery } ...` のコミット漏れ、`itemContext` の destructure 未使用変数に注意）。

---

## Task 4: `AddChildForm` にマイルストーンセレクト追加（edit モード）

**Objective:** Calendar のイベント詳細フォームで、進捗セレクトの下に **open のみ** を列挙するマイルストーンセレクトを追加し、`eventItem.milestone_id` を更新する（受け入れ 1）。

**Files:**
- Modify: `src/components/organisms/InputItem.tsx`

**Step 1:** import 追加。

```tsx
import { useMilestonesQuery } from '../../resources/queries';
```

**Step 2:** コンポーネント冒頭（`useGroupUsersQuery` の後）で取得と選択肢構築。

```tsx
const { data: milestones } = useMilestonesQuery();

// open のみ列挙（受け入れ要件 1）。現在所属のマイルストーンも選択肢に含め、値の round-trip を担保。
let milestoneOptions = (milestones ?? [])
  .filter((m) => m.status === 'open')
  .map((m) => ({ value: String(m.id), label: m.title }));
const curId = eventItem.milestone_id;
if (curId != null && !milestoneOptions.some((o) => Number(o.value) === curId)) {
  const cur = (milestones ?? []).find((m) => m.id === curId);
  if (cur) milestoneOptions.unshift({ value: String(cur.id), label: `${cur.title}（${cur.status}）` });
}
```

**Step 3:** 進捗セレクト（`</section>` L101）の直後にマイルストーンセクションを追加。

```tsx
<section className={boundaryTop}>
  <Text>マイルストーン：</Text>
  <NativeSelect
    name="milestone_id"
    value={eventItem.milestone_id == null ? '' : String(eventItem.milestone_id)}
    onChange={(e) => {
      const v = e.currentTarget.value;
      setEventItem({ ...eventItem, milestone_id: v === '' ? null : Number(v) });
    }}
    data={[
      { value: '', label: '---所属なし---' },
      ...milestoneOptions,
    ]}
  />
</section>
```

**Step 4:** 保存は既存 `EventUpdateButtons`（`/event/update/{id}`）に乗る。`EventUpdateButtons` が `{...indicateEvent, summary, progress}`（`EventUpdateButton.tsx:16-25`）を送り、`indicateEvent === eventItem` なので `milestone_id` が自動で含まれる。**変更不要**。

**Step 5:** ビルド確認。

```bash
bun run build   # Expected: 0 errors
```

> 決定（Q1）: 所属解除（「所属なし」→ `milestone_id: null`）はバックエンド `model_fields_set` 対応を**先に入れて**から保存可能になる（`light_token_server` 側で実施、フロントからは行わない）。フロントはセレクトの「所属なし」(`value: ''`) を `eventItem.milestone_id = null` に変換して送るだけ。バックエンド対応前は null が無視されるので、セレクトの round-trip と保存確認はバックエンド対応後に実施する。

---

## Task 5: readOnly モードに所属マイルストーン名を表示

**Objective:** Timeline 詳細（readOnly）で、staff_id 数値代わりのメンバー名表示と同じ要領で、所属マイルストーン名を表示する。

**Files:**
- Modify: `src/components/organisms/InputItem.tsx`

**Step 1:** `Task 4 Step 2` の `milestones` を edit と readOnly の両方で使えるよう、コンポーネント冒頭で取得（Task 4 で既に取得済み）。readOnly 分岐の表示用に解決。

```tsx
const milestoneId = selectedEvent.milestone_id;
const curMilestone = (milestones ?? []).find((m) => m.id === milestoneId);
```

**Step 2:** readOnly 分岐（`readOnlyMode` 内、進捗 `</section>` L75 の後）に表示追加。

```tsx
<section className={boundaryTop}>
  <Text>マイルストーン：</Text>
  {curMilestone
    ? <Text>{curMilestone.title}</Text>
    : <Text>所属なし</Text>}
</section>
```

（任意）色バーを併置：
```tsx
{curMilestone && <Box style={{ width: 20, height: 12, backgroundColor: curMilestone.color }} />}
```

**Step 3:** lint。

```bash
bun run lint    # Expected: 0 error / 0 warning
```

---

## Task 6: `InputItem.spec.tsx` にテスト追加

**Objective:** ①セレクトが open のみを列挙する ②選択変更が `eventItem.milestone_id`（number）に反映され、保存ペイロードに乗る、を検証する。

**Files:**
- Modify: `src/tests/InputItem.spec.tsx`

**Step 1:** `/milestone/all` のデータを react-query cache に投入（`milestoneKeys.all()`）。既存テストの `queryClient` 設定（L12-43）の後に追加。

```tsx
import { milestoneKeys } from '../resources/cache';
import { MilestoneProps } from '../lib/TimelineType';

const mockMilestones: MilestoneProps[] = [
  { id: 1, staff_id: 1000, title: 'open-ms', color: '#9c27b0', status: 'open', created_at: '2026-01-01', guideline_end_date: null },
  { id: 2, staff_id: 1000, title: 'waiting-ms', color: '#009688', status: 'waiting', created_at: '2026-01-02', guideline_end_date: null },
];
queryClient.setQueryData(milestoneKeys.all(), mockMilestones);
```

**Step 2:** edit モード（`renderWith(myEvent)` = readOnly 未指定）で、open のみがセレクトに表示されるテストを追加。

```tsx
it('edit モードでマイルストーンセレクトが open のみを表示する', () => {
  renderWith(myEvent);
  expect(screen.getByRole('combobox', { name: 'マイルストーン：' })).toBeInTheDocument();
  expect(screen.getByText('open-ms')).toBeInTheDocument();
  expect(screen.queryByText('waiting-ms')).not.toBeInTheDocument(); // waiting は出ない（受け入れ 1）
});
```

> `NativeSelect` の role は `combobox`。name 結び付けが難しい場合は `getAllByRole('combobox')[1]` 等に調整すること。

**Step 3:** ローカル状態へ `milestone_id` が設定されることの確認（必要なら decided: `EventUpdateButtons` の `handleUpdate` が `indicateEvent.milestone_id` を含むことを検証）。

**Step 4:** テスト実行。

```bash
bun run testrun   # Expected: InputItem.spec.tsx が全 PASS
```

---

## Task 7: 品質ゲート（全タスク終了後）

**Objective:** 静的品質・型・テストを親が一括確認する。

```bash
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0（0 error / 0 warning）
bun run build     # 0 errors
```

---

## Task 8: 決定事項の記録（確定済み）

以下の Open Questions はユーザーにより確定済み。実装時の前提として順守する。

### Q1. 所属解除（セレクト「所属なし」→ `milestone_id: null`）
- **決定:** バックエンド `model_fields_set` 対応を**先に入れる**（`light_token_server` で実施、フロントからは行わない）。これにより `milestone_id: null` が明示的に保存される。
- フロント側の責務: セレクトに「所属なし」(`value: ''`) を含め、選択時に `eventItem.milestone_id = null` へ変換して送る。`EventUpdateButtons` の `{...indicateEvent}` に `null` が載る。
- 実装順序への影響: `TimelinePage`（Task 3, Timeline 配色）と `InputItem`（Task 4-6, セレクト）はバックエンド対応と独立して開発可能。ただし「所属なし」の**保存確認**（実ブラウザ / 単体テスト）はバックエンド対応後に実施する。

### Q2. closed マイルストーン所属イベントの色
- **決定:** デフォルト色 `#2196f3` のまま（YAGNI 推奨どおり）。`/milestone/all` に closed は含まれないため lookup できず、`computeItemDecorations` は `{}` を返す → 既定色のまま表示される。将来必要になったら別対応（`milestone_status` 追加フィールド等）を検討。

### Q3. waiting 網掛けの実現方式
- **決定:** インライン `style={{ opacity: 0.7 }}`（`computeItemDecorations` の戻り値に `opacity` を含める、Task 3 の `getItemProps({ style })` 経由）。Vanilla Extract は動的値を直接持てないためインラインが簡明。

## 品質ゲート（全タスク終了後・再掲）

```bash
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0
bun run build     # 0 errors
```