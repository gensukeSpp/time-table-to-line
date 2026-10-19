# 実装タスク — 'closed' のマイルストーンのイベントを参照

> 各タスクの後で適宜 `bun run lint` / `bun run build` / `bun run testrun` を実行し、進捗を止めない。
> 実行順序は **Task 0 → 8 の直列依存**。サブエージェントへ分割する場合は **Task 1（バックエンド）完了後**に、Task 2〜3（ヘルパ / クエリ）と Task 4〜6（UI）を依存が満たされる範囲で並列化してよい。Task 7（テスト）は 5・6 の完了後、Task 8（品質ゲート）は親が必ず自身で実行する。
> バックエンドとフロントは**別リポジトリ**。コミットはリポジトリごとに分ける。

---

## Task 0: ブランチ準備

**Objective:** フロント / バックエンドそれぞれで作業ブランチを用意する。

**Step 1:** フロント（`time-table-to-line`）は既に `feature/milestone-events/41` にいることを確認。

```bash
git branch --show-current        # Expected: feature/milestone-events/41
git status --short               # Expected: 意図しない変更が無いこと（timeline_diff.txt は未追跡の作業メモ）
```

**Step 2:** バックエンド（`light_token_server`）は別作業ブランチ `fix/2points-from-front` にいるため、`main` から作業ブランチを切る。

```bash
cd ../light_token_server
git checkout main && git pull --ff-only origin main
git checkout -b feature/milestone-closed/41
# Expected: Switched to a new branch 'feature/milestone-closed/41'
```

---

## Task 1: バックエンド — `GET /milestone/closed`（admin 限定・達成日降順）

**Objective:** closed マイルストーンの一覧 API を新設し、管理者以外は 403、達成日 NULL は末尾に固定する（D1 / D2）。

**Files:**
- Modify: `light_token_server/app/routers/timetable.py`（`get_closed_milestone_events` の直前、L331 付近）
- Modify: `light_token_server/tests/test_milestone.py`（末尾に追記）

**Step 1:** 失敗するテストを書く（TDD RED）。`tests/test_milestone.py` の末尾に追記。

```python
# --- Issue #41: 閉じたマイルストーンの一覧 ---


def _close_directly(factory, ms_id: int, accomplished):
    """テスト用: DB 直操作で closed + 達成日を設定する。"""
    db = factory()
    try:
        ms = db.query(MilestoneORM).filter(MilestoneORM.id == ms_id).first()
        ms.status = MILESTONE_CLOSED
        ms.accomplished_date = accomplished
        db.commit()
    finally:
        db.close()


# 25. closed のみを達成日の降順で返す
def test_closed_milestones_returns_closed_sorted_desc(client, db_session_factory):
    older = _add(client, "OLD").json()["id"]
    newer = _add(client, "NEW").json()["id"]
    open_id = _add(client, "OPEN").json()["id"]
    _close_directly(db_session_factory, older, datetime.date(2026, 8, 10))
    _close_directly(db_session_factory, newer, datetime.date(2026, 8, 20))

    response = client.get("/milestone/closed", headers=_bearer(True))

    assert response.status_code == 200
    rows = response.json()
    assert [r["id"] for r in rows] == [newer, older]
    assert all(r["status"] == "closed" for r in rows)
    assert open_id not in [r["id"] for r in rows]


# 26. 達成日 NULL (削除 API 由来の closed) は末尾
def test_closed_milestones_puts_null_accomplished_last(client, db_session_factory):
    dated = _add(client, "DATED").json()["id"]
    removed = _add(client, "REMOVED").json()["id"]
    _close_directly(db_session_factory, dated, datetime.date(2026, 8, 20))
    assert client.delete(f"/milestone/remove/{removed}", headers=_bearer(True)).status_code == 200

    rows = client.get("/milestone/closed", headers=_bearer(True)).json()

    assert [r["id"] for r in rows] == [dated, removed]
    assert rows[1]["accomplished_date"] is None


# 27. open / waiting は含まない
def test_closed_milestones_excludes_open_and_waiting(client):
    _add(client, "OPEN")
    waiting_id = _make_waiting(client, "WAITING", "2026-09-07")
    assert waiting_id

    rows = client.get("/milestone/closed", headers=_bearer(True)).json()

    assert rows == []


# 28. 非 admin は 403
def test_closed_milestones_forbidden_for_non_admin(client):
    response = client.get("/milestone/closed", headers=_bearer(False))

    assert response.status_code == 403
```

