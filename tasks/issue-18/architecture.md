# アーキテクチャ — マイルストーン内容の更新と削除

この文書は、フロントエンドからマイルストーン既定の一覧を**更新**し、`status: 'waiting'` の表示と「waiting -> closed で消える」テストまでを実現するための設計です。**本 Issue はフロントエンドのみ**で、バックエンドは別途対応済みとみなします。ここでは**想定する API 契約**を「既に成立している前提」として明文化します。

## 1. データモデル（`src/lib/TimelineType.ts`）

### 1-1. `MilestoneProps.status` の型変更

現状は `status: boolean`。Issue #18 の契約では `status` は `'open' | 'waiting' | 'closed'` の文字列。**型変数**を導入する。

```ts
export type MilestoneStatus = 'open' | 'waiting' | 'closed';

export interface MilestoneProps {
  id: number;
  staff_id: number;
  title: string;
  description?: string | null;
  color: string;
  status: MilestoneStatus;          // boolean -> 変更
  created_at: string | null;
  guidline_end_date?: string | null;
  accomplished_date?: string | null;
}
```

### 1-2. 影響箇所

`status` を真偽判定していた箇所が壊れるため、まとめて修正する。

| 箇所 | 現状 | 修正後 |
|------|------|--------|
| `src/components/organisms/MilestoneList.tsx:26` | `(data ?? []).filter((m) => m.status)` | `(data ?? []).filter((m) => m.status !== 'closed')`（open + waiting を表示） |
| `MilestoneList.test.tsx` の mock | `status: true / false` | `status: 'open' / 'closed'` |

> 受け入れ要件 2「waiting で『MM/dd close』」を満たすため、一覧は `open` **と** `waiting` を表示し、`closed` のみ除外する。

## 2. 想定 API 契約（フロントから叩くエンドポイント）

> バックエンドは別途対応済みとみなし、この契約を前提とする。**現状のバックエンドはこの契約と乖離**（`overview.md` リスク表参照）。実ブラウザ確認は契約反映後に実施。

| メソッド / パス | 認証 | ボディ | レスポンス | 用途 |
|----------------|------|--------|-----------|------|
| `POST /milestone/update/{milestone_id}` | `require_token` + `admin` | `{ title?: str, description?: str, guidline_end_date?: "YYYY-MM-DD"\|null, accomplished_date?: "YYYY-MM-DD"\|null }` | `MilestoneORM.to_dict()`（200）| 詳細モーダルの「更新」 |
| `DELETE /milestone/remove/{milestone_id}` | `require_token` + `admin` | — | `{"closed": milestone_id}`（200）| waiting → closed 遷移テスト専用（UI ボタンは設置しない） |
| `GET /milestone/all` | `require_token` | — | `open` + `waiting` の一覧 `[to_dict(), ...]`（200）| 一覧表示（基準） |
| `GET /group/users` | `require_token` | — | `GroupUserProps[]`（`staff_id, family_kana, last_kana`）| 作成者名解決 |
| `GET/POST /timetable/inquiry` | `require_token` | — | JWT クレーム由来の `group`（`AuthInfoProp{type:'auth'}.group`）| グループ名表示 |

- `status` の `open` -> `waiting` 遷移は **バックエンド側**で行われる想定（フロントは `accomplished_date` を送るだけでよい）。
- `/milestone/all` は `closed` を除外して返す想定。フロント側でも `status !== 'closed'` で保険的にフィルタする。

## 3. TanStack Query 配線

認証ヘッダーは `AuthAxios`（`src/components/templates/AxiosClientProvider.tsx`）のインターセプターが付与済み。個別のトークン指定は不要。

### 3-1. クエリーキー（`src/resources/cache.ts`）

`milestoneKeys` は既存のまま（`all` で十分）。追加不要。

```ts
export const milestoneKeys = { all: () => ["milestone", "all"] as const };
export function useMilestoneCache() {
  const queryClient = useQueryClient();
  return useMemo(() => ({
    invalidateMilestoneList: () =>
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all() }),
  }), [queryClient]);
}
```

### 3-2. ミューテーション（`src/hooks/useMilestoneMutation.ts` に追記）

```ts
export interface MilestoneUpdateFormValues {
  title: string;
  description?: string;
  guidline_end_date?: string | null;   // 'yyyy-MM-dd' or null
  accomplished_date?: string | null;   // 'yyyy-MM-dd' or null
}

// 更新: accomplished_date を設定すると、バックエンド側で status が waiting へ遷移する
export const useUpdateMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MilestoneUpdateFormValues }) =>
      basicAxios.post(`/milestone/update/${id}`, body),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};

// 削除(close)相当: waiting -> closed 遷移テスト専用。UI ボタンは設置しない
export const useRemoveMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: (id: number) => basicAxios.delete(`/milestone/remove/${id}`),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};
```

> `useMilestoneMutation.ts` が肥大化するようなら、`useMilestoneUpdateMutation.ts` 等へ分割してもよいが、まずは同ファイルへの追記を推奨（Issue #16 の `useAddMilestoneMutation` と同居）。

### 3-3. 作成者名・グループ名の取得（モーダル内で利用）

- **作成者名:** `useGroupUsersQuery()`（`/group/users`）の一覧から `staff_id` で該当を引き、`family_kana` + `last_kana` を連結。
  - 参考: `src/lib/SampleState.ts:88-103` は `{ family_kana: 'フナキ', last_kana: 'カズヨシ' }` のように姓 + 名の想定。
  - guard: `row ? `${row.family_kana ?? ''}${row.last_kana ?? ''}` : '不明'`
