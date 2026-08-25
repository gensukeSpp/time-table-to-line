# アーキテクチャ — マイルストーン追加処理と表示

この文書は、フロントエンド側から `/milestone/add` と `/milestone/all` を呼び出し、**追加** と **一覧表示** を実現するための設計です。バックエンドは実装済み（`light_token_server/tasks/task-03/`）で、ここでは API 契約を「既に成立している前提」として読み込む。

## 1. データモデル（`src/lib/TimelineType.ts`）

### 1-1. `TimelineEventProps` への属性追加

バックエンドの `EventORM.to_dict()` は既に `milestone_id` と `completed` を返している（`light_token_server/app/models.py:120-121`）。そのためフロントの型にだけ追加すれば、既存 `/event/all` のレスポンスと突き合わされる。

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

- `TimelineStackItem` は `Omit<TimelineEventProps, 'start_time' | 'end_time'>` なので、追加 2 属性は自動的に継承される（追加変更不要）。
- 追加後は既存ファイルの console / 未使用 import と同様、`bun run build` で型整合を一括確認する（Issue #16「実装詳細 1」の建付け）。

### 1-2. マイルストーン型

`/milestone/all` / `/milestone/add` のレスポンスは `MilestoneORM.to_dict()`（`app/models.py:147-158`）をそのまま返す。これに対応する型を定義する。

```ts
export interface MilestoneProps {
  id: number;
  staff_id: number;
  title: string;
  description?: string | null;
  color: string;                    // 10 色パレットのいずれか
  status: boolean;                  // true = open
  created_at: string | null;        // ISO 文字列
  guidline_end_date?: string | null;
  accomplished_date?: string | null;
}
```

`created_at` 等は ISO 文字列で返るので、型は `string | null` としフロントで `new Date(...)` 変換は表示時にのみ行う。

## 2. API 契約（既存・フロントから叩く 2 エンドポイント）

| メソッド / パス | 認証 | ボディ | レスポンス |
|----------------|------|--------|-----------|
| `POST /milestone/add` | `require_token` + `admin`（非 admin は 403）| `{ title: str, description?: str, guidline_end_date?: "YYYY-MM-DD" }` | `MilestoneORM.to_dict()`（201）|
| `GET /milestone/all` | `require_token` | — | open（`status=True`）の一覧 `[to_dict(), ...]`（200）|

- 注意: `/milestone/all` は**グループフィルタなし**で全 open を返す。これが受け入れ要件 5「どのグループでも同じ一覧」の根拠。フロント側でもグループで絞り込ま**ない**。
- スコープ外（本 Issue では叩かない）: `POST /milestone/update/{id}`（close）、`DELETE /milestone/remove/{id}`。

## 3. TanStack Query 配線

認証ヘッダーは `AuthAxios`（`src/components/templates/AxiosClientProvider.tsx`）のリクエストインターセプターが全リクエストに `Authorization: Bearer` を付与済み。よって `basicAxios` 経由の fetch / mutation にトークンを個別指定する必要はない（既存 `useEventMutation` の書き方と同じ）。

### 3-1. クエリーキー（`src/resources/cache.ts`）
```ts
export const milestoneKeys = {
  all: () => ["milestone", "all"] as const,
};
// useMilestoneCache: invalidateMilestoneList = () =>
//   queryClient.invalidateQueries({ queryKey: milestoneKeys.all() });
```

### 3-2. データフェッチ（`src/resources/fetch.ts`）
```ts
export const fetchMilestones = async (): Promise<MilestoneProps[]> => {
  const { data } = await basicAxios.get<MilestoneProps[]>('/milestone/all');
  return data;
};
```
（GET はインターセプターで認証付与されるためトークン引数不要。既存の `fetchEventsDataForTT` と同様。）

### 3-3. クエリー（`src/resources/queries.ts`）
```ts
export const useMilestonesQuery = () => {
  return useQuery({
    queryKey: milestoneKeys.all(),
    queryFn: fetchMilestones,
  });
};
```
- グループ横断共有の性質上、フィルタやトークン管理を挟まず単一キーで取得。
- 追加後の再取得は mutation の `onSuccess` で `invalidateMilestoneList()` を呼ぶ。