**Step 2:** テストが失敗することを確認（ルート未定義 → 404/405 で fail）。

```bash
cd ../light_token_server && .venv/bin/python -m pytest tests/test_milestone.py -q -k closed_milestones
# Expected: 4 failed（405 Method Not Allowed / assert 失敗）
```

> `.python-version` の 3.13 が未インストールのため素の `python` は使えない。必ず `.venv/bin/python` を使う。

**Step 3:** 実装（TDD GREEN）。`get_closed_milestone_events` の**直前**に挿入。

```python
@router.get("/milestone/closed")
def get_closed_milestones(
    claims: dict = Depends(require_token),
    db: Session = Depends(get_db),
):
    """Issue #41: 閉じたマイルストーンの一覧 (管理者のみ)。

    達成日 (accomplished_date) の降順。削除 API で閉じたものは達成日が NULL のため末尾へ。
    """
    if not claims.get("admin"):
        raise HTTPException(status_code=403, detail="admin only")
    rows = (
        db.query(MilestoneORM)
        .filter(MilestoneORM.status == MILESTONE_CLOSED)
        .order_by(
            MilestoneORM.accomplished_date.is_(None),
            MilestoneORM.accomplished_date.desc(),
        )
        .all()
    )
    return [m.to_dict() for m in rows]
```

**Step 4:** テストが通ることを確認（GREEN）。

```bash
.venv/bin/python -m pytest tests/test_milestone.py -q
# Expected: 全 PASS（新規 4 件を含む。既存の closed events 系テストも PASS のまま）
```

**Step 5:** Commit。

```bash
git add app/routers/timetable.py tests/test_milestone.py
git commit -m "feat(issue-41): 閉じたマイルストーン一覧 GET /milestone/closed を追加"
```

---

## Task 1.5: フロントへ戻る

```bash
cd ../time-table-to-line
pwd   # Expected: .../time-table-to-line
```

---

## Task 2: 純粋ヘルパ（`filterCompletedEvents` / `formatAccomplishedDate`）+ 単体テスト

**Objective:** 「完了」イベントの絞り込みと達成日の表示文字列を、テスト可能な純粋関数として用意する（D3）。

**Files:**
- Modify: `src/lib/milestoneEvents.ts`
- Modify: `src/lib/milestone.ts`
- Modify: `src/tests/milestoneEvents.spec.ts`

**Step 1:** 失敗するテストを追加（RED）。`src/tests/milestoneEvents.spec.ts` の import を差し替え、describe 内に it を追加。

```ts
import { normalizeProgressGroup, groupMilestoneEventsByProgress, filterCompletedEvents } from '../lib/milestoneEvents';
```

```ts
  it('keeps only 完了 events (label / token / null)', () => {
    const rows = [ev(1, '完了'), ev(2, 'これから'), ev(3, null), ev(4, 'complete'), ev(5, 'まだ')];
    expect(filterCompletedEvents(rows).map((e) => e.id)).toEqual([1, 4]);
    expect(filterCompletedEvents([])).toEqual([]);
  });
```

さらに `src/tests/milestone.spec.ts`（新規）を作る場合は下記。既存 spec が無いため**新規作成**する。

```ts
import { describe, it, expect } from 'vitest';
import { formatAccomplishedDate } from '../lib/milestone';

describe('formatAccomplishedDate', () => {
  it('formats yyyy/MM/dd', () => {
    expect(formatAccomplishedDate('2026-08-20')).toBe('2026/08/20');
  });

  it('returns 達成日なし for null / undefined', () => {
    expect(formatAccomplishedDate(null)).toBe('達成日なし');
    expect(formatAccomplishedDate(undefined)).toBe('達成日なし');
  });
});
```

