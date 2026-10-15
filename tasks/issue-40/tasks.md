# 実装タスク — 'open', 'waiting' 状態マイルストーンのイベント参照

> 各タスクの後で適宜 `bun run build` / `bun run lint` / `bun run testrun` を実行し、進捗を止めない。
> 実行順序は **1 → 8 の直列依存**（各 Task 内の Step は順に）。サブエージェントに投げる場合、**Task 1（バックエンド）を先に完了**してから、Task 2〜5（型 / ヘルパ / クエリ）と Task 6〜8（UI）を依存が満たされる範囲で並列化してよい。
> 親は最終の `bun run build` / `bun run lint` / `bun run testrun`、およびバックエンド `pytest` を必ず自身で実行して品質ゲートを締める（Task 9）。

---

## Task 1: バックエンド — `group_name` 付与 + 閲覧権限緩和

**Objective:** `GET /milestone/{milestone_id}/events`（open + waiting）のレスポンス各イベントに `group_name` を追加し、admin 限定を require_token のみに緩和する（D1 / D2）。

**Files:**
- Modify: `light_token_server/app/routers/timetable.py:294-321`
- Modify: `light_token_server/tests/test_milestone.py:106-172`

**Step 1:** `_get_milestone_events` の返却部を、各イベント dict に `group_name` を付与する形へ変更。

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

> `Team` は `app/routers/timetable.py` 冒頭で既に import 済み（L12）。閉じた `_get_milestone_events` が返す dict は open/waiting / closed 共通で `group_name` を持つようになる（回帰なし、既存テストは追加フィールド非検証）。

**Step 2:** `get_milestone_events` の admin gate を撤去。

```python
@router.get("/milestone/{milestone_id}/events")
def get_milestone_events(
    milestone_id: int,
    claims: dict = Depends(require_token),
    db: Session = Depends(get_db),
):
    return _get_milestone_events(
        db, milestone_id, [MILESTONE_OPEN, MILESTONE_WAITING]
    )
```

> これで一般ユーザー（admin でない）でも閲覧可。`get_closed_milestone_events` は admin のまま変更しない。

**Step 3:** 既存テスト `test_milestone_events_forbidden_for_non_admin`（L164-172）を「非 admin でも 200 / 一覧が返る」へ更新。

```python
def test_milestone_events_allowed_for_non_admin(client):
    milestone_id = _add(client, "M1").json()["id"]
    ev = _add_event(client, milestone_id=milestone_id)
    assert ev.status_code == 201

    response = client.get(
        f"/milestone/{milestone_id}/events",
        headers=_bearer(False),  # 非 admin でも閲覧可（D2）
    )
    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [ev.json()["id"]]
```

**Step 4:** `test_milestone_events_returns_events_across_groups`（L106）に `group_name` の検証を追加。

```python
    events = response.json()
    by_id = {e["id"]: e for e in events}
    assert by_id[first.json()["id"]]["group_name"] == "SHORT_A"  # group 3 の Team
    assert by_id[second.json()["id"]]["group_name"] == "SHORT_B"  # group 4 の Team
```

> group 3 / 4 それぞれの `Team` SHORTNAME に合わせて期待値を設定すること。fixture に `Team(3)` / `Team(4)` の SHORTNAME が既にある前提（conftest を確認）。

**Step 5:** バックエンドテストを実行。

```bash
cd ../light_token_server && python -m pytest tests/test_milestone.py -q
# Expected: 全 PASS（更新した 2 件含む）
```

**Step 6:** Commit。

```bash
git add app/routers/timetable.py tests/test_milestone.py
git commit -m "feat(issue-40): milestone events に group_name 付与 & 閲覧を require_token のみに緩和"
```

---

## Task 2: フロント型追加（`MilestoneEventProps` / `ProgressGroupKey`）

**Objective:** `/milestone/{id}/events` のレスポンス要素と進捗グループキーの型を定義する。

**Files:**
- Modify: `src/lib/TimelineType.ts`

**Step 1:** 末尾付近に追加。

