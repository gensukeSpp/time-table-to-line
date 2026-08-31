# 実装タスク — マイルストーン内容の更新と削除

> 各タスクの後に `bun run build` / `bun run lint` / `bun run testrun` を随時実行し、進捗を止めない。
> 実行順序は 1 → 7 の直列依存。サブエージェントに投げる場合は型変更の Task 1 を先に完了させ、Task 2〜6 をまとめて投げてよい。
> **前提:** バックエンドは別途対応済みとみなす（想定契約は `architecture.md` §2）。実ブラウザ確認は契約反映後。

### 想定契約（バックエンド #9 / 2026-08-31 確認済み）

- **status は文字列 3 値** `'open' | 'waiting' | 'closed'`（boolean ではない）。一覧は `status !== 'closed'`（open + waiting）を表示。
- **completed（子イベント）の値意味論**（確認 #4 → そのまま確定）:
  - `open` / `waiting` → 子イベント `completed = False`
  - `closed` → 子イベント `completed = True`
  - マイルストーン→子イベントの一方向（非対称・非破壊）。re-open でイベントを backfill しないのは**意図的**。本 Issue ではこの contract を踏まえた display のみ行い、completed の書換えはしない。
- **フィールド名は `guideline_end_date`**（旧 `guidline_end_date` はバックエンド v0.07 リビジョンで DB リネーム済み）。フロント側も合わせて**全箇所 rename 必須**（Task 1）。
- **本 Issue のスコープ外（バックエンド側で対応予定・フロントでは触らない）**:
  - 色割当の open→open+waiting 拡張（`_next_color`）
  - `/milestone/update` ハンドラ名・`/milestone/remove` の削除意味論
  - DB マイグレーション実施と旧 boolean status 値('true'/'false')の正規化

## Task 1: `MilestoneProps` の型変更（status 文字列化 + フィールド名統一）と一覧フィルタ修正

**Objective:** `status` を文字列にし、`guidline_end_date` → `guideline_end_date` へ全箇所 rename、既存ビルドを壊さない。

**Files:** `src/lib/TimelineType.ts`, `src/components/organisms/MilestoneList.tsx`, `src/components/organisms/MilestoneCreateDialog.tsx`, `src/hooks/useMilestoneMutation.ts`, 各テスト / ストーリー

**Step 1:** 型変数を追加し、`status` を文字列化 + フィールド名を rename。

```ts
export type MilestoneStatus = 'open' | 'waiting' | 'closed';

export interface MilestoneProps {
  // ... 既存 ...
  status: MilestoneStatus;      // boolean -> 変更
  guideline_end_date?: string | null;   // guidline_end_date -> 変更 (typo 修正)
  // ... 既存 ...
}
```

**Step 2:** `MilestoneList.tsx` のフィルタを `status !== 'closed'` に修正（open + waiting を表示）。

```tsx
const openMilestones = (data ?? []).filter((m) => m.status !== 'closed');
```

**Step 3:** 既存テストの mock を文字列へ修正（`MilestoneList.test.tsx` の `status: true/false` → `'open'/'closed'`）、および `guidline_end_date` → `guideline_end_date` の一斉置換を以下で行う:
- `src/lib/TimelineType.ts:33` （型のフィールド名）
- `src/components/organisms/MilestoneCreateDialog.tsx:22,32-33,74` （`guidlineEndDate` state・送信キー・DateInput value）
- `src/hooks/useMilestoneMutation.ts:9` （`guidline_end_date?`）
- `src/hooks/useMilestoneMutation.test.tsx:51`・`src/components/organisms/MilestoneList.test.tsx:22-41`・`src/stories/Timeline.stories.tsx:71` （mock データ）
- 新規 `src/lib/milestone.ts` / `MilestoneListTitle.tsx` / `MilestoneDetailDialog.tsx` は最初から `guideline_end_date` で書く

**Step 4:** ビルド確認。