**Step 2:** 失敗を確認。

```bash
bun run testrun
# Expected: milestoneEvents.spec.ts / milestone.spec.ts が FAIL（export 未定義）
```

**Step 3:** 実装（GREEN）。

`src/lib/milestoneEvents.ts` の末尾に追記:

```ts
// Issue #41: 閉じたマイルストーンでは「完了」イベントのみを表示する。
// progress の正規化 (英字トークン / null) は normalizeProgressGroup に一本化する。
export function filterCompletedEvents(events: MilestoneEventProps[]): MilestoneEventProps[] {
  return (events ?? []).filter((e) => normalizeProgressGroup(e.progress) === '完了');
}
```

`src/lib/milestone.ts` の末尾に追記:

```ts
// Issue #41: closed 一覧の達成日表示。削除 API 由来の closed は accomplished_date が null。
export function formatAccomplishedDate(accomplished_date?: string | null): string {
  return accomplished_date ? format(new Date(accomplished_date), 'yyyy/MM/dd') : '達成日なし';
}
```

> `formatClosedLabel`（猶予日数を加算する waiting 用ラベル）とは意味が異なるため流用しない。

**Step 4:** テスト / lint / build。

```bash
bun run testrun && bun run lint && bun run build
# Expected: 全 PASS / 0 warning / 0 errors
```

**Step 5:** Commit。

```bash
git add src/lib/milestoneEvents.ts src/lib/milestone.ts src/tests/milestoneEvents.spec.ts src/tests/milestone.spec.ts
git commit -m "feat(issue-41): filterCompletedEvents / formatAccomplishedDate を追加"
```

---

## Task 3: cache / fetch / query hook + `queries.spec.tsx`

**Objective:** closed 一覧と closed イベントを TanStack Query 経由で取得できるようにする（D7）。

**Files:**
- Modify: `src/resources/cache.ts:53-65`
- Modify: `src/resources/fetch.ts`（`fetchMilestoneEvents` の直後）
- Modify: `src/resources/queries.ts`（`useMilestoneEventsQuery` の直後）
- Modify: `src/resources/queries.spec.tsx`

**Step 1:** `cache.ts` の `milestoneKeys` と `useMilestoneCache` を差し替え。

```ts
export const milestoneKeys = {
  all: () => ["milestone", "all"] as const,
  closed: () => ["milestone", "closed"] as const,
  events: (id: number) => ["milestone", "events", id] as const,
  // ['milestone','closed'] は閉じた一覧のプレフィックスでもあるため、
  // closed() の invalidate で closedEvents も同時に無効化される（意図どおり）。
  closedEvents: (id: number) => ["milestone", "closed", "events", id] as const,
};

export function useMilestoneCache() {
  const queryClient = useQueryClient();
  return useMemo(() => ({
    invalidateMilestoneList: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all() });
      // Issue #41: close / 削除で closed 一覧も変わるため併せて無効化する。
      queryClient.invalidateQueries({ queryKey: milestoneKeys.closed() });
    },
  }), [queryClient]);
}
```

**Step 2:** `fetch.ts` に追加（import へ `MilestoneEventProps` / `MilestoneProps` は既にある）。

```ts
export const fetchClosedMilestones = async (): Promise<MilestoneProps[]> => {
  const { data } = await basicAxios.get<MilestoneProps[]>('/milestone/closed');
  return data;
};

export const fetchClosedMilestoneEvents = async (milestoneId: number): Promise<MilestoneEventProps[]> => {
  const { data } = await basicAxios.get<MilestoneEventProps[]>(`/milestone/closed/${milestoneId}/events`);
  return data;
};
```

**Step 3:** `queries.ts` に追加（`useMilestoneEventsQuery` の直後）。import へ `fetchClosedMilestones, fetchClosedMilestoneEvents` を追加。