```ts
// /milestone/{id}/events レスポンス要素（EventORM.to_dict() + group_name）
export interface MilestoneEventProps {
  id: number;
  staff_id: number;
  group: number;
  group_name: string | null;
  start: string;
  end: string;
  title: string;
  summary?: string | null;
  progress?: string | null;
  milestone_id: number | null;
  completed: boolean;
}

export type ProgressGroupKey = 'これから' | 'まだ' | 'もうすぐ' | '完了' | '指定なし';
```

**Step 2:** ビルド確認。

```bash
bun run build   # Expected: 0 errors（型追加のみ）
```

**Step 3:** Commit。

```bash
git add src/lib/TimelineType.ts
git commit -m "feat(issue-40): MilestoneEventProps / ProgressGroupKey 型を追加"
```

---

## Task 3: 純粋ヘルパ `milestoneEvents.ts` + 単体テスト

**Objective:** 進捗を正規化して「指定なし」を含む 5 グループに分類する純粋関数を作る（受け入れ 2, 3 の根拠）。

**Files:**
- Create: `src/lib/milestoneEvents.ts`
- Create: `src/tests/milestoneEvents.spec.ts`

**Step 1:** 失敗テストを書く（TDD RED）。

```ts
import { describe, it, expect } from 'vitest';
import {
  normalizeProgressGroup,
  groupMilestoneEventsByProgress,
  PROGRESS_GROUP_ORDER,
} from '../lib/milestoneEvents';
import { MilestoneEventProps } from '../lib/TimelineType';

const ev = (id: number, progress?: string | null): MilestoneEventProps => ({
  id, staff_id: 1001, group: 3, group_name: 'G', start: '2026-08-02T10:00:00.000Z',
  end: '2026-08-02T11:00:00.000Z', title: 'e' + id,
  progress: progress ?? null, milestone_id: 1, completed: false,
});

describe('milestoneEvents', () => {
  it('normalize: label / token / null → group', () => {
    expect(normalizeProgressGroup('これから')).toBe('これから');
    expect(normalizeProgressGroup('from now')).toBe('これから');
    expect(normalizeProgressGroup(null)).toBe('指定なし');
    expect(normalizeProgressGroup('')).toBe('指定なし');
    expect(normalizeProgressGroup('unknown')).toBe('指定なし');
  });

  it('groups by progress in fixed order and omits empty groups', () => {
    const groups = groupMilestoneEventsByProgress([
      ev(1, '完了'), ev(2, null), ev(3, 'これから'), ev(4, 'まだ'), ev(5, 'もうすぐ'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['これから', 'まだ', 'もうすぐ', '完了', '指定なし']);
    expect(groups[0].events.map((e) => e.id)).toEqual([3]);
    expect(groups[4].events.map((e) => e.id)).toEqual([2]);
  });

  it('returns [] for empty input', () => {
    expect(groupMilestoneEventsByProgress([])).toEqual([]);
  });
});
```

**Step 2:** テストが失敗する（`科目 'milestoneEvents' は未定義`）ことを確認。

```bash
bun run testrun   # Expected: milestoneEvents.spec.ts が FAIL（モジュール無し）
```

**Step 3:** 実装（TDD GREEN）。

```ts
import { MilestoneEventProps, ProgressGroupKey } from './TimelineType';

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

**Step 4:** テストが通ること（GREEN）を確認。

```bash
bun run testrun   # Expected: milestoneEvents.spec.ts が PASS
```

**Step 5:** lint / build。

```bash
bun run lint && bun run build   # Expected: 0 error / 0 warning / 0 errors
```

**Step 6:** Commit。

```bash
git add src/lib/milestoneEvents.ts src/tests/milestoneEvents.spec.ts
git commit -m "feat(issue-40): progress 別グループ化ヘルパと単体テストを追加"
```

---

## Task 4: fetch / query key / query hook 追加

**Objective:** フロントから `/milestone/{id}/events` を取得する TanStack Query 一式を追加する。

**Files:**
- Modify: `src/resources/cache.ts`
- Modify: `src/resources/fetch.ts`
- Modify: `src/resources/queries.ts`

**Step 1:** `milestoneKeys.events(id)` 追加（`cache.ts:53-55`）。

```ts
export const milestoneKeys = {
  all: () => ['milestone', 'all'] as const,
  events: (id: number) => ['milestone', 'events', id] as const,
};
```

**Step 2:** `fetch.ts` に `fetchMilestoneEvents` 追加（`fetchMilestones` L51-54 の直後）。

```ts
import { AuthInfoProp, GroupUserProps, MilestoneEventProps, MilestoneProps, TimelineEventProps } from "../lib/TimelineType";

