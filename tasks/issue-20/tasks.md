# 実装タスク — タイムライン詳細モーダル

> 各タスクの後に `bun run build` / `bun run lint` / `bun run testrun` を随時実行し、進捗を止めない。
> 実行順序は 1 → 5 の直列依存。サブエージェントに投げる場合は、`AddChildForm` 拡張の Task 1 を先に完了させ、Task 2〜4 をまとめて投げてよい。

### 想定契約（既存・変更なし）

- **admin 判定:** `useAuthInfo()` の `admin`（`/timetable/inquiry` の JWT クレーム由来）。イベント側 `admin` フラグは使わない。
- **メンバー名:** `useGroupUsersQuery`（`/group/users` → `GroupUserProps[]`）で `staff_id` を引き、`family_kana` + `last_kana`。
- **タイムラインの `onItemClick`:** `react-calendar-timeline` が提供（`itemId, e, time`）。

## Task 1: `AddChildForm` に管理者の読取専用モードを追加

**Objective:** `readOnly` プロップを追加し、管理者が他メンバーのイベントを開いたとき更新 / 削除ボタンを出さない。自分のイベントは従来どおり編集可。Calendar側（`readOnly` 未指定）は挙動不変。

**Files:** `src/components/organisms/InputItem.tsx`, `src/tests/InputItem.spec.tsx`（新規）

**Step 1: 失敗テストを書く**（`src/tests/InputItem.spec.tsx` 新規）

Administrator が他メンバーのイベントを `readOnly` で開いたとき、更新 / 削除ボタンが出ない:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { AxiosResponse } from 'axios';

import { AddChildForm } from '../components/organisms/InputItem';
import { TimelineEventProps, AuthInfoProp, GroupUserProps } from '../lib/TimelineType';
import { exEvents } from '../lib/SampleState';
import { authKeys, eventKeys } from '../resources/cache';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

const memberEvent: TimelineEventProps = exEvents.find((e) => e.staff_id !== 1000)!;

// /group/users モック（メンバー名解決用）
const mockGroupMembers: GroupUserProps[] = [
  { staff_id: memberEvent.staff_id, family_kana: 'フナキ', last_kana: 'カズヨシ' },
];
queryClient.setQueryData(eventKeys.userList(), {
  data: mockGroupMembers, status: 200, statusText: 'OK', headers: {}, config: {},
} as AxiosResponse<GroupUserProps[]>);

// /timetable/inquiry モック（admin=true）
const adminAuth: AuthInfoProp = {
  type: 'auth', authId: 1000, code: 7, group: 'group 1', admin: true,
};
queryClient.setQueryData(authKeys.verify('token'), {
  data: adminAuth, status: 200, statusText: 'OK', headers: {}, config: {},
} as AxiosResponse<AuthInfoProp>);

describe('AddChildForm (readonly)', () => {
  it('管理者が他メンバーのイベントを readOnly で見ると更新/削除ボタンが出ない', () => {
    render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <AddChildForm selectedEvent={memberEvent} closeClick={() => {}} readOnly />
        </QueryClientProvider>
      </MantineProvider>
    );
    expect(screen.getByText('フナキカズヨシ')).toBeInTheDocument();
    expect(screen.getByText('異なるスタッフの、変更はできません')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
  });

  it('自分のイベントは readOnly 指定でも編集可（更新/削除が出る）', () => {
    const myEvent = exEvents.find((e) => e.staff_id === 1000)!;
    render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <AddChildForm selectedEvent={myEvent} closeClick={() => {}} readOnly />
        </QueryClientProvider>
      </MantineProvider>
    );
    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });
});
```

> `useAuthInfo()` と `useGroupUsersQuery()` が外部通信しないよう、react-query キャッシュへモックを事前投入する（`Timeline.stories.tsx:16-59` と同様の手法）。

**Step 2: テストを実行して失敗を確認**

Run: `bun run testrun src/tests/InputItem.spec.tsx`
Expected: FAIL — `readOnly` プロップ未実装のため

**Step 3: 最小実装**（`src/components/organisms/InputItem.tsx`）

インターフェースへ `readOnly?: boolean` を追加し、`useGroupUsersQuery` を import。内部で `readOnlyMode` を算出し、読取専用の描画分岐を追加:

```tsx
import { useGroupUsersQuery } from "../../resources/queries";
// ...
const isAdmin = auth.type === 'auth' ? auth.admin : false;
const isOwnEvent = authId === selectedEvent.staff_id;
const readOnlyMode = readOnly === true && !isOwnEvent;