```ts
// 閉じたマイルストーン一覧: Drawer を開いた時だけ取得する。
export const useClosedMilestonesQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: milestoneKeys.closed(),
    queryFn: fetchClosedMilestones,
    enabled,
  });
};

// マイルストーン行を開いた時だけ、その closed イベントを取得する。
export const useClosedMilestoneEventsQuery = (milestoneId: number | null, enabled: boolean) => {
  return useQuery({
    queryKey: milestoneKeys.closedEvents(milestoneId!),
    queryFn: () => fetchClosedMilestoneEvents(milestoneId!),
    enabled: enabled && milestoneId != null,
  });
};
```

**Step 4:** `queries.spec.tsx` の `vi.mock('./fetch')` ファクトリに **2 関数を必ず追加**（列挙漏れはモジュール解決エラーになる）。import も追加。

```ts
vi.mock('./fetch', () => ({
  fetchEventsDataForTT: vi.fn(),
  fetchEventsData: vi.fn(),
  fetchAuthResponse: vi.fn(),
  refresh: vi.fn(),
  requestGroup: vi.fn(),
  requestGroupMember: vi.fn(),
  fetchMilestones: vi.fn(),
  fetchMilestoneEvents: vi.fn(),
  fetchClosedMilestones: vi.fn(),
  fetchClosedMilestoneEvents: vi.fn(),
}));
```

```ts
import { useAuthQuery, useMilestonesQuery, useMilestoneEventsQuery, useClosedMilestonesQuery, useClosedMilestoneEventsQuery } from './queries';
import { fetchAuthResponse, fetchMilestones, fetchMilestoneEvents, fetchClosedMilestones, fetchClosedMilestoneEvents } from './fetch';
```

**Step 5:** テスト追加（`enabled` ゲート）。

```tsx
describe('useClosedMilestonesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only when enabled', async () => {
    const mockedFetchClosed = vi.mocked(fetchClosedMilestones);
    mockedFetchClosed.mockResolvedValue([] as never);

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useClosedMilestonesQuery(enabled),
      { initialProps: { enabled: false }, wrapper },
    );
    expect(mockedFetchClosed).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(mockedFetchClosed).toHaveBeenCalledTimes(1));
  });
});

describe('useClosedMilestoneEventsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only when enabled and id is present', async () => {
    const mockedFetchClosedEvents = vi.mocked(fetchClosedMilestoneEvents);
    mockedFetchClosedEvents.mockResolvedValue([] as never);

    const { rerender } = renderHook(
      ({ id, enabled }: { id: number | null; enabled: boolean }) =>
        useClosedMilestoneEventsQuery(id, enabled),
      { initialProps: { id: null as number | null, enabled: true }, wrapper },
    );
    expect(mockedFetchClosedEvents).not.toHaveBeenCalled();

    rerender({ id: 7, enabled: true });
    await waitFor(() => expect(mockedFetchClosedEvents).toHaveBeenCalledWith(7));
  });
});
```

**Step 6:** テスト / lint / build。

```bash
bun run testrun && bun run lint && bun run build
# Expected: 全 PASS / 0 warning / 0 errors
```

**Step 7:** Commit。

```bash
git add src/resources/cache.ts src/resources/fetch.ts src/resources/queries.ts src/resources/queries.spec.tsx
git commit -m "feat(issue-41): closed マイルストーン一覧 / closed イベントの query 一式を追加"
```

---

## Task 4: clamp スタイルを `molecules/clampText.css.ts` へ抽出（Issue #40 と共有）

**Objective:** 三点リーダー → 2 行表示の CSS を 1 箇所にまとめる（D5 / DRY）。

**Files:**
- Create: `src/components/molecules/clampText.css.ts`
- Modify: `src/components/organisms/MilestoneEventsDrawer.css.ts`（3 スタイル削除）
- Modify: `src/components/organisms/MilestoneEventsDrawer.tsx`（import 変更）