export const fetchMilestoneEvents = async (milestoneId: number): Promise<MilestoneEventProps[]> => {
  const { data } = await basicAxios.get<MilestoneEventProps[]>(`/milestone/${milestoneId}/events`);
  return data;
};
```

**Step 3:** `queries.ts` に `useMilestoneEventsQuery` 追加（`useMilestonesQuery` L119-127 の直後）。

```ts
import { fetchEventsDataForTT, fetchEventsData, fetchAuthResponse, refresh, requestGroup, requestGroupMember, fetchMilestones, fetchMilestoneEvents } from "./fetch";
import { eventKeys, authKeys, milestoneKeys } from "./cache";

// Drawer を開くまで fetch しないよう enabled でゲート（開いたときだけ取得）。
export const useMilestoneEventsQuery = (milestoneId: number | null, enabled: boolean) => {
  return useQuery({
    queryKey: milestoneKeys.events(milestoneId!),
    queryFn: () => fetchMilestoneEvents(milestoneId!),
    enabled: enabled && milestoneId != null,
  });
};
```

**Step 4:** build / lint。

```bash
bun run lint && bun run build   # Expected: 0 error / 0 warning / 0 errors
```

**Step 5:** Commit。

```bash
git add src/resources/cache.ts src/resources/fetch.ts src/resources/queries.ts
git commit -m "feat(issue-40): milestone events 用 fetch / query key / query hook を追加"
```

---

## Task 5: クエリの単体テスト（`queries.spec.tsx`）

**Objective:** `useMilestoneEventsQuery` が `enabled=false` で fetch しない / `enabled=true` で `/milestone/{id}/events` を取得することを検証する。

**Files:**
- Modify: `src/resources/queries.spec.tsx`

**Step 1:** 既存の `vi.mock('./fetch')` ファクトリに `fetchMilestoneEvents` を追加（**ファクトリはテストが import する全エクスポートを列挙しないとモジュール解決に失敗する**）。

```ts
vi.mock('./fetch', () => ({
  ...vi.importActual('./fetch'),
  fetchMilestoneEvents: vi.fn(),
}));
```

**Step 2:** テスト追加（`useMilestonesQuery` の refetch テストと同じ `QueryClientProvider` 配下、`vi.useFakeTimers()` は不要）。

```tsx
it('useMilestoneEventsQuery fetches only when enabled', async () => {
  const { useMilestoneEventsQuery } = await import('./queries');
  const { fetchMilestoneEvents } = await import('./fetch');

  (fetchMilestoneEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

  const { result, rerender } = renderHook(
    ({ id, enabled }) => useMilestoneEventsQuery(id, enabled),
    { initialProps: { id: 1, enabled: false }, wrapper },
  );
  expect(fetchMilestoneEvents).not.toHaveBeenCalled();

  rerender({ id: 1, enabled: true });
  await waitFor(() => expect(fetchMilestoneEvents).toHaveBeenCalledWith(1));
  expect(result.current.data).toEqual([]);
});
```

> `renderHook` / `waitFor` は既存テストで既に import 済みであれば再利用。`wrapper` は既存の `QueryClientProvider` ラッパーを使う。

**Step 3:** テスト実行。

```bash
bun run testrun   # Expected: queries.spec.tsx が PASS
```

**Step 4:** Commit。

```bash
git add src/resources/queries.spec.tsx
git commit -m "test(issue-40): useMilestoneEventsQuery の enable ゲートを検証"
```

---

## Task 6: `MilestoneEventsDrawer` コンポーネント + スタイル

**Objective:** 右スライドの Drawer 内に progress 別アコーディオンでイベント一覧（タイトル + スタッフID / グループ名 / 開始日時）を表示する（受け入れ 1, 2, 3, 4, 5）。

**Files:**
- Create: `src/components/organisms/MilestoneEventsDrawer.css.ts`
- Create: `src/components/organisms/MilestoneEventsDrawer.tsx`

**Step 1:** スタイル（`.css.ts`）作成。

```ts
import { style } from '@vanilla-extract/css';

export const header = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.5rem',
});

