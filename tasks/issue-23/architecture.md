# アーキテクチャ — イベントのマイルストーン所属と配色

この Issue は「イベントにマイルストーンを**所属**させ」「Timeline で**配色**する」。種まき（型・`/milestone/*`・`/event/update` の `milestone_id` 受容）は既に Issue #16//#18 で完了しているため、本設計はその上に UI と表示ロジックを足す。

## 1. 変更対象ファイル（見込み）

| ファイル | 変更 | 担当タスク |
|---------|------|-----------|
| `src/lib/milestoneLookup.ts`（新規） | 純粋ヘルパ: lookup map 構築 + 装飾計算 | Task 1 |
| `src/tests/milestoneLookup.spec.ts`（新規） | 上記の単体テスト | Task 2 |
| `src/components/organisms/InputItem.tsx` | `AddChildForm`: マイルストーンセレクト（edit）+ 所属名表示（readOnly） | Task 3, 5 |
| `src/components/organisms/InputItem.css.ts` | セレクト / 所属表示のレイアウト用スタイル | Task 3, 5 |
| `src/tests/InputItem.spec.tsx` | セレクト（open のみ / 保存対象に `milestone_id` が乗る）テスト追加 | Task 4 |
| `src/components/pages/TimelinePage.tsx` | `GroupHorizonTimeline`: `useMilestonesQuery` で color/status map 構築 + `itemRenderer` を `<Timeline>` に渡す | Task 6, 7 |

バックエンド変更は**不要**。`/event/update/{event_id}` が既に `milestone_id` を部分更新する（`light_token_server/app/routers/timetable.py:197-206`）。契約の両リポジトリ同時変更の原則は本 Issue には該当しない。

## 2. データ契約（既存・フロントが消費するもの）

### 2-1. `/event/update/{event_id}`（POST、既存）
- body: `EventUpdate` — `summary?`, `progress?`, `milestone_id?: int | null`, `completed?: bool | null`（`app/schemas.py:27-28`）
- `milestone_id: null` を送れば「所属なし」にできる。**決定（Q1）:** バックエンド `EventUpdate` に `model_fields_set`（送られたかの判別）対応を**先に入れる**（`light_token_server` 側で実施、フロントからは行わない）。これにより `milestone_id: null` が明示的に保存され、所属解除が成立する。フロント側は「所属なし」(`value: ''` → `null`) を含むセレクトをそのまま送るだけでよい。

### 2-2. `/milestone/all`（GET、既存）
- レスポンス: `MilestoneProps[]`（open + waiting、closed は除く）
- `MilestoneProps`: `{ id, staff_id, title, description?, color, status: MilestoneStatus, created_at, guideline_end_date?, accomplished_date? }`

### 2-3. 型は変更しない
- `TimelineEventProps.milestone_id?: number | null` / `completed?: boolean` を**そのまま維持**（設計判断: `completed` を `MilestoneStatus` 型にしない。waiting はマイルストーン側の status から派生させる — 根拠は `.hermes/plans/2026-08-31_000000-milestone-waiting-event-color.md` と memory）。

## 3. Timeline のイベント配色（react-calendar-timeline）

ライブラリ（0.30.0-beta.4、vendored/minified）の描画契約を確認済み:

- 各項目は `rct-item` div として描画され、`getItemProps(params)` が `style` を返す。`getItemStyle` は `{ ...default(#2196f3), ...selected(#ffc107), ..., params.style, positioning }` の順でマージする（`dist/react-calendar-timeline.es.js` の `getItemStyle` / `getItemProps`）。よって `getItemProps({ style: { backgroundColor } })` でデフォルト色を上書きできる。
- `<Timeline>` に `itemRenderer` を渡すとカスタム描画ができる。デフォルト描画（`Li`）は以下を再現する必要がある:
  ```tsx
  // 要約: resize ハンドル(Li) → <div className="rct-item-content" style={{maxHeight:`${dimensions.height}`}}>{title}</div> → 右 resize ハンドル
  ```

配色ロジックは**純粋関数**に切り出し、単体テストを容易にする。

