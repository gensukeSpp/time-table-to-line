# tasks.md — 実装タスク（TDD形式, bite-sized）

モジュール: フロントエンド。作業ディレクトリは `time-table-to-line/`。
ブランチ `feature/milestone-detail-anyone` 上で作業する。各タスク末尾で commit。

**検証コマンド（共通）**
```bash
bun run lint        # --max-warnings 0
bun run build       # tsc + vite build, 0 errors
bun run testrun     # CI モードで 1 回だけ実行
```
※ 個別タスクの「実行→期待」は下記の通り。最後に親が 3 コマンドをまとめて通す。

---

## Task 1: MilestoneListTitle から admin ゲートを撤廃（誰でも開ける）

**Objective:** 非管理者でもマイルストーンタイトルをクリック可能にする。

**Files:**
- Modify: `src/components/organisms/MilestoneListTitle.tsx`

**Step 1: 編集**

`interface MilestoneListTitleProps` から `admin: boolean;` を削除。`handleOpen` を
```tsx
const handleOpen = () => {
  onOpenDetail(milestone);
};
```
に変更。`UnstyledButton` から `disabled={!admin}` / `aria-disabled={!admin}` / `style={...}` を削除し
```tsx
<UnstyledButton className={titleButton} onClick={handleOpen}>
  <Text>{milestone.title}</Text>
</UnstyledButton>
```
に。import から不要になるものがないか確認（`UnstyledButton`, `Text`, `Box` は使用継続）。

**Step 2: 検証**

```bash
bun run build
```
期待: `MilestoneListTitle.tsx` に関する型エラーは、`MilestoneList.tsx` で `admin` を
渡している箇所へのエラー（次の Task 2 で解消する）のみ。Task 1 単体で通す必要はないが、
`bun run lint` の TS 未使用エラーは出さないこと。

**Step 3: Commit**

```bash
git add src/components/organisms/MilestoneListTitle.tsx
git commit -m "refactor(task-13): MilestoneListTitle の admin ゲート撤廃（閲覧は誰でも可）"
```

---

## Task 2: MilestoneList のゲート撤廃

**Objective:** 誰でも詳細モーダルを開けるようにし、編集制御はモーダルの `admin` prop に委ねる。

**Files:**
- Modify: `src/components/organisms/MilestoneList.tsx`

**Step 1: 編集**

- `const handleOpenDetail = isAdmin ? setSelected : () => undefined;` を削除。
- `<MilestoneListTitle ... onOpenDetail={handleOpenDetail} admin={isAdmin} />` を
  `<MilestoneListTitle key={milestone.id} milestone={milestone} onOpenDetail={setSelected} />` に変更。
- `<MilestoneDetailDialog>` を `{selected && isAdmin && (...)}` から `{selected && (...)}` に変更
  （`isAdmin` は `admin={isAdmin}` としてモーダルに渡し続ける）。
- 不要になった変数・import が残らないよう確認。

**Step 2: 検証**

```bash
bun run build
bun run lint
```
期待: 両方ともエラーなし（Task 1 で外した `admin` を使う箇所が他にないこと）。

**Step 3: Commit**

```bash
git add src/components/organisms/MilestoneList.tsx
git commit -m "refactor(task-13): MilestoneList の閲覧ゲート撤廃（詳細モーダルを誰でも開ける）"
```

---

## Task 3: MilestoneDetailDialog に非管理者向け読取専用詳細を追加

**Objective:** 非管理者でもマイルストーン詳細（タイトル/ステータス/作成者/グループ/説明/日付）を読取表示。

**Files:**
- Modify: `src/components/organisms/MilestoneDetailDialog.tsx`

**Step 1: 編集**

`!admin` の分岐（architecture.md §3 参照）を、現在の
```tsx
{!admin ? (
  <Text c="dimmed">管理者のみ更新できます。</Text>
) : (
  <>
    ...編集フォーム...
  </>
)}
```
から、詳細読取表示へ差し替える。`admin` 側の編集フォームは変更しない。

**Step 2: 検証**

```bash
bun run build
bun run lint
```
期待: エラーなし。`milestone.description` / `guideline_end_date` / `accomplished_date` の
optional は `??` で fallback（undefined 表示を防ぐ）。