**Step 1:** 新規 CSS を作成。

```ts
import { style } from '@vanilla-extract/css';

// タイトル用: 既定 1 行（三点リーダー）、クリックで 2 行（クラス切替）。
export const clampLine = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
  wordBreak: 'break-word',
  flex: 1,
  minWidth: 0,
});

export const clamp1 = style({ WebkitLineClamp: 1 });
export const clamp2 = style({ WebkitLineClamp: 2 });
```

**Step 2:** `MilestoneEventsDrawer.css.ts` から `clampLine` / `clamp1` / `clamp2` を削除。

**Step 3:** `MilestoneEventsDrawer.tsx` の import を分離。

```tsx
import { clampLine, clamp1, clamp2 } from '../molecules/clampText.css';
import { header, colorBar, eventRow, metaLine } from './MilestoneEventsDrawer.css';
```

**Step 4:** 既存テスト / lint / build で回帰が無いことを確認。

```bash
bun run testrun && bun run lint && bun run build
# Expected: 全 PASS（特に MilestoneEventsDrawer.test.tsx 3 件・MilestoneList.test.tsx）
```

**Step 5:** Commit。

```bash
git add src/components/molecules/clampText.css.ts src/components/organisms/MilestoneEventsDrawer.css.ts src/components/organisms/MilestoneEventsDrawer.tsx
git commit -m "refactor(issue-41): タイトル clamp スタイルを molecules/clampText.css.ts へ抽出"
```

---

## Task 5: `ClosedMilestoneDrawer`（右 Drawer + 3 段アコーディオン）

**Objective:** closed マイルストーン（タイトル + 達成日）→ 完了イベントのタイトル → `staff_id` / グループ名 / `end_time` の 3 段 UI を作る（D4）。

**Files:**
- Create: `src/components/organisms/ClosedMilestoneDrawer.css.ts`
- Create: `src/components/organisms/ClosedMilestoneDrawer.tsx`

**Step 1:** スタイル作成（`architecture.md` §6-3 のとおり）。

```ts
import { style } from '@vanilla-extract/css';

export const row = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.4rem',
});

export const colorBar = style({
  width: '1.25rem',
  height: '0.6rem',
  borderRadius: '3px',
  flexShrink: 0,
});

// 達成日: タイトルより小さいフォント、折り返さない
export const accomplishedDate = style({
  marginLeft: 'auto',
  flexShrink: 0,
  fontSize: '0.75rem',
  color: '#78909c',
  whiteSpace: 'nowrap',
});

export const nestedList = style({
  marginLeft: '0.75rem',
});

export const eventRow = style({
  padding: '0.25rem 0',
  borderBottom: '1px solid #eceff1',
});

export const metaLine = style({
  fontSize: '0.85rem',
  color: '#546e7a',
  margin: 0,
});
```

**Step 2:** コンポーネント作成（`architecture.md` §6-2 の全文をそのまま）。

- `ClosedEventItem`: タイトル（clamp 1→2）クリックで `スタッフID` / `グループ名` / `終了日時` を表示
- `ClosedMilestoneEvents`: `useClosedMilestoneEventsQuery(id, true)` + `filterCompletedEvents`。空なら「完了イベントはありません」
- `ClosedMilestoneRow`: タイトル（clamp 1→2）+ `formatAccomplishedDate` を同じ行に表示。クリックで段 2 を開閉
- `ClosedMilestoneDrawer`: `useClosedMilestonesQuery(true)` + `Drawer position="right"`（title=「閉じたマイルストーン」）。空なら「閉じたマイルストーンはありません」

**Step 3:** lint / build。

```bash
bun run lint && bun run build
# Expected: 0 error / 0 warning / 0 errors
```

**Step 4:** Commit。

```bash
git add src/components/organisms/ClosedMilestoneDrawer.tsx src/components/organisms/ClosedMilestoneDrawer.css.ts
git commit -m "feat(issue-41): ClosedMilestoneDrawer（右 Drawer + 3 段アコーディオン）を追加"
```

