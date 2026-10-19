# アーキテクチャ — 'closed' のマイルストーンのイベントを参照

closed マイルストーン一覧を出す **新規 API** をバックエンドに追加し、フロントは Issue #40 と同じ「右 Drawer + 行をクリックで開閉」パターンで 3 段（マイルストーン → 完了イベント → スタッフID / グループ名 / 終了日時）を実装する。`progress == '完了'` の絞り込みは**フロント側**（Issue 実装要件どおり「取得後 'progress' で絞る」）。

## 1. 変更対象ファイル

### バックエンド（`light_token_server`）

| ファイル | 変更 | 担当 |
|---------|------|------|
| `app/routers/timetable.py`（`get_closed_milestone_events` の直前, L331 付近） | **`GET /milestone/closed`（新規）**: admin gate + `status == closed` を `accomplished_date` 降順（NULL 末尾） | Task 1 |
| `tests/test_milestone.py` | 新規 4 件（並び順 / NULL 末尾 / 非 admin 403 / open・waiting 除外） | Task 1 |

### フロントエンド（`time-table-to-line`）

| ファイル | 変更 | 担当 |
|---------|------|------|
| `src/lib/milestoneEvents.ts` | `filterCompletedEvents` 追加（`normalizeProgressGroup` を再利用） | Task 2 |
| `src/lib/milestone.ts` | `formatAccomplishedDate` 追加（`yyyy/MM/dd` / `達成日なし`） | Task 2 |
| `src/tests/milestoneEvents.spec.ts` | `filterCompletedEvents` の単体テスト追加 | Task 2 |
| `src/resources/cache.ts` | `milestoneKeys.closed()` / `closedEvents(id)` 追加。`invalidateMilestoneList` で closed も invalidate | Task 3 |
| `src/resources/fetch.ts` | `fetchClosedMilestones` / `fetchClosedMilestoneEvents` 追加 | Task 3 |
| `src/resources/queries.ts` | `useClosedMilestonesQuery(enabled)` / `useClosedMilestoneEventsQuery(id, enabled)` 追加 | Task 3 |
| `src/resources/queries.spec.tsx` | fetch mock ファクトリへ 2 関数追加 + enabled ゲートのテスト | Task 3 |
| `src/components/molecules/clampText.css.ts`（新規） | `clampLine` / `clamp1` / `clamp2` を抽出（Issue #40 と共有） | Task 4 |
| `src/components/organisms/MilestoneEventsDrawer.css.ts` | 上記 3 スタイルを削除 | Task 4 |
| `src/components/organisms/MilestoneEventsDrawer.tsx` | clamp スタイルの import 元を `molecules/clampText.css` へ変更 | Task 4 |
| `src/components/organisms/ClosedMilestoneDrawer.css.ts`（新規） | ヘッダ / 行 / 達成日 / メタ行 / ネスト余白 | Task 5 |
| `src/components/organisms/ClosedMilestoneDrawer.tsx`（新規） | 右 Drawer + 3 段アコーディオン（マイルストーン → 完了イベント → 3 データ） | Task 5 |
| `src/components/organisms/MilestoneClosedButton.tsx`（新規） | admin のみ表示する「閉じたマイルストーン」ボタン + Drawer 起動 | Task 6 |
| `src/components/pages/TimelinePage.css.ts` | `adminBar`（縦並び・右寄せ）追加 | Task 6 |
| `src/components/pages/TimelinePage.tsx` | 「マイルストーン作成」の下にボタンを配置 | Task 6 |
| `src/components/organisms/MilestoneAddButton.css.ts` | `addButtonArea` の `marginBottom` を `0` に（縦並びで余白が二重になるため） | Task 6 |
| `src/components/organisms/ClosedMilestoneDrawer.test.tsx`（新規） | 3 段アコーディオン / 完了フィルタ / 空状態 | Task 7 |
| `src/components/organisms/MilestoneClosedButton.test.tsx`（新規） | admin ゲート（非 admin で非表示） | Task 7 |