- **グループ名:** `useAuthInfo()` の `group`（`AuthInfoProp{type:'auth'}.group`）。`TimelinePage.tsx:24-25` と同様の使い方。

## 4. コンポーネント構成（`src/components/organisms/`）

```
src/components/organisms/
├── MilestoneList.tsx          # 修正: filter を status !== 'closed' に、タイトルをクリック可能に、waiting に「MM/dd close」表示
├── MilestoneListTitle.tsx     # 新規: タイトル単体 + クリック（詳細モーダル起動）
└── MilestoneDetailDialog.tsx  # 新規: 詳細(更新)モーダル
```

### MilestoneList.tsx（修正）

- `data.filter((m) => m.status !== 'closed')` に変更。
- 各 `item` の中で、`status === 'waiting'` のとき「色バー」と「タイトル」の**間に** gray の `MM/dd close` を挿入（`MilestoneListTitle` に受け渡す）。
- タイトル表示を `MilestoneListTitle milestone={m}` に置き換え、クリックで `MilestoneDetailDialog` を開く。

### MilestoneListTitle.tsx（新規）

- `MilestoneProps` を受け取り、「色バー + [waiting なら MM/dd close +] タイトル」を描画。
- クリックで `onOpenDetail(m)` を呼ぶ（`UnstyledButton` または `button`）。
- waiting 表示:
  - 閉鎖予定日 = `accomplished_date` に `MILESTONE_CLOSE_GRACE_DAYS` を足した日 → `format(date, 'MM/dd')`。
  - 年は常に現在年ではなく `accomplished_date` + 猶予日の実際の年を使う（`format(date, 'MM/dd')` はそのまま日付オブジェクトから）。
- 追加 CSS: `MilestoneList.css.ts` に `waitingDate` / `closeText`（gray）スタイルを追加。

### MilestoneDetailDialog.tsx（新規）

- Mantine `Modal`。表示項目（上から）:
  1. 作成者名（読み取り専用）
  2. グループ名（読み取り専用）
  3. タイトル（`TextInput`、編集可）
  4. 説明（`Textarea`、編集可）
  5. ガイドライン終了日（`DateInput`、編集可）
  6. 達成日（`DateInput`、編集可・placeholder「達成日(空)」）
- 「更新」ボタン → `useUpdateMilestoneMutation().mutate({ id, body })`。`onSuccess` で `onClose()`。
- タイトルが空の場合は送信不可（バリデーション）。
- 日付は `format(v, 'yyyy-MM-dd')` で文字列化（`undefined`/`null` はそのまま送る）。
- 削除ボタンは**設置しない**（Issue 機能要件 6）。
- 作成者名・グループ名は上述の hook から取得（`useGroupUsersQuery`, `useAuthInfo`）。
- スタイル: `MilestoneDetailDialog.css.ts`（Vanilla Extract、同ディレクトリ）。

### 配置（`src/components/pages/TimelinePage.tsx`）

`MilestoneList` は既に配置済み（`:108-111`）。内部でモーダルが開くだけで、**ページ側の変更は不要**（admin 判定は既存 `isAdmin` を再利用）。

## 5. 猶予期間の扱い（プレースホルダ）

猶予期間の実値は未定（スコープ外）。フロントは仮の定数を1箇所に定義し、テストも同定数で計算する。

```ts
// src/lib/milestone.ts（新規・型/ユーティリティ）
import { addDays, format } from 'date-fns';

// TODO(issue): 猶予期間の実値が決まったら置き換える（現在は仮の 2 日）
export const MILESTONE_CLOSE_GRACE_DAYS = 2;

// waiting の「closed となる日付」。accomplished_date が無ければ null
export function getMilestoneClosedAt(accomplished_date?: string | null): Date | null {
  if (!accomplished_date) return null;
  return addDays(new Date(accomplished_date), MILESTONE_CLOSE_GRACE_DAYS);
}

export function formatClosedLabel(accomplished_date?: string | null): string | null {
  const d = getMilestoneClosedAt(accomplished_date);
  return d ? format(d, 'MM/dd') : null;
}
```

`MilestoneListTitle` は `status === 'waiting'` のとき `formatClosedLabel` を使い、`MM/dd` + `close`（gray）を描画。

## 6. 変更対象ファイル（見込み）

| ファイル | 変更 |
|---------|------|
| `src/lib/TimelineType.ts` | `MilestoneStatus` 型変数追加、`MilestoneProps.status` を文字列化 |
| `src/lib/milestone.ts`（新規） | `MILESTONE_CLOSE_GRACE_DAYS`, `getMilestoneClosedAt`, `formatClosedLabel` |
| `src/hooks/useMilestoneMutation.ts` | `useUpdateMilestoneMutation`, `useRemoveMilestoneMutation` 追記 |
| `src/components/organisms/MilestoneList.tsx` | filter 修正、waiting 表示、タイトルクリック起動 |
| `src/components/organisms/MilestoneListTitle.tsx`（新規） | タイトルコンポーネント化 |
| `src/components/organisms/MilestoneDetailDialog.tsx`（新規） | 詳細(更新)モーダル |
| `src/components/organisms/MilestoneList.css.ts` | waiting の gray 表示スタイル追加 |
| `src/components/organisms/MilestoneDetailDialog.css.ts`（新規） | モーダルスタイル |
| 既存テスト `MilestoneList.test.tsx`, `useMilestoneMutation.test.tsx` | status を文字列化 + 新規ケース |