### 3-1. 純粋ヘルパ（`src/lib/milestoneLookup.ts`）

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
export function computeItemDecorations(
  colorMap: Map<number, string>,
  statusMap: Map<number, MilestoneStatus>,
  milestoneId?: number | null
): { backgroundColor?: string; opacity?: number } {
  if (milestoneId == null) return {};
  const out: { backgroundColor?: string; opacity?: number } = {};
  const color = colorMap.get(milestoneId);
  if (color) out.backgroundColor = color;
  if (statusMap.get(milestoneId) === 'waiting') out.opacity = 0.7; // 受け入れ 3
  return out;
}
```

- `milestoneId == null` は `undefined | null` を吸収（配色なし）。
- `Map` ではなく素の record `Record<number,...>` にする選択肢もあるが、`/milestone/all` の数は小さいため `Map` で十分。

### 3-2. `GroupHorizonTimeline` での配線（`TimelinePage.tsx`）

```tsx
const { data: milestones } = useMilestonesQuery();
const colorByMilestoneId = useMemo(() => buildMilestoneColorMap(milestones ?? []), [milestones]);
const statusByMilestoneId = useMemo(() => buildMilestoneStatusMap(milestones ?? []), [milestones]);

const itemRenderer: NonNullable<...> = (
  { item, itemContext, getItemProps, getResizeProps }
) => {
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

- `<Timeline items={toTimelineStackItems(state)} itemRenderer={itemRenderer} ... />` に渡す。
- `item.milestone_id` が `undefined`/`null`（未所属）なら `decor = {}` → デフォルト `#2196f3` のまま。
- `opacity: 0.7` はインライン style。Vanilla Extract は動的値を直接持てないため、インラインで足りる（要件は「クラス付与」だがインライン opacity は等価。クラスにしたい場合は `itemContext` / `getItemProps` の `className` に追加すればよい）。インライン推奨（シンプル）。
- `itemRenderer` のパラメタはライブラリの `ItemRendererProps<CustomItem>` から来るため型注釈は最小化。`TimelineStackItem` は `TimelineEventProps` を spread したものなので `milestone_id` を持つ。

## 4. Calendar の `AddChildForm`（`InputItem.tsx`）へのセレクト追加

### 4-1. edit モード（非 readOnly）

進捗 `NativeSelect`（現在 L95-100）の**下**にマイルストーンセレクトを追加:

```tsx
// open のみ列挙（受け入れ要件 1）。現在所属のマイルストーンも選択肢に含め値の round-trip を担保。
const { data: milestones } = useMilestonesQuery();
const milestoneOptions = (milestones ?? [])
  .filter((m) => m.status === 'open')
  .map((m) => ({ value: String(m.id), label: m.title }));
const curId = eventItem.milestone_id;
if (curId != null && !milestoneOptions.some((o) => Number(o.value) === curId)) {
  const cur = (milestones ?? []).find((m) => m.id === curId);
  if (cur) milestoneOptions.unshift({ value: String(cur.id), label: `${cur.title}（${cur.status}）` });
}
```

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

- 保存: 既存 `EventUpdateButtons`（`/event/update/{id}`）が `{ ...indicateEvent, summary, progress }` を送る。`indicateEvent.id` と `indicateEvent.milestone_id` が state 由来なので、セレクト変更はそのまま送信に乗る。**変更不要**。（`EventUpdateButton.tsx:16-25`）
- 所属解除（`milestone_id: null`）: **決定（Q1）**に基づき、バックエンド `model_fields_set` 対応が先に入る前提で「所属なし」(`value: ''` → `null`) を送る。セレクトの `value: ''` を `eventItem.milestone_id = null` に変換して送信ペイロードへ含める（`EventUpdateButtons` の `{...indicateEvent}` に `milestone_id: null` が載る）。

### 4-2. readOnly モード

進捗の下に、所属マイルストーン名（+ 色バー）を表示:

```tsx
const milestoneId = selectedEvent.milestone_id;
const curMilestone = (milestones ?? []).find((m) => m.id === milestoneId);
// ...readOnly 内:
<section className={boundaryTop}>
  <Text>マイルストーン：</Text>
  {curMilestone
    ? <Text>{curMilestone.title}</Text>   // 色バーは <Box style={{backgroundColor: curMilestone.color}} /> を併置可
    : <Text>所属なし</Text>}
</section>
```

- readOnly は `useMilestonesQuery` を既に読み込むため、`milestones` は edit / readOnly 共通で取得すればよい。

## 5. TanStack Query

バックエンドへの新規エンドポイント追加はない。既存の再利用のみ:
- `useMilestonesQuery()`（`src/resources/queries.ts:118-123`）— `/milestone/all`
- `useUpdateEventMutation(targetId)`（`src/hooks/useEventMutation.ts:33-48`）— `/event/update/{id}`（保存、既存 `EventUpdateButtons` 経由）

## 6. 管理権限判定

本 Issue では権限ロジックの変更はない。セレクトは Calendar 側の編集フォームに置くが、表示要件は open マイルストーンの列挙のみ。保存は所有者のみ可能（`isOwnEvent` の下に `EventUpdateButtons` が表示され、`/event/update` は token 所有者が前提）。