```bash
bun run build   # Expected: 0 errors（status 参照箇所の不整合を一括検出）
bun run testrun # Expected: 全 PASS（修正したテスト）
```

## Task 2: 猶予日ユーティリティ追加

**Objective:** waiting の「closed となる日付」を計算するユーティリティを追加。

**Files:** `src/lib/milestone.ts`（新規）

**Step 1:** 仮の猶予日数と日付ユーティリティを定義。

```ts
import { addDays, format } from 'date-fns';

// TODO(issue): 猶予期間の実値が決まったら置き換える（現在は仮の 2 日）
export const MILESTONE_CLOSE_GRACE_DAYS = 2;

export function getMilestoneClosedAt(accomplished_date?: string | null): Date | null {
  if (!accomplished_date) return null;
  return addDays(new Date(accomplished_date), MILESTONE_CLOSE_GRACE_DAYS);
}

export function formatClosedLabel(accomplished_date?: string | null): string | null {
  const d = getMilestoneClosedAt(accomplished_date);
  return d ? format(d, 'MM/dd') : null;
}
```

**Step 2:** ビルド確認。

```bash
bun run build
```

## Task 3: 更新 / 削除ミューテーション追加

**Objective:** `/milestone/update/{id}` と `/milestone/remove/{id}` を叩く mutation を追加。

**Files:** `src/hooks/useMilestoneMutation.ts`

**Step 1:** 更新フォーム型と2つの mutation を追記。

```ts
export interface MilestoneUpdateFormValues {
  title: string;
  description?: string;
  guideline_end_date?: string | null;
  accomplished_date?: string | null;
}

export const useUpdateMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MilestoneUpdateFormValues }) =>
      basicAxios.post(`/milestone/update/${id}`, body),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};

export const useRemoveMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: (id: number) => basicAxios.delete(`/milestone/remove/${id}`),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};
```

**Step 2:** 更新テスト（`useMilestoneMutation.test.tsx` に追記）

```tsx
it('should call /milestone/update/{id} with correct payload', async () => {
  mockPost.mockResolvedValue({ data: { id: 1 } });
  const { result } = renderHook(() => useUpdateMilestoneMutation(), { wrapper: createWrapper() });
  result.current.mutate({ id: 1, body: { title: 'T', accomplished_date: '2026-08-20' } });
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/milestone/update/1', { title: 'T', accomplished_date: '2026-08-20' })
  );
});
```

**Step 3:** ビルド / テスト確認。

```bash
bun run testrun
```

## Task 4: タイトルコンポーネント化（クリック + waiting 表示）

**Objective:** タイトルをクリック可能にし、waiting の「MM/dd close」を gray で表示。

**Files:** `src/components/organisms/MilestoneListTitle.tsx`（新規）, `src/components/organisms/MilestoneList.css.ts`

**Step 1:** `MilestoneListTitle` を実装。

```tsx
import { Box, Text, UnstyledButton } from '@mantine/core';
import { MilestoneProps } from '../../lib/TimelineType';
import { formatClosedLabel } from '../../lib/milestone';
import { item, colorBar, waitingDate } from './MilestoneList.css';

interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  onOpenDetail: (milestone: MilestoneProps) => void;
}

export const MilestoneListTitle = ({ milestone, onOpenDetail }: MilestoneListTitleProps) => {
  const closedLabel = milestone.status === 'waiting'
    ? formatClosedLabel(milestone.accomplished_date)
    : null;
  return (
    <UnstyledButton className={item} onClick={() => onOpenDetail(milestone)}>
      <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
      {closedLabel && <Text className={waitingDate}>{closedLabel} close</Text>}
      <Text>{milestone.title}</Text>
    </UnstyledButton>
  );
};
```

**Step 2:** `MilestoneList.css.ts` に gray スタイルを追加。

```ts
export const waitingDate = style({
  color: '#888',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
});
```

**Step 3:** ビルド確認。