**Step 3: Commit**

```bash
git add src/components/organisms/MilestoneDetailDialog.tsx
git commit -m "feat(task-13): マイルストーン詳細を非管理者にも読取表示（編集は管理者のみ）"
```

---

## Task 4: EventDetailOverlay に周囲余白（padding）を追加

**Objective:** タイムラインのイベント詳細表示（`AddChildForm` 閲覧専用）の見栄えを改善。

**Files:**
- Modify: `src/components/organisms/EventDetailOverlay.css.ts`

**Step 1: 編集**

`overlay` style に `padding: '0.75rem'` を追加（architecture.md §4）。

**Step 2: 検証**

```bash
bun run build
bun run lint
```
期待: エラーなし。CSS のみの変更で既存テスト（`EventDetailOverlay.spec.tsx` /
`InputItem.spec.tsx`）への影響はない想定だが、念のため
`bunx vitest run src/tests/EventDetailOverlay.spec.tsx src/tests/InputItem.spec.tsx` を通す。

**Step 3: Commit**

```bash
git add src/components/organisms/EventDetailOverlay.css.ts
git commit -m "style(task-13): タイムライン詳細表示に周囲余白(padding)を追加"
```

---

## Task 5: 単体テスト更新（非管理者の詳細閲覧）

**Objective:** 既存テストのうち「非管理者は詳細をブロック」を検証するものが今回の仕様変更で
**失敗する**ため、これを「非管理者でも詳細を閲覧できる（読取専用）」に書き換え、仕様を固定する。
（新規 spec は作らない。既存 `MilestoneList.test.tsx` の vi.mock 資産を再利用。）

**Files:**
- Modify: `src/components/organisms/MilestoneList.test.tsx`（150-170 行のテストを書き換え）

**Step 1: 書き換え（既存テストのアサーションを反転）**

`src/components/organisms/MilestoneList.test.tsx` の
`it('should block detail dialog for non-admin users', ...)`（150-170 行）を
以下のように置き換える:

```tsx
it('should open detail dialog for non-admin users (read-only)', async () => {
  const user = userEvent.setup();
  const mockMilestones: MilestoneProps[] = [
    { id: 1, title: 'M1', status: 'open', color: '#9c27b0', staff_id: 1,
      created_at: '2026-08-20', guideline_end_date: null, accomplished_date: null },
  ];

  ;(useAuthInfo as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    type: 'auth',
    authId: 1,
    code: 3,
    group: 'グループA',
    admin: false,
  });
  mockQuery({ data: mockMilestones, isPending: false, isError: false });
  renderList();

  await user.click(screen.getByText('M1'));

  // 非管理者でも詳細モーダルが開き、作成者名が表示される
  expect(screen.getByText('マイルストーン詳細')).toBeInTheDocument();
  expect(screen.getByText(/作成者名/)).toBeInTheDocument();
  // 読取専用: 更新ボタンは表示されない
  expect(screen.queryByRole('button', { name: '更新' })).toBeNull();
});
```

- このテストの `beforeEach` は `useUpdateMilestoneMutation` を `{ mutate: vi.fn(), isPending: false }`
  にモック済み。非管理者の読取分岐は `mutate` を呼ばないので問題なし。
- `milestone` に `description` 未設定・`guideline_end_date: null` を渡しているため、
  Task 3 の `?? '（なし）'` / `?? '（未設定）'` fallback が働く（表示は「（なし）」「（未設定）」）。
- 既存の `should open detail dialog when title is clicked`（admin, 134 行）はそのまま維持
  （管理者の閲覧 + 更新ボタン表示を引き続きカバー）。

**Step 2: 実行**

```bash
bunx vitest run src/components/organisms/MilestoneList.test.tsx
```
期待: 全テスト passed（書き換えた 1 件を含む）。書き換え前だと 150-170 行の旧テストが失敗する。

**Step 3: 全体検証**

```bash
bun run testrun
bun run lint
bun run build
```
期待: 全て成功。

**Step 4: Commit**

```bash
git add src/components/organisms/MilestoneList.test.tsx
git commit -m "test(task-13): 非管理者も詳細閲覧できる仕様にテストを更新"
```
