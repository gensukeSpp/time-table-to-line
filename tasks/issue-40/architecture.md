# アーキテクチャ — 'open', 'waiting' 状態マイルストーンのイベント参照

マイルストーンのタイトル一覧から、所属イベントを progress 別アコーディオンで閲覧する。バックエンドのエンドポイント（open + waiting）は既に存在するため、**権限緩和 + `group_name` 付与**をバックエンドで行い、フロントに参照 UI を新設する。

## 1. 変更対象ファイル（見込み）

### バックエンド（`light_token_server`）
| ファイル | 変更 | 担当タスク |
|---------|------|-----------|
| `app/routers/timetable.py:294-321` | `_get_milestone_events` で各イベント dict に `group_name` を付与。`get_milestone_events` の admin gate を撤去（require_token のみ） | Task 1 |
| `tests/test_milestone.py:164-172` | `test_milestone_events_forbidden_for_non_admin` を「非 admin でも 200」へ更新。`group_name` の検証追加 | Task 1 |

### フロントエンド（`time-table-to-line`）
| ファイル | 変更 | 担当タスク |
|---------|------|-----------|
| `src/lib/TimelineType.ts` | `MilestoneEventProps` 型 + progress 分類用の型を追加 | Task 2 |
| `src/lib/milestoneEvents.ts`（新規） | `normalizeProgressGroup` / `groupMilestoneEventsByProgress` 純粋ヘルパ | Task 3 |
| `src/tests/milestoneEvents.spec.ts`（新規） | 上記ヘルパの単体テスト | Task 3 |
| `src/resources/fetch.ts` | `fetchMilestoneEvents(milestoneId)` 追加（`GET /milestone/{id}/events`） | Task 4 |
| `src/resources/cache.ts` | `milestoneKeys.events(id)` 追加 | Task 4 |
| `src/resources/queries.ts` | `useMilestoneEventsQuery(milestoneId, {enabled})` 追加 | Task 4 |
| `src/resources/queries.spec.tsx` | 新クエリのテスト（mock 経由） | Task 5 |
| `src/components/organisms/MilestoneEventsDrawer.tsx`（新規） | Mantine `Drawer`(position="right") + `Accordion` でイベント一覧を表示 | Task 6 |
| `src/components/organisms/MilestoneEventsDrawer.css.ts`（新規） | title の 1/2 行 clamp、行レイアウト | Task 6 |
| `src/components/organisms/MilestoneListTitle.tsx` | タイトル右に '...' ボタン追加、`onOpenEvents` コールバック | Task 7 |
| `src/components/organisms/MilestoneList.tsx` | `eventsMilestone` state を持ち、Drawer へ配線 | Task 7 |
| `src/components/organisms/MilestoneEventsDrawer.test.tsx`（新規） | Drawer + Accordion のコンポーネントテスト | Task 8 |
| `src/components/organisms/MilestoneList.test.tsx` | mock 追加（`useMilestoneEventsQuery`）、'...' → Drawer 表示テスト | Task 8 |

## 2. API 契約

### 2-1. 既存 `GET /milestone/{milestone_id}/events`（改修）
- 対象: `status ∈ {open, waiting}`（closed は 404）。
- 返り値: `[EventORM の dict]` に **`group_name` を追加**した配列。
- **権限: `admin gate を撤去し `require_token` のみに緩和**（一般ユーザー閲覧可。closed 用 `get_closed_milestone_events` は admin のまま）。

レスポンス要素（各イベント）:
```jsonc
{
  "id": 12,
  "staff_id": 1001,
  "group": 3,                 // group_id（既存）
  "group_name": "グループA",   // ★追加（Team.SHORTNAME）
  "start": "2026-08-02T10:00:00.000Z",
  "end": "2026-08-02T11:00:00.000Z",
  "title": "child",
  "summary": null,
  "progress": "これから",
  "milestone_id": 9,
  "completed": false
}
```

バックエンド実装（`_get_milestone_events` の返却部）:
```python
events = db.query(EventORM).filter(EventORM.milestone_id == milestone_id).all()
result = []
for ev in events:
    d = ev.to_dict()
    team = db.get(Team, d["group"])
    d["group_name"] = team.SHORTNAME if team else None
    result.append(d)