export const colorBar = style({
  width: '1.25rem',
  height: '0.75rem',
  borderRadius: '3px',
  flexShrink: 0,
});

export const eventRow = style({
  padding: '0.25rem 0',
  borderBottom: '1px solid #eceff1',
});

// title clamp: 既定は 1 行、クリックで 2 行（クラス切替）
export const clampLine = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
  wordBreak: 'break-word',
});

export const clamp1 = style({ WebkitLineClamp: 1 });
export const clamp2 = style({ WebkitLineClamp: 2 });

export const metaLine = style({
  fontSize: '0.85rem',
  color: '#546e7a',
  margin: 0,
});
```

**Step 2:** コンポーネント作成。

```tsx
import { useState } from 'react';
import { Box, Drawer, Accordion, Text, Loader, Button } from '@mantine/core';
import { format } from 'date-fns';

import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';
import { groupMilestoneEventsByProgress } from '../../lib/milestoneEvents';
import { useMilestoneEventsQuery } from '../../resources/queries';
import { header, colorBar, eventRow, clampLine, clamp1, clamp2, metaLine } from './MilestoneEventsDrawer.css';

interface MilestoneEventsDrawerProps {
  milestone: MilestoneProps;
  onClose: () => void;
}

const MilestoneEventRow = ({ event }: { event: MilestoneEventProps }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box className={eventRow}>
      <Text
        className={`${clampLine} ${expanded ? clamp2 : clamp1}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {event.title}
      </Text>
      <Text className={metaLine}>スタッフID: {event.staff_id}</Text>
      <Text className={metaLine}>グループ名: {event.group_name ?? '不明'}</Text>
      <Text className={metaLine}>開始日時: {format(new Date(event.start), 'yyyy/MM/dd HH:mm')}</Text>
    </Box>
  );
};

export const MilestoneEventsDrawer = ({ milestone, onClose }: MilestoneEventsDrawerProps) => {
  const { data, isPending, isError, error } = useMilestoneEventsQuery(milestone.id, true);
  const groups = groupMilestoneEventsByProgress(data ?? []);

  return (
    <Drawer opened position="right" onClose={onClose} size="md" title={
      <Box className={header}>
        <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
        <Text>{milestone.title}</Text>
      </Box>
    }>
      {isPending ? (
        <Loader size="sm" />
      ) : isError ? (
        <Box>
          <Text>{error?.message || 'イベントの取得に失敗しました'}</Text>
          <Button onClick={onClose}>閉じる</Button>
        </Box>
      ) : groups.length === 0 ? (
        <Text c="dimmed">所属イベントはありません</Text>
      ) : (
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
      )}
    </Drawer>
  );
};
```

> `opened` は「常時開いている」状態で渡す（親 `MilestoneList` が `eventsMilestone != null` のときだけマウントするため）。Drawer の外側クリック / Escape は Mantine `Drawer` が標準処理する。

**Step 3:** build / lint。

```bash
bun run lint && bun run build   # Expected: 0 error / 0 warning / 0 errors
```

**Step 4:** Commit。

```bash
git add src/components/organisms/MilestoneEventsDrawer.tsx src/components/organisms/MilestoneEventsDrawer.css.ts
git commit -m "feat(issue-40): MilestoneEventsDrawer（Drawer + progress 別 Accordion）を追加"
```

---

## Task 7: '...' ボタン追加 + `MilestoneList` への配線

**Objective:** マイルストーンタイトル右に '...' ボタンを置き、クリックで Drawer を開く（受け入れ 1）。

**Files:**
- Modify: `src/components/organisms/MilestoneListTitle.tsx`
- Modify: `src/components/organisms/MilestoneList.tsx`
- Modify: `src/components/organisms/MilestoneList.css.ts`

**Step 1:** `MilestoneListTitle` に '...' ボタン追加。

```tsx
import { Box, Text, UnstyledButton, ActionIcon } from '@mantine/core';
import { item, colorBar, waitingDate, titleButton, moreButton } from './MilestoneList.css';

interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  onOpenDetail: (milestone: MilestoneProps) => void;
  onOpenEvents: (milestone: MilestoneProps) => void;   // 追加
}

// <Box className={item}> の末尾（タイトルボタンの後）に追加:
<ActionIcon
  className={moreButton}
  variant="subtle"
  aria-label={`${milestone.title} のイベント`}
  onClick={() => onOpenEvents(milestone)}
>
  ...
</ActionIcon>
```

**Step 2:** `MilestoneList.css.ts` に `moreButton` 追加。

```ts
export const moreButton = style({
  flexShrink: 0,
  color: '#78909c',
  ':hover': { color: '#37474f' },
});
```

**Step 3:** `MilestoneList` に `eventsMilestone` state と Drawer 配線。

```tsx
import { MilestoneEventsDrawer } from './MilestoneEventsDrawer';
// state 追加
const [eventsMilestone, setEventsMilestone] = useState<MilestoneProps | null>(null);

// map 内:
<MilestoneListTitle
  key={milestone.id}
  milestone={milestone}
  onOpenDetail={setSelected}
  onOpenEvents={setEventsMilestone}   // 追加
/>

// 末尾（MilestoneDetailDialog の後）:
{eventsMilestone && (
  <MilestoneEventsDrawer
    milestone={eventsMilestone}
    onClose={() => setEventsMilestone(null)}
  />
)}
```

**Step 4:** build / lint。

```bash
bun run lint && bun run build   # Expected: 0 error / 0 warning / 0 errors
```

**Step 5:** Commit。

```bash
git add src/components/organisms/MilestoneListTitle.tsx src/components/organisms/MilestoneList.tsx src/components/organisms/MilestoneList.css.ts
git commit -m "feat(issue-40): マイルストーンタイトル右に '...' ボタンと Drawer 配線を追加"
```

---

## Task 8: コンポーネントテスト追加・更新

**Objective:** Drawer の progress 別表示 / イベント行 / '...' → 開閉をツールで検証し、受け入れ要件をロックする。

**Files:**
- Create: `src/components/organisms/MilestoneEventsDrawer.test.tsx`
- Modify: `src/components/organisms/MilestoneList.test.tsx`

**Step 1:** `MilestoneEventsDrawer.test.tsx` 作成（`MilestoneList.test.tsx` の mock パターンを踏襲）。

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MilestoneEventsDrawer } from './MilestoneEventsDrawer';
import { useMilestoneEventsQuery } from '../../resources/queries';
import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';

vi.mock('../../resources/queries', () => ({ useMilestoneEventsQuery: vi.fn() }));

const milestone: MilestoneProps = {
  id: 1, staff_id: 1, title: 'M1', color: '#9c27b0', status: 'open',
  created_at: '2026-08-01', guideline_end_date: null,
};

const events: MilestoneEventProps[] = [
  { id: 11, staff_id: 1001, group: 3, group_name: 'グループA', start: '2026-08-02T10:00:00.000Z',
    end: '2026-08-02T11:00:00.000Z', title: 'タイトルA', progress: 'これから', milestone_id: 1, completed: false },
  { id: 12, staff_id: 1002, group: 4, group_name: 'グループB', start: '2026-08-03T09:00:00.000Z',
    end: '2026-08-03T10:00:00.000Z', title: 'タイトルB', progress: null, milestone_id: 1, completed: false },
];

const renderDrawer = () =>
  render(<MantineProvider><MilestoneEventsDrawer milestone={milestone} onClose={vi.fn()} /></MantineProvider>);

describe('MilestoneEventsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMilestoneEventsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: events, isPending: false, isError: false,
    });
  });

  it('renders progress groups in order and omits empty ones', () => {
    renderDrawer();
    expect(screen.getByText('これから（1）')).toBeInTheDocument();
    expect(screen.getByText('指定なし（1）')).toBeInTheDocument();
    expect(screen.queryByText('まだ（0）')).not.toBeInTheDocument();
  });

  it('expands accordion to show title, staff_id, group_name, start_time', async () => {
    renderDrawer();
    fireEvent.click(screen.getByText('これから（1）'));
    expect(screen.getByText('タイトルA')).toBeInTheDocument();
    expect(screen.getByText(/スタッフID: 1001/)).toBeInTheDocument();
    expect(screen.getByText(/グループ名: グループA/)).toBeInTheDocument();
    expect(screen.getByText(/開始日時: 2026\/08\/02 10:00/)).toBeInTheDocument();
  });

  it('shows 指定なし for null progress', () => {
    renderDrawer();
    fireEvent.click(screen.getByText('指定なし（1）'));
    expect(screen.getByText('タイトルB')).toBeInTheDocument();
    expect(screen.getByText(/スタッフID: 1002/)).toBeInTheDocument();
    expect(screen.getByText(/グループ名: グループB/)).toBeInTheDocument();
  });
});
```

> Accordion の開閉は `fireEvent.click(control)` でよい。Mantine Drawer は `opened` 既定なのでテスト環境で問題なく描画される。

**Step 2:** `MilestoneList.test.tsx` に `useMilestoneEventsQuery` の mock を追加し、'...' クリックで Drawer が開くテストを追加。

```tsx
// mock に追加
vi.mock('../../resources/queries', () => ({
  useMilestonesQuery: vi.fn(),
  useGroupUsersQuery: vi.fn(),
  useMilestoneEventsQuery: vi.fn(),
}));
// beforeEach に追加
(useMilestoneEventsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
  data: [], isPending: false, isError: false,
});