## 2. API 契約

### 2-1. 新規 `GET /milestone/closed`（admin のみ）

| 項目 | 内容 |
|------|------|
| 認可 | `require_token` + `claims["admin"]` が偽なら 403 `{"detail": "admin only"}` |
| 対象 | `MilestoneORM.status == "closed"` のみ |
| 並び順 | `accomplished_date` 降順。`accomplished_date IS NULL` は末尾（第 1 ソートキーで NULL を後ろへ） |
| 返り値 | `[MilestoneORM.to_dict()]`（`id / staff_id / title / description / color / status / created_at / guideline_end_date / accomplished_date`） |

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

> ルート順序: `@router.get("/milestone/{milestone_id}/events")` はセグメント数が違うため衝突しない。`get_closed_milestone_events`（`/milestone/closed/{milestone_id}/events`）の**直前に挿入**し、closed 系のルートを隣接させる。

### 2-2. 既存 `GET /milestone/closed/{milestone_id}/events`（変更なし）

- admin gate のまま（非 admin 403）。closed 以外・存在しない ID は 404。
- 返り値は各イベント dict（`group_name` 込み、`summary` 無し）。フロントはここから `progress == '完了'` のみを抽出する。

## 3. フロント 型

新規型は不要。`MilestoneProps`（`accomplished_date?: string | null` を保持）と `MilestoneEventProps`（Issue #40）をそのまま使う。

## 4. 純粋ヘルパ

### 4-1. `src/lib/milestoneEvents.ts`（追記）

```ts
// Issue #41: 閉じたマイルストーンでは「完了」イベントのみを表示する。
// progress の正規化 (英字トークン / null) は normalizeProgressGroup に一本化する。
export function filterCompletedEvents(events: MilestoneEventProps[]): MilestoneEventProps[] {
  return (events ?? []).filter((e) => normalizeProgressGroup(e.progress) === '完了');
}
```

### 4-2. `src/lib/milestone.ts`（追記）

```ts
// Issue #41: closed 一覧の達成日表示。削除 API 由来の closed は accomplished_date が null。
export function formatAccomplishedDate(accomplished_date?: string | null): string {
  return accomplished_date ? format(new Date(accomplished_date), 'yyyy/MM/dd') : '達成日なし';
}
```

> `formatClosedLabel`（猶予日数を加算する waiting 用ラベル）とは意味が異なるため流用しない。

## 5. TanStack Query

### 5-1. query key（`src/resources/cache.ts`）

```ts
export const milestoneKeys = {
  all: () => ["milestone", "all"] as const,
  closed: () => ["milestone", "closed"] as const,
  events: (id: number) => ["milestone", "events", id] as const,
  // 注意: ['milestone','closed'] は閉じた一覧のプレフィックスでもあるため、
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

### 5-2. fetch（`src/resources/fetch.ts`）

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

### 5-3. query hook（`src/resources/queries.ts`）

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

## 6. コンポーネント配置

```
TimelinePage (toolbar)
├── MilestoneList                     （既存: open/waiting 一覧）
└── adminBar (縦並び・右寄せ)
    ├── MilestoneAddButton            （既存: マイルストーン作成）
    └── MilestoneClosedButton         （新規: 閉じたマイルストーン / admin のみ）
        └── ClosedMilestoneDrawer     （新規: 右 Drawer）
            └── ClosedMilestoneRow ×N            … 段 1（タイトル + 達成日）
                └── ClosedMilestoneEventItem ×N  … 段 2（完了イベントのタイトル）
                    └── meta ×3                  … 段 3（staff_id / グループ名 / 終了日時）
```

### 6-1. `MilestoneClosedButton.tsx`（新規）

```tsx
import { useState } from 'react';
import { Button } from '@mantine/core';

import { ClosedMilestoneDrawer } from './ClosedMilestoneDrawer';

interface MilestoneClosedButtonProps {
  admin: boolean;
}