return result
```

### 2-2. 決定 D1 — `group_id → group_name` はフロント不可 → バックエンド委譲
- `GET /group-names` は `[SHORTNAME, ...]`（CODE 無し）でID→名前マップを作れない。
- `GET /group/users` はメンバーのかなのみでグループ名を持たない。
- `/timetable/inquiry` は自分のグループ名のみ（他グループのイベントには使えない）。
- **結論:** フロントで解決不可のため、`/milestone/{id}/events` のレスポンスに `group_name` を付与する（Issue の「不可能ならバックエンドに一旦委譲」に該当）。

### 2-3. 決定 D2 — 閲覧権限の緩和
- 各マイルストーンタイトルの '...' ボタンは全ユーザーに表示される（`MilestoneList` は admin でゲートしていない）。
- よって非 admin でもスライドが開けるように、`/milestone/{id}/events` の admin gate を撤去する。イベントの**編集**は従来どおり既存権限（所有者 / admin）に従う。
- 矛盾する既存テスト 1 件（非 admin → 403）を「非 admin → 200」に更新。

## 3. 型定義（フロント）

`src/lib/TimelineType.ts` に追加:
```ts
// /milestone/{id}/events レスポンス要素（EventORM.to_dict() に group_name を足した形）
export interface MilestoneEventProps {
  id: number;
  staff_id: number;
  group: number;
  group_name: string | null;
  start: string;        // ISO 文字列
  end: string;
  title: string;
  summary?: string | null;
  progress?: string | null;
  milestone_id: number | null;
  completed: boolean;
}

export type ProgressGroupKey = 'これから' | 'まだ' | 'もうすぐ' | '完了' | '指定なし';
```

## 4. 純粋ヘルパ（`src/lib/milestoneEvents.ts`）

```ts
import { MilestoneEventProps, ProgressGroupKey } from './TimelineType';

// 進捗ラベル / 英字トークン → アコーディオングループキー。
// null / 空 / 未知値は「指定なし」。表示順は PROGRESS_GROUP_ORDER で固定。
const TOKEN_TO_GROUP: Readonly<Record<string, ProgressGroupKey>> = {
  これから: 'これから', まだ: 'まだ', もうすぐ: 'もうすぐ', 完了: '完了',
  'from now': 'これから', still: 'まだ', almost: 'もうすぐ', complete: '完了',
};

export const PROGRESS_GROUP_ORDER: Readonly<ProgressGroupKey[]> =
  ['これから', 'まだ', 'もうすぐ', '完了', '指定なし'];

export function normalizeProgressGroup(progress?: string | null): ProgressGroupKey {
  if (!progress) return '指定なし';
  return TOKEN_TO_GROUP[progress] ?? '指定なし';
}

// イベントを progress 順にグループ化。空グループは含めない。
export interface ProgressGroup {
  key: ProgressGroupKey;
  events: MilestoneEventProps[];
}