it("opens events drawer when '...' button is clicked", async () => {
  const user = userEvent.setup();
  const mockMilestones: MilestoneProps[] = [
    { id: 1, title: 'M1', status: 'open', color: '#9c27b0', staff_id: 1,
      created_at: '2026-08-20', guideline_end_date: null },
  ];
  mockQuery({ data: mockMilestones, isPending: false, isError: false });
  renderList();

  await user.click(screen.getByRole('button', { name: 'M1 のイベント' }));
  // Drawer title（マイルストーン名）か「所属イベントはありません」が出る
  expect(await screen.findByText('所属イベントはありません')).toBeInTheDocument();
});
```

> `screen.getByRole('button', { name: 'M1 のイベント' })` は Task 7 Step 1 の `aria-label` に依存。

**Step 3:** テスト実行。

```bash
bun run testrun   # Expected: MilestoneEventsDrawer.test.tsx / MilestoneList.test.tsx が PASS
```

**Step 4:** Commit。

```bash
git add src/components/organisms/MilestoneEventsDrawer.test.tsx src/components/organisms/MilestoneList.test.tsx
git commit -m "test(issue-40): milestone events Drawer と '...' ボタンのテストを追加"
```

---

## Task 9: 品質ゲート（全タスク終了後・親が実施）

**Objective:** 静的品質・型・テストを親が一括確認する。

```bash
# フロント
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0（0 error / 0 warning）
bun run build     # 0 errors

# バックエンド
cd ../light_token_server && python -m pytest tests/test_milestone.py -q   # 全 PASS
```

**Step 2:** 実ブラウザ確認（管理者 / 一般ユーザーそれぞれ）を test-plan.md §3 に沿って実施。

**Step 3:** Commit（必要なら）。

---

## 品質ゲート（再掲）

```bash
bun run testrun && bun run lint && bun run build   # フロント
cd ../light_token_server && python -m pytest tests/test_milestone.py -q   # バックエンド
```
