# 実装タスク — マイルストーン追加処理と表示

> 各タスクの後に `bun run build` / `bun run lint` / `bun run testrun` を随時実行し、進捗を止めない。
> 実行順序は 1 → 9 の直列依存。サブエージェントに投げる場合はタスク 3〜8 をまとめて投げてよい（型追加の 1・2 を先に完了させること）。

## Task 1: `TimelineEventProps` への属性追加と `MilestoneProps` 型定義

**Objective:** 型レイヤを整え、既存ビルドを壊さない。

**Files:** `src/lib/TimelineType.ts`

**Step 1:** `TimelineEventProps` に `milestone_id?: number | null` と `completed?: boolean` を追加。

```ts
export type TimelineEventProps = Merge<NewTimelineItem, {
  title: React.ReactNode;
  start_time: Date;
  end_time: Date;
  isDraggable?: boolean;
  admin: boolean;
  milestone_id?: number | null;   // 追加
  completed?: boolean;            // 追加
}>;
```

**Step 2:** マイルストーン型を追加。

```ts
export interface MilestoneProps {
  id: number;
  staff_id: number;
  title: string;
  description?: string | null;
  color: string;
  status: boolean;
  created_at: string | null;
  guidline_end_date?: string | null;
  accomplished_date?: string | null;
}
```

**Step 3:** ビルド確認。属性追加で型不整合（`TimelineEventProps` を直接生成している箇所）が出る場合、`EventsParent.tsx` の `initialData` 等を確認して optional 化で吸収する。

```bash
bun run build   # Expected: 0 errors
```

## Task 2: クエリーキー追加

**Objective:** マイルストーン用のキーとキャッシュ無効化ヘルパーを追加。

**Files:** `src/resources/cache.ts`

```ts
export const milestoneKeys = {
  all: () => ["milestone", "all"] as const,
};

export function useMilestoneCache() {
  const queryClient = useQueryClient();
  return useMemo(() => ({
    invalidateMilestoneList: () =>
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all() }),
  }), [queryClient]);
}
```

## Task 3: データフェッチ関数追加

**Objective:** `/milestone/all` を GET で取得する関数を追加。

**Files:** `src/resources/fetch.ts`

```ts
import { MilestoneProps } from "../lib/TimelineType";

export const fetchMilestones = async (): Promise<MilestoneProps[]> => {
  const { data } = await basicAxios.get<MilestoneProps[]>('/milestone/all');
  return data;
};
```

認証はインターセプター付与済みのためトークン引数不要（`fetchEventsDataForTT` と同じ）。

## Task 4: クエリーフック追加

**Objective:** `useMilestonesQuery` を追加。

**Files:** `src/resources/queries.ts`

```ts
export const useMilestonesQuery = () => {
  return useQuery({
    queryKey: milestoneKeys.all(),
    queryFn: fetchMilestones,
  });
};
```

- import に `milestoneKeys`, `fetchMilestones` を追加。
- グループ横断共有のため、グループフィルタを挟まない。

## Task 5: 追加ミューテーションフック追加

**Objective:** `/milestone/add` を POST するミューテーションを追加。

**Files:** `src/hooks/useMilestoneMutation.ts`（新規）

```ts
export interface MilestoneFormValues {
  title: string;
  description?: string;
  guidline_end_date?: string; // 'yyyy-MM-dd'
}

export const useAddMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: (m: MilestoneFormValues) =>
      basicAxios.post('/milestone/add', m),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};
```

- `useMilestoneMutation.ts` 新規でも、既存 `useEventMutation.ts` へ追記でも可。分離を推奨。
- ミューテーション成功後は必ず `invalidateMilestoneList()` で一覧を再取得（受け入れ 3）。

## Task 6: 追加モーダル実装

**Objective:** タイトル / 説明 / 目安日付を入力し、決定で POST するモーダル。

**Files:** `src/components/organisms/MilestoneCreateDialog.tsx`（新規）

**Step 1:** Mantine `Modal` + `TextInput`(タイトル) + `Textarea`(説明) + `DateInput`(目安日付) でフォームを作る。

**Step 2:** 決定ボタンで `useAddMilestoneMutation().mutate(...)`。`onSuccess` でモーダルを閉じる。

**Step 3:** 日付は `format(value, 'yyyy-MM-dd')`（date-fns）で文字列化して送る。バックエンドの `MilestoneCreate.guidline_end_date: date` と一致させる。

**Step 4:** フォームバリデーション — タイトルは必須（空なら決定不可 or Mantine エラー表示）。

**Step 5:** スタイルは `MilestoneCreateDialog.css.ts`（Vanilla Extract）を同ディレクトリに配置。

## Task 7: 追加ボタン実装

**Objective:** 管理者のみ表示される追加ボタン。クリックで Task 6 のモーダルを開く。

**Files:** `src/components/organisms/MilestoneAddButton.tsx`（新規）

**Step 1:** `admin: boolean` を props で受け取り、`!admin` なら `null`（描画しない）を返す。

**Step 2:** クリックで `useDialog()`（既存フック）または Mantine Modal の open 状態をトグル。

**Step 3:** ラベルは「マイルストーン作成」、ボタン右寄せ。

**Step 4:** `MilestoneAddButton.css.ts`（Vanilla Extract）。

## Task 8: open 一覧表示コンポーネント実装

**Objective:** 追加ボタンの左に「タイトル: 色のバー」一覧を表示。

**Files:** `src/components/organisms/MilestoneList.tsx`（新規）

**Step 1:** `useMilestonesQuery()` で一覧を取得。`isPending` 中は Loading 表示。

**Step 2:** 各要素を「タイトル + 色のバー」で描画。

```tsx
<Box key={m.id}>
  <Box style={{ width: 20, height: 12, backgroundColor: m.color }} />
  <Text>{m.title}</Text>
</Box>
```

**Step 3:** スタイルは `MilestoneList.css.ts`（Vanilla Extract）。横並びの flex レイアウト。

**Step 4:** この Issue ではクリック動作（詳細モーダル / close）は実装しない（スコープ外）。

## Task 9: タイムライン画面への配置

**Objective:** `GroupHorizonTimeline` にボタン（右上）と一覧（左）を組み込む。

**Files:** `src/components/pages/TimelinePage.tsx`

**Step 1:** 上部操作エリア（`<p>グループタイムライン</p>` 付近）に左から `MilestoneList` → 右寄せで `MilestoneAddButton` を配置。

**Step 2:** `admin` 判定に使う値を、`useEventsQuery` / `EventsParent` のイベントデータから取得（`TimelineEventProps.admin`）。`useAuthContext` の `auth` 情報で判定可能ならそれを優先してよい。

**Step 3:** 操作エリアはタイムライン本体（`containerRef` / ResizeObserver 対象）の**外**に置き、幅測定を妨げないこと。

**Step 4:** 配置後にブラウザで表示確認（`test-plan.md` の受け入れチェック）。

## 品質ゲート（全タスク終了後）

```bash
bun run testrun   # 全 PASS
bun run lint      # --max-warnings 0
bun run build     # 0 errors
```