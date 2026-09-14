# Task-11(フロント) 実装タスク — 自動 closed の画面反映(refetchInterval)

> 開始前に `overview.md` の「判断ポイント(回答済み 2026-09-07)」を確認してから進めること。
> 再取得間隔 60 分 / .env(VITE_*)で管理 / 追加 UI なし — すべて確定済み。
> TDD(失敗→実装→成功→Commit)でタスク単位に進める。

## Task 1: .env に間隔を定義

**Objective:** 再取得間隔を `.env`(VITE_*)で管理し、未設定時の既定(60 分)をコード側で担保する。

**Files:**
- Modify: `.env` / `.env.example`
- New: `src/lib/env.ts`(または既存の env 読み出し置き場。運用に合わせる)

**Step 1: .env(.env.example) に間隔を追加**
```bash
# .env  /  .env.example
VITE_MILESTONE_REFRESH_INTERVAL_MS=3600000   # 60分(サーバー猶予チェック間隔に揃える)
```
> VITE_* は**ビルド時に解決**される。値を変えたら要再起動/再ビルド。

**Step 2: 読み出しヘルパーを実装(未設定時 60 分にフォールバック)**
```ts
// src/lib/env.ts
export const MILESTONE_REFRESH_INTERVAL_MS =
  Number(import.meta.env.VITE_MILESTONE_REFRESH_INTERVAL_MS ?? 60 * 60 * 1000);
```
> 既定値は 60 分。`.env` 未設定でも動作するようフォールバックを必ず持つ。

**Step 3: Commit**
```bash
git add .env.example src/lib/env.ts
git commit -m "feat #(task11-FE): マイルストーン再取得間隔を .env(VITE_)で管理"
```
> `.env` は gitignore 対象ならコミットしない。`.env.example` をコミット。

---

## Task 2: useMilestonesQuery への refetchInterval 追加

**Objective:** `useMilestonesQuery` が定期的に `/milestone/all` を再取得するようにする。

**Files:**
- Modify: `src/resources/queries.ts`

**Step 1: 現状の useMilestonesQuery を確認**
```ts
// src/resources/queries.ts:118-123(変更前)
export const useMilestonesQuery = () => {
  return useQuery({
    queryKey: milestoneKeys.all(),
    queryFn: fetchMilestones,
  });
};
```

**Step 2: refetchInterval を追加**
```ts
export const useMilestonesQuery = () => {
  return useQuery({
    queryKey: milestoneKeys.all(),
    queryFn: fetchMilestones,
    refetchInterval: MILESTONE_REFRESH_INTERVAL_MS,
  });
};
```
> import: `MILESTONE_REFRESH_INTERVAL_MS` を `src/lib/env` から追加。
> 他クエリ(`useEventsQuery` / `useAuthQuery`)には手を加えない。

**Step 3: Commit**
```bash
git add src/resources/queries.ts
git commit -m "feat #(task11-FE): useMilestonesQuery に refetchInterval を追加(自動 closed 反映)"
```

---

## Task 3: テスト追加

**Objective:** `useMilestonesQuery` が定期再取得することを検証し、既存クエリの回帰を防ぐ。

**Files:**
- Modify: `src/resources/queries.spec.tsx`(既存のテスト)

**Step 1: 既存テスト構成を確認**
`src/resources/queries.spec.tsx` の `createQueryClient()` を利用する。

**Step 2: useMilestonesQuery のテストを追加**
- `refetchInterval` が設定値(`MILESTONE_REFRESH_INTERVAL_MS`)に一致すること
- `vi.useFakeTimers()` で一定時間進めた際、`fetchMilestones` が複数回呼ばれること
  (モックで `/milestone/all` を解決)
- `staleTime: Infinity` の既存モック設定では再フェッチが抑止されること(意図確認)

**Step 3: 全テストが通ること**
```bash
bun test src/resources/queries.spec.tsx
bun run testrun   # CI モード(全件)
```

**Step 4: Commit**
```bash
git add src/resources/queries.spec.tsx
git commit -m "test #(task11-FE): useMilestonesQuery の定期再取得を検証"
```

---

## Task 4: lint / 最終確認

**Objective:** lint を通し、既存クエリへの影響がないことを最終確認する。

**Step 1:** `git diff` で変更が useMilestonesQuery 関連のみであることを確認
```bash
git diff --stat
```

**Step 2:** lint 実行
```bash
bun run lint
```

**Step 3:** ビルド確認
```bash
bun run build
```

**Step 4:** `overview.md` / `architecture.md` の決定値(60 分 / .env / UI なし)と実装が
一致していることを確認。

**Step 5:** 最終コミット
```bash
git commit -am "docs #(task11-FE): 自動 closed の画面反映仕様を反映"
```

> 完了後、利用者の実ブラウザ / API 検証(猶予間隔を短く設定して、閉じたマイルストーンが
> 一定時間後に一覧から消え、色がデフォルトに戻ることを確認)を待つ。