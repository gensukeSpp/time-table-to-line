# Phase C: クエリ層重複排除

> **実行方式:** subagent（1 タスクのみ）
> **リスク:** 中。TanStack Query のキャッシュキーを変更するため、キャッシュ無効化に影響する可能性あり。
> **所要時間:** 10〜15 分

## C-1: 重複クエリフックの統合

**Objective:** `src/resources/queries.ts` で `useEventsQuery` と `useEventsQueryForTL` が同一の `eventKeys.all()` + `fetchEventsData` を使用している。オプション引数で統合する。

**Files:**
- Modify: `src/resources/queries.ts`
- Modify: 呼び出し元（import を含む）

### 現状の 3 つのクエリ

| フック名 | queryKey | fetchFn | 加工内容 |
|---------|----------|---------|---------|
| `useEventsQuery` | `eventKeys.all()` | `fetchEventsData` | `start`/`end` を Date 化 |
| `useUserEventsQuery` | `eventKeys.user()` | `fetchEventsDataForTT` | `start`/`end` を Date 化 |
| `useEventsQueryForTL` | `eventKeys.all()` | `fetchEventsData` | `start`/`end` + `start_time`/`end_time` を Date 化 |

**問題:** `useEventsQuery` と `useEventsQueryForTL` は全く同じエンドポイントを叩き、同じキャッシュキーを使う。両方のコンポーネントが同時にマウントされることはないが（Tabs 切り替え）、コードの重複であり、片方だけ修正した場合にもう片方が追従しないリスクがある。

### 統合方針

`useEventsQuery` にオプション引数 `{ forTimeline?: boolean }` を追加する:

```typescript
// 統合後の形
type EventQueryOptions = {
  forTimeline?: boolean;
};

export const useEventsQuery = (options?: EventQueryOptions) => {
  const { data: searchQueryToken } = useSearchQuery('token');
  
  const { data, ...queryInfo } = useQuery({
    queryKey: eventKeys.all(),
    queryFn: () => fetchEventsData(searchQueryToken!),
  });

  return {
    ...queryInfo,
    data: useMemo(() => data?.map(item => {
      const base = {
        ...item,
        start: item.start = new Date(item.start ?? new Date()),
        end: item.end = new Date(item.end ?? new Date()),
      };
      if (options?.forTimeline) {
        return {
          ...base,
          start_time: item.start_time = new Date(item.start ?? new Date()),
          end_time: item.end_time = new Date(item.end ?? new Date()),
        };
      }
      return base;
    }), [data, options?.forTimeline]),
  };
};

// useEventsQueryForTL は削除し、呼び出し元で useEventsQuery({ forTimeline: true }) に置き換え
```

### 影響を受ける呼び出し元

```bash
grep -rn "useEventsQuery\|useEventsQueryForTL\|useUserEventsQuery" src/ --include="*.{ts,tsx}"
```

- `src/components/templates/EventsParent.tsx` — `useEventsQueryForTL` を使用 → `useEventsQuery({ forTimeline: true })` に変更

※ `useEventsQuery` 自体は内部で `useSearchQuery` を使用しており、`searchQueryToken` を依存関係に持つ。TanStack Query の `enabled` オプションを活用して token がないときはクエリを発行しないようにするのも一案だが、YAGNI の観点から現状維持。

### Step 1: 修正

`src/resources/queries.ts` に変更を加え、`useEventsQueryForTL` を削除する。

### Step 2: 呼び出し元修正

`src/components/templates/EventsParent.tsx` の import と使用箇所を変更:
```typescript
// Before
import { useEventsQueryForTL } from '../../resources/queries';
// ...
const { data, isPending } = useEventsQueryForTL();

// After
import { useEventsQuery } from '../../resources/queries';
// ...
const { data, isPending } = useEventsQuery({ forTimeline: true });
```

### Step 3: ビルド確認

```bash
bun run build
```
Expected: 0 errors。

### Step 4: テスト確認

```bash
bun run testrun
```
Expected: 全 PASS。

### Step 5: Commit

```bash
git add src/resources/queries.ts src/components/templates/EventsParent.tsx
git commit -m "refactor: useEventsQuery と useEventsQueryForTL を統合"
```

## リスク

- `useEventsQuery({ forTimeline: true })` の `data` の型が呼び出し元で正しく推論されるか確認する。`useMemo` 内で条件分岐しているため、戻り値の型は `TimelineEventProps[] | undefined` のまま変わらないはず。
- キャッシュキーは変わらないため、`EventsParent.tsx` でキャッシュが古いデータを返す場合はブラウザのリロードで解決する。