### 3-4. ミューテーション（`src/hooks/useMilestoneMutation.ts` 新規、または `useEventMutation.ts` に追記）
```ts
export const useAddMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: (m: MilestoneFormValues) =>
      basicAxios.post('/milestone/add', m),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};
```
- `MilestoneFormValues = { title: string; description?: string; guidline_end_date?: string }`。日付は `format(date, 'yyyy-MM-dd')` で文字列化して送る（バックエンドが `date` 型で受けるため）。
- 非 admin の追加はバックエンドから 403 で拒否される。フロントでは更に UI 側で隠す（下記 4）。

## 4. コンポーネント構成（`src/components/`）

コンポーネントは Atomic Design に従い配置する。**配置先はすべてタイムライン（`GroupHorizonTimeline`）**。Calendar には本 Issue では触れない。

```
src/components/organisms/
├── MilestoneAddButton.tsx       # 追加ボタン（右上、admin のみ表示）
├── MilestoneCreateDialog.tsx    # 追加モーダル（フォーム + POST）
└── MilestoneList.tsx            # open 一覧（タイトル + 色バー）
```

- **MilestoneAddButton（組織: organisms）** — `admin` プロパティを見て非 admin には `null`（表示しない）。クリックで MilestoneCreateDialog を開く。
- **MilestoneCreateDialog** — Mantine `Modal` + `TextInput`(タイトル) + `Textarea`(説明) + `DateInput`(目安日付)。決定で `useAddMilestoneMutation().mutate(...)`。成功（`onSuccess`）で `close()`。
- **MilestoneList** — `useMilestonesQuery()` の一覧を `map`。各要素は「タイトル + 色のバー（`style={{ backgroundColor: m.color }}`）」を描画。色は 10 パレット（`#9c27b0` 等）のうち open で使われていない色をバックエンドが自動選択済みなので、フロントは表示のみ。デフォルトイベント色 `#2196f3` / クリック後色 `#ffc107` に近い色はバックエンドパレットから除外済み。

### 配置（`src/components/pages/TimelinePage.tsx`）
`GroupHorizonTimeline` 内の `<p>グループタイムライン</p>` 直下付近を、タイムライン上部の操作エリアとして構成し直す。

```
┌────────────────────────────────────────────┐
│  [open 一覧: ■タイトル1  ■タイトル2]  ...  [＋マイルストーン作成]   ← 上部・右寄せボタン
│                                            │
│            ＜react-calendar-timeline＞      │
└────────────────────────────────────────────┘
```

- 上段左 = `MilestoneList`（追加ボタンの左に来る要件 5）
- 上段右 = `MilestoneAddButton`（`TimelineEventProps.admin` 相当の管理者フラグで判定）
- この 2 つはタイムライン本体の外（操作エリア）に置き、`ResizeObserver` / `containerRef` での幅測定に影響を与えないこと。

## 5. 管理権限判定の根拠

`TimelineEventProps` は既に `admin: boolean` を持つ。タイムラインのイベントデータ（`EventsParent` / `useEventsQuery`）から `admin` を取得してボタン表示を制御する。バックエンド側 403 との二重防御とし、**UI は隠す・API は 403** で担保する。

## 6. 変更対象ファイル（見込み）

| ファイル | 変更 |
|---------|------|
| `src/lib/TimelineType.ts` | `TimelineEventProps` に `milestone_id` / `completed` 追加、`MilestoneProps` 定義 |
| `src/resources/cache.ts` | `milestoneKeys`, `useMilestoneCache` 追加 |
| `src/resources/fetch.ts` | `fetchMilestones`（GET `/milestone/all`）追加 |
| `src/resources/queries.ts` | `useMilestonesQuery` 追加 |
| `src/hooks/useMilestoneMutation.ts`（新規） | `useAddMilestoneMutation`（POST `/milestone/add`） |
| `src/components/organisms/MilestoneAddButton.tsx`（新規） | 追加ボタン（admin のみ） |
| `src/components/organisms/MilestoneCreateDialog.tsx`（新規） | 追加モーダル |
| `src/components/organisms/MilestoneList.tsx`（新規） | open 一覧表示 |
| `src/components/pages/TimelinePage.tsx` | 上記 3 コンポーネントの配置 |