---

## Task 6: `MilestoneClosedButton` + `TimelinePage` への配線

**Objective:** 「マイルストーン作成」ボタンの**下**に、管理者のみ表示される「閉じたマイルストーン」ボタンを追加する（受け入れ 1）。

**Files:**
- Create: `src/components/organisms/MilestoneClosedButton.tsx`
- Modify: `src/components/pages/TimelinePage.css.ts`
- Modify: `src/components/pages/TimelinePage.tsx:13-14, 194-198`
- Modify: `src/components/organisms/MilestoneAddButton.css.ts`

**Step 1:** ボタンコンポーネント作成（`architecture.md` §6-1 の全文）。

**Step 2:** `TimelinePage.css.ts` に `adminBar` を追加。

```ts
export const adminBar = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '0.5rem',
});
```

**Step 3:** `TimelinePage.tsx` の toolbar を縦積みに変更。

```tsx
import { MilestoneClosedButton } from '../organisms/MilestoneClosedButton';
import { toolbar, adminBar } from './TimelinePage.css';

<div className={toolbar}>
  <MilestoneList />
  <div className={adminBar}>
    <MilestoneAddButton admin={isAdmin} />
    <MilestoneClosedButton admin={isAdmin} />
  </div>
</div>
```

**Step 4:** `MilestoneAddButton.css.ts` の `addButtonArea` の `marginBottom` を `0` に（親の `gap` と二重になるため）。

**Step 5:** lint / build / 既存テスト。

```bash
bun run lint && bun run build && bun run testrun
# Expected: 0 warning / 0 errors / 全 PASS（Timeline.spec.tsx の Storybook スモークを含む）
```

**Step 6:** Commit。

```bash
git add src/components/organisms/MilestoneClosedButton.tsx src/components/pages/TimelinePage.tsx src/components/pages/TimelinePage.css.ts src/components/organisms/MilestoneAddButton.css.ts
git commit -m "feat(issue-41): 管理者向け『閉じたマイルストーン』ボタンをツールバーに追加"
```

---

## Task 7: コンポーネントテスト

**Objective:** 3 段アコーディオン・完了フィルタ・admin ゲートをテストでロックする。

**Files:**
- Create: `src/components/organisms/ClosedMilestoneDrawer.test.tsx`
- Create: `src/components/organisms/MilestoneClosedButton.test.tsx`

**Step 1:** `ClosedMilestoneDrawer.test.tsx` を作成。

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import { ClosedMilestoneDrawer } from './ClosedMilestoneDrawer';
import { useClosedMilestonesQuery, useClosedMilestoneEventsQuery } from '../../resources/queries';
import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';

vi.mock('../../resources/queries', () => ({
  useClosedMilestonesQuery: vi.fn(),
  useClosedMilestoneEventsQuery: vi.fn(),
}));

const milestones: MilestoneProps[] = [
  { id: 1, staff_id: 1, title: 'M1', color: '#9c27b0', status: 'closed',
    created_at: '2026-08-01', guideline_end_date: null, accomplished_date: '2026-08-20' },
  { id: 2, staff_id: 1, title: 'M2', color: '#009688', status: 'closed',
    created_at: '2026-08-01', guideline_end_date: null, accomplished_date: null },
];

const events: MilestoneEventProps[] = [
  { id: 11, staff_id: 1001, group: 3, group_name: 'グループA', start: '2026-08-02T10:00:00.000Z',
    end: '2026-08-02T11:30:00.000Z', title: '完了タスク', progress: '完了', milestone_id: 1, completed: true },
  { id: 12, staff_id: 1002, group: 4, group_name: 'グループB', start: '2026-08-03T09:00:00.000Z',
    end: '2026-08-03T10:00:00.000Z', title: '未完了タスク', progress: 'これから', milestone_id: 1, completed: false },
];

const renderDrawer = () =>
  render(<MantineProvider><ClosedMilestoneDrawer onClose={vi.fn()} /></MantineProvider>);