export function groupMilestoneEventsByProgress(events: MilestoneEventProps[]): ProgressGroup[] {
  return PROGRESS_GROUP_ORDER
    .map((key) => ({ key, events: (events ?? []).filter((e) => normalizeProgressGroup(e.progress) === key) }))
    .filter((g) => g.events.length > 0);
}
```

> `progressColor.ts` の `PROGRESS_TOKEN_TO_LABEL` と別マップだが、トークン対応は同一に保つ（「完了」等のラベルは HTML/進捗セレクトの options.value と揃える）。

## 5. TanStack Query

### query key（`src/resources/cache.ts`）
```ts
export const milestoneKeys = {
  all: () => ['milestone', 'all'] as const,
  events: (id: number) => ['milestone', 'events', id] as const,
};
```

### fetch（`src/resources/fetch.ts`）
```ts
export const fetchMilestoneEvents = async (milestoneId: number): Promise<MilestoneEventProps[]> => {
  const { data } = await basicAxios.get<MilestoneEventProps[]>(`/milestone/${milestoneId}/events`);
  return data;
};
```
（`fetchMilestones` と同様、Authorization は Axios インターセプターが付与。）

### query hook（`src/resources/queries.ts`）
```ts
export const useMilestoneEventsQuery = (milestoneId: number | null, enabled: boolean) => {
  return useQuery({
    queryKey: milestoneKeys.events(milestoneId!),
    queryFn: () => fetchMilestoneEvents(milestoneId!),
    enabled: enabled && milestoneId != null,
  });
};
```
- Drawer を開くまで fetch しないよう、`enabled` でゲート（開いたときだけ取得）。

## 6. コンポーネント配置

### 6-1. `MilestoneListTitle`（変更）
- 既存のタイトルボタン（`onOpenDetail`）の**右**に `ActionIcon`（あるいは小ボタン）で '...' を追加。
- 新 prop `onOpenEvents: (milestone: MilestoneProps) => void` を追加。'...' クリックで `onOpenEvents(milestone)`。

### 6-2. `MilestoneList`（変更）
- `const [eventsMilestone, setEventsMilestone] = useState<MilestoneProps | null>(null)` を追加。
- `<MilestoneListTitle onOpenEvents={setEventsMilestone} ... />` に渡す。
- `{eventsMilestone && <MilestoneEventsDrawer milestone={eventsMilestone} onClose={() => setEventsMilestone(null)} />}` を描画。

### 6-3. `MilestoneEventsDrawer`（新規）
```tsx
<Drawer
  opened
  position="right"
  title={<Box ...>カラーバー + マイルストーンタイトル</Box>}
  onClose={onClose}
>
  <Accordion>
    {groups.map((g) => (
      <Accordion.Item key={g.key} value={g.key}>
        <Accordion.Control>{g.key}（{g.events.length}）</Accordion.Control>
        <Accordion.Panel>
          {g.events.map((ev) => <MilestoneEventRow key={ev.id} event={ev} />)}
        </Accordion.Panel>
      </Accordion.Item>
    ))}
  </Accordion>
</Drawer>
```
- `useMilestoneEventsQuery(milestone.id, opened)` でデータ取得（ローディング / エラーは Drawer 内で表示）。
- `groups = useMemo(() => groupMilestoneEventsByProgress(data ?? []), [data])`。
- `MilestoneEventRow`（同ファイル内の小コンポーネント or 分離）:
  - タイトル: `-webkit-line-clamp: 1`（既定・三点リーダー）、クリックで `2` へトグル。
  - その下 3 行: `スタッフID: {staff_id}` / `グループ名: {group_name ?? '不明'}` / `開始日時: {format(new Date(ev.start), 'yyyy/MM/dd HH:mm')}`。

### 6-4. `MilestoneEventsDrawer.css.ts`（新規）
```ts
export const title = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
});
```
- clamp 行数（1 / 2）はインライン `style={{ WebkitLineClamp: expanded ? 2 : 1 }}` か、`:global` を使わずクラス切替で実現。クラス切替（`clamp1` / `clamp2`）を推奨。

## 7. 決定事項まとめ

| ID | 決定 |
|----|------|
| D1 | `group_id → group_name` はフロント解決不可 → バックエンドで `group_name` を付与 |
| D2 | `/milestone/{id}/events` の admin gate 撤去（require_token のみ）。closed 用は admin のまま。矛盾テストを更新 |
| D3 | 進捗 null / 未知 → 「指定なし」。表示順: これから→まだ→もうすぐ→完了→指定なし |
| D4 | スライドは Mantine `Drawer position="right"`、進捗分類は `Accordion` |
| D5 | title は `-webkit-line-clamp: 1` 既定 → クリックで `2` |