export const MilestoneClosedButton = ({ admin }: MilestoneClosedButtonProps) => {
  const [opened, setOpened] = useState(false);

  if (!admin) {
    return null;
  }

  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        閉じたマイルストーン
      </Button>
      {opened && <ClosedMilestoneDrawer onClose={() => setOpened(false)} />}
    </>
  );
};
```

> `opened &&` でマウントを遅延させる（閉じている間はクエリが走らない）。ボタンは `Motion`/枠線アニメーションを付けない（打ち消し線の要件は実装しない）。

### 6-2. `ClosedMilestoneDrawer.tsx`（新規）

```tsx
import { useState } from 'react';
import { Box, Button, Collapse, Drawer, Loader, Text, UnstyledButton } from '@mantine/core';
import { format } from 'date-fns';

import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';
import { filterCompletedEvents } from '../../lib/milestoneEvents';
import { formatAccomplishedDate } from '../../lib/milestone';
import {
  useClosedMilestonesQuery,
  useClosedMilestoneEventsQuery,
} from '../../resources/queries';
import {
  clampLine,
  clamp1,
  clamp2,
} from '../molecules/clampText.css';
import {
  row,
  colorBar,
  accomplishedDate,
  nestedList,
  eventRow,
  metaLine,
} from './ClosedMilestoneDrawer.css';

// 段 3: イベントを開いたときに出す 3 データ
const ClosedEventItem = ({ event }: { event: MilestoneEventProps }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box className={eventRow}>
      <UnstyledButton
        className={`${clampLine} ${expanded ? clamp2 : clamp1}`}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {event.title}
      </UnstyledButton>
      {/* Issue #40 の Accordion と同等の開閉アニメーション (Mantine Collapse: 200ms ease) */}
      <Collapse in={expanded}>
        <Text className={metaLine}>スタッフID: {event.staff_id}</Text>
        <Text className={metaLine}>グループ名: {event.group_name ?? '不明'}</Text>
        <Text className={metaLine}>終了日時: {format(new Date(event.end), 'yyyy/MM/dd HH:mm')}</Text>
      </Collapse>
    </Box>
  );
};

// 段 2: 「完了」イベントのみのアコーディオンリスト
// enabled は Collapse の開閉状態をそのまま渡し、開いたときだけ取得する。
const ClosedMilestoneEvents = ({ milestoneId, enabled }: { milestoneId: number; enabled: boolean }) => {
  const { data, isPending, isError, error } = useClosedMilestoneEventsQuery(milestoneId, enabled);
  const completed = filterCompletedEvents(data ?? []);

  if (isPending) return <Loader size="xs" />;
  if (isError) return <Text c="red">{error?.message || 'イベントの取得に失敗しました'}</Text>;
  if (completed.length === 0) return <Text c="dimmed" className={metaLine}>完了イベントはありません</Text>;

  return (
    <Box className={nestedList}>
      {completed.map((ev) => <ClosedEventItem key={ev.id} event={ev} />)}
    </Box>
  );
};

// 段 1: マイルストーン行（タイトル + 達成日）。クリックで段 2 を開閉。
const ClosedMilestoneRow = ({ milestone }: { milestone: MilestoneProps }) => {
  const [opened, setOpened] = useState(false);
  return (
    <Box className={eventRow}>
      <Box className={row}>
        <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
        <UnstyledButton
          className={`${clampLine} ${opened ? clamp2 : clamp1}`}
          aria-label={`${milestone.title} の完了イベント`}
          aria-expanded={opened}
          onClick={() => setOpened((v) => !v)}
        >
          {milestone.title}
        </UnstyledButton>
        <Text className={accomplishedDate}>{formatAccomplishedDate(milestone.accomplished_date)}</Text>
      </Box>
      {/* 開閉アニメーション: Collapse は閉時も子を保持するため、閉じるときも滑らかに畳める */}
      <Collapse in={opened}>
        <ClosedMilestoneEvents milestoneId={milestone.id} enabled={opened} />
      </Collapse>
    </Box>
  );
};