describe('ClosedMilestoneDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useClosedMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: milestones, isPending: false, isError: false,
    });
    (useClosedMilestoneEventsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: events, isPending: false, isError: false,
    });
  });

  it('lists closed milestones with accomplished date (null → 達成日なし)', () => {
    renderDrawer();
    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText('2026/08/20')).toBeInTheDocument();
    expect(screen.getByText('M2')).toBeInTheDocument();
    expect(screen.getByText('達成日なし')).toBeInTheDocument();
  });

  it('expands a milestone to show only 完了 events', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'M1 の完了イベント' }));
    expect(screen.getByText('完了タスク')).toBeInTheDocument();
    expect(screen.queryByText('未完了タスク')).not.toBeInTheDocument();
  });

  it('expands an event to show staff_id / group_name / end_time', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'M1 の完了イベント' }));
    fireEvent.click(screen.getByRole('button', { name: '完了タスク' }));
    expect(screen.getByText(/スタッフID: 1001/)).toBeInTheDocument();
    expect(screen.getByText(/グループ名: グループA/)).toBeInTheDocument();
    expect(screen.getByText(/終了日時: 2026\/08\/02 \d{2}:30/)).toBeInTheDocument();
  });

  it('shows empty state when there is no closed milestone', () => {
    (useClosedMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [], isPending: false, isError: false,
    });
    renderDrawer();
    expect(screen.getByText('閉じたマイルストーンはありません')).toBeInTheDocument();
  });
});
```

> タイムゾーン依存を避けるため、`end_time` のアサートは「`\d{2}:30`」のように分だけを見る（`end` は UTC ISO で、表示はローカル TZ。既存 `MilestoneEventsDrawer.test.tsx` も同じ方針）。

**Step 2:** `MilestoneClosedButton.test.tsx` を作成。

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';

import { MilestoneClosedButton } from './MilestoneClosedButton';
import { useClosedMilestonesQuery } from '../../resources/queries';

vi.mock('../../resources/queries', () => ({
  useClosedMilestonesQuery: vi.fn(),
  useClosedMilestoneEventsQuery: vi.fn(),
}));

const renderButton = (admin: boolean) =>
  render(<MantineProvider><MilestoneClosedButton admin={admin} /></MantineProvider>);

describe('MilestoneClosedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useClosedMilestonesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [], isPending: false, isError: false,
    });
  });

  it('is hidden for non-admin users', () => {
    renderButton(false);
    expect(screen.queryByRole('button', { name: '閉じたマイルストーン' })).not.toBeInTheDocument();
  });

  it('opens the drawer for admin users', async () => {
    const user = userEvent.setup();
    renderButton(true);

    await user.click(screen.getByRole('button', { name: '閉じたマイルストーン' }));

    expect(await screen.findByText('閉じたマイルストーンはありません')).toBeInTheDocument();
  });
});
```

**Step 3:** テスト実行。

```bash
bun run testrun
# Expected: ClosedMilestoneDrawer.test.tsx 4 件 / MilestoneClosedButton.test.tsx 2 件 が PASS
```

**Step 4:** Commit。

```bash
git add src/components/organisms/ClosedMilestoneDrawer.test.tsx src/components/organisms/MilestoneClosedButton.test.tsx
git commit -m "test(issue-41): ClosedMilestoneDrawer / MilestoneClosedButton のテストを追加"
```

---

## Task 8: 品質ゲート（親が実施）

**Objective:** 静的品質・型・テストを親が一括確認する。

```bash
# フロント
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0（0 error / 0 warning）
bun run build     # 0 errors

# バックエンド
cd ../light_token_server && .venv/bin/python -m pytest tests/test_milestone.py -q   # 全 PASS
```

**Step 2:** 実ブラウザ確認を test-plan.md §3 に沿って実施（管理者 / 一般ユーザー）。

**Step 3:** 必要なら最終コミット。

```bash
git add -A && git commit -m "chore(issue-41): 品質ゲート通過"
```