const { data: groupUsers } = useGroupUsersQuery();
const member = groupUsers?.data?.find((u) => u.staff_id === selectedEvent.staff_id);
const memberName = member ? `${member.family_kana ?? ''}${member.last_kana ?? ''}` : '不明';
```

return を `readOnlyMode ? (読取専用表示) : (既存表示)` に分岐。読取専用では:
- スタッフ ID の代わりに `memberName`
- `summary` / `progress` は `Text` で読取専用表示（`TextInput` / `NativeSelect` なし）
- `EventUpdateButtons` なし
- 「異なるスタッフ」警告 `Dialog` なし

**Step 4: テストを実行して成功を確認**

Run: `bun run testrun src/tests/InputItem.spec.tsx`
Expected: PASS（2 passed）

**Step 5: ビルド確認**

Run:
- `bun run build`   # Expected: 0 errors
- `bun run testrun` # Expected: 全 PASS（既存 Calendar テスト含む）

**Step 6: Commit**

```bash
git add src/components/organisms/InputItem.tsx src/tests/InputItem.spec.tsx
git commit -m "feat #260831: AddChildForm に管理者読取専用モード(readOnly)を追加"
```

## Task 2: オーバーレイコンポーネント実装

**Objective:** `AddChildForm` をタイムラインへ重ねて表示する絶対配置ラッパー。

**Files:** `src/components/organisms/EventDetailOverlay.tsx`（新規）, `src/components/organisms/EventDetailOverlay.css.ts`（新規）

**Step 1:** オーバーレイコンポーネントを実装（`architecture.md` §4 のコード）。

**Step 2:** CSS を実装（`architecture.md` §4 のコード。`position: 'absolute'`, `zIndex: 100`）。

**Step 3:** ビルド確認。

```bash
bun run build   # Expected: 0 errors
```

**Step 4:** Commit

```bash
git add src/components/organisms/EventDetailOverlay.tsx src/components/organisms/EventDetailOverlay.css.ts
git commit -m "feat #260831: タイムライン詳細モーダルのオーバーレイラッパーを新規追加"
```

## Task 3: Timeline へ `onItemClick` を組み込み

**Objective:** タイムラインのイベントクリックで、管理者 / 自分のイベントのみ詳細オーバーレイを開く。

**Files:** `src/components/pages/TimelinePage.tsx`

**Step 1:** `Id` を import し、選択イベント / 位置の state と `handleItemClick` を追加（`architecture.md` §3・§5 のコード）。

**Step 2:** `<Timeline>` へ `onItemClick={handleItemClick}` を追加し、`</div>` の後にオーバーレイ描画を追加（`architecture.md` §3 末尾）。

**Step 3:** ビルド確認。

```bash
bun run build   # Expected: 0 errors
```

**Step 4:** 既存 Timeline テストが通ること（回帰）。

```bash
bun run testrun src/tests/Timeline.spec.tsx
```

**Step 5:** Commit

```bash
git add src/components/pages/TimelinePage.tsx
git commit -m "feat #260831: Timeline に onItemClick で詳細オーバーレイを開く処理を組み込み"
```

## Task 4: タイムラインの統合テスト追加

**Objective:** `onItemClick` でモーダルが開く条件（管理者 / 自分のイベント）と読取専用表示をテストで固定化する。

**Files:** `src/tests/Timeline.spec.tsx`, `src/stories/Timeline.stories.tsx`

**Step 1:** `Timeline.stories.tsx` に admin 認証モックを追加し（`authKeys.verify` に `{admin: true, authId:...}` を投入）、Storybook からクリック可能にする。

**Step 2:** `src/tests/Timeline.spec.tsx` に、`Timeline` の `onItemClick` 相当を発火させてオーバーレイ表示を検証するテストを追加。オーバーレイは`<Timeline>`外部なので、`onItemClick` を story の `play` 内でリフレクトまたはモックで呼び、`selectedEvent` state 経由で描画を確認する。

> 注意: `react-calendar-timeline` の `onItemClick` は内部クリック処理経由。単体テストでは Timeline 直下のアイテム要素をクリックするか、story の `play` で相当イベントを発火させる。実現が難しい場合は `test-plan.md` §4 の実ブラウザ確認を主検証とし、テストは `AddChildForm` の読取専用（Task 1）に集中してもよい。

**Step 3:** ビルド / テスト確認。

```bash
bun run build
bun run testrun
```

**Step 4:** Commit

```bash
git add src/tests/Timeline.spec.tsx src/stories/Timeline.stories.tsx
git commit -m "test #260831: タイムライン詳細モーダルのテストを追加"
```

## Task 5: 品質ゲート一式

**Objective:** 全タスクをまとめて安定させる。

**Step 1:** 一括実行。

```bash
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0（console.log 禁止含む）
bun run build     # 0 errors
```

**Step 2:** 実ブラウザ確認（`test-plan.md` §4 の手順）。

**Step 3:** 最終 Commit（不要な変更があれば整理）。

```bash
git status
```

## 品質ゲート（全タスク終了後）

```bash
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0
bun run build     # 0 errors
```