interface ClosedMilestoneDrawerProps {
  onClose: () => void;
}

export const ClosedMilestoneDrawer = ({ onClose }: ClosedMilestoneDrawerProps) => {
  const { data, isPending, isError, error } = useClosedMilestonesQuery(true);
  const milestones = data ?? [];

  return (
    <Drawer opened position="right" onClose={onClose} size="md" title="閉じたマイルストーン">
      {isPending ? (
        <Loader size="sm" />
      ) : isError ? (
        <Box>
          <Text>{error?.message || '閉じたマイルストーンの取得に失敗しました'}</Text>
          <Button onClick={onClose}>閉じる</Button>
        </Box>
      ) : milestones.length === 0 ? (
        <Text c="dimmed">閉じたマイルストーンはありません</Text>
      ) : (
        <Box>
          {milestones.map((m) => <ClosedMilestoneRow key={m.id} milestone={m} />)}
        </Box>
      )}
    </Drawer>
  );
};
```

> タイトルのクリックは「開閉」と「1 行 → 2 行」を**同時に**行う（state を 1 つに統一）。これが Issue の「開閉操作はマイルストーンタイトルとイベントタイトル」「三点リーダー → クリックで 2 行表示」を同時に満たす最小実装。

### 6-3. `ClosedMilestoneDrawer.css.ts`（新規）

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

### 6-4. `clampText.css.ts`（新規・共有）

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

> `flex: 1` / `minWidth: 0` は横並び（タイトル + 達成日）でタイトルが縮んで三点リーダーになるために必要。既存 `MilestoneEventsDrawer` は縦並びなので影響なし。

### 6-5. `TimelinePage`（変更）

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

```ts
// TimelinePage.css.ts
export const adminBar = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '0.5rem',
});
```

> `MilestoneAddButton.css.ts` の `addButtonArea` は `marginBottom: '1rem'` → `0`。親が縦並びの `gap` を持つため二重余白を避ける。

## 7. 決定事項まとめ

| ID | 決定 |
|----|------|
| D1 | closed 一覧用に **`GET /milestone/closed`（admin 限定）を新設**する。`/milestone/all` は open + waiting 固定で closed を返さないため、既存 API の再利用は不可。代替案（`/milestone/all?status=closed` へ拡張）は既存契約を壊すため不採用 |
| D2 | 並び順は `accomplished_date IS NULL` → `accomplished_date DESC`。`DELETE /milestone/remove` 由来の closed（達成日 NULL）は末尾に固定。表示は「達成日なし」 |
| D3 | 完了イベントの絞り込みは**フロント**で `normalizeProgressGroup(progress) === '完了'`。バックエンドは closed イベントを全件返す（Issue 実装要件どおり）。英字トークン `complete` も「完了」に正規化される |
| D4 | 3 段構成は Mantine `Drawer` + **自前の開閉 state**（Accordion ではなく `UnstyledButton`）。タイトルのクリックで「開閉」と「2 行化」を同時に行うため、Accordion.Control より自前 state が単純。開閉アニメーションは Mantine **`Collapse`（既定 200ms ease）** で付与し、Issue #40 の Accordion と同等にする。`Collapse` は閉時も子を保持（`height:0` + `inert`）するため**閉じるアニメーションも成立**し、子のクエリは `enabled` で開時のみ実行される（2026-10-19 実ブラウザ確認後のフィードバックで追加） |
| D5 | clamp スタイルは `molecules/clampText.css.ts` に抽出し Issue #40 の Drawer と共有（同一 CSS のコピペを避ける） |
| D6 | ボタンは `admin` のみ表示。バックエンドも 403 で二重防御。closed events の権限は据え置き（既存仕様） |
| D7 | closed 一覧・closed イベントは「開いたときにだけ」取得（`enabled` ゲート）。`invalidateMilestoneList` は closed 一覧も無効化する |