```bash
bun run build
```

## Task 5: 詳細(更新)モーダル実装

**Objective:** タイトルクリックで開く詳細モーダル。作成者名 / グループ名（読取専用）+ タイトル / 説明 / ガイドライン終了日 / 達成日（編集可）。更新ボタンで API 反映。

**Files:** `src/components/organisms/MilestoneDetailDialog.tsx`（新規）, `src/components/organisms/MilestoneDetailDialog.css.ts`（新規）

**Step 1:** モーダル本体を実装（作成者名・グループ名は hook から）。

```tsx
import { useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Button, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { format, parseISO } from 'date-fns';

import { MilestoneProps } from '../../lib/TimelineType';
import { useUpdateMilestoneMutation, MilestoneUpdateFormValues } from '../../hooks/useMilestoneMutation';
import { useGroupUsersQuery } from '../../resources/queries';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { form, actions } from './MilestoneDetailDialog.css';

interface MilestoneDetailDialogProps {
  milestone: MilestoneProps | null;   // null なら閉じている
  onClose: () => void;
}

export const MilestoneDetailDialog = ({ milestone, onClose }: MilestoneDetailDialogProps) => {
  const { data: groupUsers } = useGroupUsersQuery();
  const authInfo = useAuthInfo();
  const updateMilestone = useUpdateMilestoneMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [guidelineEndDate, setGuidelineEndDate] = useState<Date | null>(null);
  const [accomplishedDate, setAccomplishedDate] = useState<Date | null>(null);

  // milestone が変わったらフォームを初期化
  useEffect(() => {
    if (!milestone) return;
    setTitle(milestone.title ?? '');
    setDescription(milestone.description ?? '');
    setGuidelineEndDate(milestone.guideline_end_date ? parseISO(milestone.guideline_end_date) : null);
    setAccomplishedDate(milestone.accomplished_date ? parseISO(milestone.accomplished_date) : null);
  }, [milestone]);

  const creator = groupUsers?.data?.find((u) => u.staff_id === milestone?.staff_id);
  const creatorName = creator ? `${creator.family_kana ?? ''}${creator.last_kana ?? ''}` : '不明';
  const groupName = authInfo.type === 'auth' ? authInfo.group : 'グループなし';

  const handleUpdate = () => {
    if (!milestone || !title.trim()) return;
    const body: MilestoneUpdateFormValues = {
      title: title.trim(),
      description: description.trim() || undefined,
      guideline_end_date: guidelineEndDate ? format(guidelineEndDate, 'yyyy-MM-dd') : null,
      accomplished_date: accomplishedDate ? format(accomplishedDate, 'yyyy-MM-dd') : null,
    };
    updateMilestone.mutate({ id: milestone.id, body }, { onSuccess: onClose });
  };

  return (
    <Modal opened={!!milestone} onClose={onClose} title="マイルストーン詳細" centered>
      {milestone && (
        <form className={form}
          onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
          <Text>作成者名: {creatorName}</Text>
          <Text>グループ名: {groupName}</Text>
          <TextInput label="タイトル" required value={title}
            onChange={(e) => setTitle(e.currentTarget.value)} />
          <Textarea label="説明" value={description}
            onChange={(e) => setDescription(e.currentTarget.value)} />
          <DateInput label="ガイドライン終了日" value={guidelineEndDate}
            onChange={setGuidelineEndDate} clearable />
          <DateInput label="達成日" placeholder="達成日(空)" value={accomplishedDate}
            onChange={setAccomplishedDate} clearable />
          <div className={actions}>
            <Button variant="default" onClick={onClose}>キャンセル</Button>
            <Button type="submit" disabled={!title.trim()} loading={updateMilestone.isPending}>更新</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
```

> 注意: 本 Issue は削除ボタン**なし**（機能要件 6）。`useRemoveMilestoneMutation` は UI から呼ばない。

**Step 2:** ビルド確認。

```bash
bun run build
```

## Task 6: MilestoneList への組み込み（クリック起動 + waiting 表示）

**Objective:** 一覧の各タイトルを `MilestoneListTitle` に置き換え、クリックで詳細モーダルを開く。

**Files:** `src/components/organisms/MilestoneList.tsx`

**Step 1:** 選択中マイルストーン state とモーダルを追加。

```tsx
import { useState } from 'react';
import { Box, Loader, Button, Text } from '@mantine/core';
import { useMilestonesQuery } from '../../resources/queries';
import { MilestoneProps } from '../../lib/TimelineType';
import { MilestoneListTitle } from './MilestoneListTitle';
import { MilestoneDetailDialog } from './MilestoneDetailDialog';
import { list } from './MilestoneList.css';

export const MilestoneList = () => {
  const { data, isPending, isError, error } = useMilestonesQuery();
  const [selected, setSelected] = useState<MilestoneProps | null>(null);
  // ... isPending / isError は既存のまま ...

  const openMilestones = (data ?? []).filter((m) => m.status !== 'closed');

  return (
    <>
      <Box className={list}>
        {openMilestones.map((milestone) => (
          <MilestoneListTitle key={milestone.id} milestone={milestone}
            onOpenDetail={setSelected} />
        ))}
      </Box>
      {selected && (
        <MilestoneDetailDialog milestone={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
};
```

**Step 2:** `MilestoneList.test.tsx` を更新。`status` を文字列化 + waiting 表示 / タイトルクリックでモーダルが開くケースを追加（詳細は `test-plan.md`）。

**Step 3:** ビルド / テスト確認。

```bash
bun run build
bun run testrun
```

## Task 7: waiting -> closed テスト（実装要件 6）

**Objective:** `status: 'waiting'` のミルストーンが、`/milestone/remove/{id}` 相当の操作で `closed` になり一覧から消えることをテストで確認。

**Files:** `src/components/organisms/MilestoneList.test.tsx`

**Step 1:** 「仮の closed 日付」を設定し、waiting が一覧に表示されることを確認するテストと、「closed になったら表示されない」ことを確認するテストを追加。

```tsx
// waiting -> 一覧に表示（「MM/dd close」gray 文字）
it('should show waiting milestone with MM/dd close', () => {
  const mockMilestones: MilestoneProps[] = [
    { id: 1, title: 'M1', status: 'waiting', color: '#9c27b0', staff_id: 1,
      created_at: '2026-08-20', accomplished_date: '2026-08-20' },
  ];
  mockQuery({ data: mockMilestones, isPending: false, isError: false });
  render(<MantineProvider><MilestoneList /></MantineProvider>);
  expect(screen.getByText(/close/)).toBeInTheDocument();
});

// closed -> 一覧から消える（filter で除外される）
it('should hide closed milestone from list', () => {
  const mockMilestones: MilestoneProps[] = [
    { id: 1, title: 'M1', status: 'closed', color: '#9c27b0', staff_id: 1,
      created_at: '2026-08-20', accomplished_date: '2026-08-22' },
  ];
  mockQuery({ data: mockMilestones, isPending: false, isError: false });
  render(<MantineProvider><MilestoneList /></MantineProvider>);
  expect(screen.queryByText('M1')).not.toBeInTheDocument();
});
```

> 実ブラウザ側の「waiting → closed」はバックエンドの `/milestone/remove/{id}` を叩く想定（レスポンス `{"closed": id}`）。フロント単体テストでは、`status` の切り替えをモックして一覧描画を検証する（`test-plan.md` §4 で確認）。

**Step 2:** 品質ゲート一式を実行。

```bash
bun run testrun   # 全 PASS（実装要件 6 のテスト含む）
bun run lint      # --max-warnings 0
bun run build     # 0 errors
```

## 品質ゲート（全タスク終了後）

```bash
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0
bun run build     # 0 errors
```
