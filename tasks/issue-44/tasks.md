# 実装タスク — 2 つの調整と、1 つの仕様変更

> 各タスクの後で適宜 `bun run lint` / `bun run build` / `bun run testrun` を実行し、進捗を止めない。
> 実行順序は **Task 0 → 5 の直列依存**。バックエンド（Task 1）とフロント（Task 2〜4）は独立だが、**受入 2 の往復契約（null 送信 → バックエンドで解除）を成立させるため Task 1 を先に完了**させる。この Issue は変更ファイルが少なく同リポジトリ内の競合リスクが小さいので、**実装は逐次（サブエージェント分割不要）**を推奨する。
> バックエンドとフロントは**別リポジトリ**。コミットはリポジトリごとに分ける。

---

## Task 0: ブランチ準備

**Objective:** フロント / バックエンドそれぞれで作業ブランチを用意する。

**Step 1:** バックエンド（`light_token_server`）は `main` から作業ブランチを切る。

```bash
cd ../light_token_server
git checkout main && git pull --ff-only origin main
git checkout -b feature/progress-null/44
# Expected: Switched to a new branch 'feature/progress-null/44'
```

> この Issue のバックエンド変更は `update_event` の `progress` 判定 1 行のみで、先行 Issue #41（`/milestone/closed`）は既に `main` に merge 済み（`git log` で `8174cb8` 存在を確認）。`origin/main` から分岐して問題ない。

**Step 2:** フロント（`time-table-to-line`）は現在の HEAD（`feature/milestone-events/41`）から作業ブランチを切る。

```bash
git checkout -b feature/issue-44-fixes/44
git branch --show-current        # Expected: feature/issue-44-fixes/44
```

---

## Task 1: バックエンド — `progress` を明示的 null で解除可能にする

**Objective:** `POST /event/update/{id}` の `progress` を `model_fields_set` 判別に変え、null 送信で DB の値を解除する（受入 2 のバックエンド側 / D1）。

**Files:**
- Modify: `light_token_server/app/routers/timetable.py:205-206`
- Modify: `light_token_server/tests/test_timetable.py`（末尾に追記）

**Step 1:** 失敗するテストを書く（TDD RED）。`tests/test_timetable.py` の末尾に追記。

```python
def test_event_update_progress_null_clears(client):
    # Issue #44 (受入 2): progress に一度値を入れた後、null で解除できるか。
    _login(client)
    client.get("/timetable/auth", follow_redirects=False)
    # 値を設定
    r = client.post("/event/update/1", json={"progress": "done"})
    assert r.status_code == 200
    assert r.json()["progress"] == "done"
    # null で解除
    r2 = client.post("/event/update/1", json={"progress": None})
    assert r2.status_code == 200
    assert r2.json()["progress"] is None
    # DB 反映を GET 側でも確認
    ev = client.get("/event/all", follow_redirects=False).json()[0]
    assert ev["progress"] is None
```

**Step 2:** バックエンドのテストを実行して失敗を確認する。

```bash
cd ../light_token_server && .venv/bin/python -m pytest tests/test_timetable.py::test_event_update_progress_null_clears -q
# Expected: FAIL（progress が null で更新されず "done" のまま）
```

**Step 3:** 実装する。`app/routers/timetable.py:205-206` を変更。

```python
    if body.summary is not None:
        target.summary = body.summary
    # Issue #44: progress も「送られたか(None でも)」で判別し、明示的 null で解除できるようにする
    # （milestone_id と同じパターン）。summary は「送られたら上書き」のままで良い。
    if "progress" in body.model_fields_set:
        target.progress = body.progress
```

**Step 4:** テストを再実行して通過を確認。

```bash
.venv/bin/python -m pytest tests/test_timetable.py::test_event_update_progress_null_clears -q
# Expected: PASS（1 passed）
# 続けて全体回帰:
.venv/bin/python -m pytest tests/test_timetable.py -q
# Expected: all passed
```

**Step 5:** コミット。

```bash
git add app/routers/timetable.py tests/test_timetable.py
git commit -m "fix(issue-44): progress を明示的 null で解除できるようにする"
```

---

## Task 2: フロント — 進捗 NativeSelect を未定(null)保存に変更

**Objective:** `AddChildForm` の進捗セレクトをオブジェクト `data` 化し、プレースホルダー（`''`）選択で未定（undefined）にし、更新時に `progress: null` を送る（受入 2 のフロント側 / D1 / D2）。あわせて `TimelineEventProps.progress` を null 許容へ拡張。

**Files:**
- Modify: `time-table-to-line/src/components/organisms/InputItem.tsx:116-124`
- Modify: `time-table-to-line/src/components/molecules/EventUpdateButton.tsx:18-22`
- Modify: `time-table-to-line/src/lib/TimelineType.ts:15-23`
- Modify: `time-table-to-line/src/tests/InputItem.spec.tsx`（進捗 null テスト追加）

**Step 1:** 失敗するテストを書く（TDD RED）。`src/tests/InputItem.spec.tsx` に `useEventMutation` のモックと新テストを追加。

ファイル冒頭の import 群へ追記:

```tsx
import { useUpdateEventMutation, useDeleteMutation } from '../hooks/useEventMutation';

vi.mock('../hooks/useEventMutation', () => ({
  useUpdateEventMutation: vi.fn(),
  useDeleteMutation: vi.fn(),
}));

const mockUpdateEvent = () => {
  const mutate = vi.fn();
  (useUpdateEventMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutate, isPending: false });
  return mutate;
};
const mockDeleteEvent = () => {
  (useDeleteMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutate: vi.fn(), isPending: false });
};
```

`myEvent` の直後に「進捗ありの自分のイベント」を定義し、`describe` 末尾にテスト追加:

```tsx
const myEventWithProgress: TimelineEventProps = { ...myEvent, progress: 'almost' };

describe('AddChildForm (edit mode: progress null reset)', () => {
  it('進捗をプレースホルダーに戻すと null を送信する（受入 2）', async () => {
    const mutate = mockUpdateEvent();
    mockDeleteEvent();
    renderWith(myEventWithProgress); // 自分のイベント（staff 1000 == auth 1000）
    const user = userEvent.setup();
    const progressSelect = screen.getAllByRole('combobox')[0];
    expect(progressSelect).toHaveValue('almost');
    // プレースホルダー（value=''）へ戻す
    fireEvent.change(progressSelect, { target: { value: '' } });
    expect(progressSelect).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '更新' }));
    const call = mutate.mock.calls[0][0] as { progress: unknown };
    expect(call.progress).toBeNull();
  });
});
```

**Step 2:** テストを実行して失敗を確認。

```bash
bunx vitest run src/tests/InputItem.spec.tsx
# Expected: FAIL（progress が null にならず '---進捗を選んでください---' などの文字列）
```

**Step 3:** 実装する。`src/components/organisms/InputItem.tsx:116-124` の進捗セレクトを変更（未定 = undefined）。

```tsx
      <section className={boundaryTop}>
        <Text>どんな感じ：</Text>
        <NativeSelect
          name="progress"
          value={eventItem.progress ?? ''}
          onChange={(e) => {
            const v = e.currentTarget.value;
            // Issue #44: ''（プレースホルダー）選択で未定（undefined）へ戻す。
            // 送信時（EventUpdateButtons）に ?? null で明示的 null に変換し、バックエンドで解除する。
            setEventItem({ ...eventItem, progress: v === '' ? undefined : v });
          }}
          data={[
            { value: '', label: '---進捗を選んでください---' },
            ...options,
          ]}
        />
      </section>
```

> `options`（`InputItem.tsx:26-31`）は既に `{ value, label }` 形なのでそのまま流用。汎用 `handleChange`（L39-43）は `summary` 用に残す。

加えて、送信ペイロードと型契約を整える。

`src/components/molecules/EventUpdateButton.tsx:18-22`（未定 undefined → 明示 null へ変換）:

```tsx
updateEvent.mutate({
      ...indicateEvent,
      summary: indicateEvent.summary,
      // Issue #44: 進捗「未定」は in-memory では undefined、送信時は明示的 null にして
      // バックエンド（model_fields_set 判別）で progress を解除させる。
      progress: indicateEvent.progress ?? null
    }, {
```

`src/lib/TimelineType.ts:15-23`（`TimelineEventProps.progress` を null 許容へ拡張）:

```ts
export type TimelineEventProps = Merge<NewTimelineItem, {
	title: React.ReactNode;
	start_time: Date;
	end_time: Date;
	isDraggable?: boolean;
	admin: boolean;
	progress?: string | null;  // Issue #44: 未定(null)を許容
	milestone_id?: number | null;
	completed?: boolean;
}>;
```

**Step 4:** テストを再実行して通過を確認。

```bash
bunx vitest run src/tests/InputItem.spec.tsx
# Expected: all passed（既存 5 件 + 新規 1 件）
```

**Step 5:** コミット。

```bash
git add src/components/organisms/InputItem.tsx src/tests/InputItem.spec.tsx
git commit -m "fix(issue-44): イベント進捗を null に戻せるようにする（'' → null 保存）"
```

---

## Task 3: フロント — マイルストーン作成フォームを再オープン時に空化

**Objective:** `MilestoneCreateDialog` に `useEffect` を追加し、`opened` が true になるたび 3 フィールドをリセットする（受入 1 / D3）。

**Files:**
- Modify: `time-table-to-line/src/components/organisms/MilestoneCreateDialog.tsx`
- Modify: `time-table-to-line/src/components/organisms/MilestoneCreateDialog.test.tsx`

**Step 1:** 失敗するテストを書く（TDD RED）。`MilestoneCreateDialog.test.tsx` に追記（`useState` を import に追加）。

```tsx
import { useState } from 'react';

it('再オープン時にフォームが空になる（受入 1）', async () => {
  const Wrapper = () => {
    const [opened, setOpened] = useState(false);
    return (
      <MantineProvider>
        <button onClick={() => setOpened(true)}>開く</button>
        <MilestoneCreateDialog opened={opened} onClose={() => setOpened(false)} />
      </MantineProvider>
    );
  };
  const user = userEvent.setup();
  render(<Wrapper />);
  // 1回目: 開いてタイトルを入力 → コミットで閉じる
  await user.click(screen.getByRole('button', { name: '開く' }));
  const titleInput = screen.getByPlaceholderText('マイルストーンのタイトルを入力');
  await user.type(titleInput, '前回のタイトル');
  mockMutate.mockImplementation((_v: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.());
  fireEvent.submit(titleInput.closest('form')!);
  await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  // 2回目: 再度開く → フォームが空
  await user.click(screen.getByRole('button', { name: '開く' }));
  expect(screen.getByPlaceholderText('マイルストーンのタイトルを入力')).toHaveValue('');
});
```

**Step 2:** テストを実行して失敗を確認。

```bash
bunx vitest run src/components/organisms/MilestoneCreateDialog.test.tsx
# Expected: FAIL（2 回目オープンで titleInput に '前回のタイトル' が残る）
```

**Step 3:** 実装する。`src/components/organisms/MilestoneCreateDialog.tsx` を変更。

```tsx
import { useState, useEffect } from 'react';
// ...
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [guidelineEndDate, setGuidelineEndDate] = useState<Date | null>(null);

  // Issue #44 (受入 1): 再オープン時に前回の内容が残らないよう、opened が true になったら空に戻す。
  useEffect(() => {
    if (opened) {
      setTitle('');
      setDescription('');
      setGuidelineEndDate(null);
    }
  }, [opened]);
```

**Step 4:** テストを再実行して通過を確認。

```bash
bunx vitest run src/components/organisms/MilestoneCreateDialog.test.tsx
# Expected: all passed（既存 5 件 + 新規 1 件）
```

**Step 5:** コミット。

```bash
git add src/components/organisms/MilestoneCreateDialog.tsx src/components/organisms/MilestoneCreateDialog.test.tsx
git commit -m "fix(issue-44): マイルストーン作成フォームを再オープン時に空にする"
```

---

## Task 4: フロント — イベント詳細閲覧を同グループメンバー全員へ緩和

**Objective:** `TimelinePage.handleItemClick` の「管理者 OR 自分のイベントのみ」ゲートを撤去し、非管理者も他メンバーのイベント詳細（閲覧専用）を開けるようにする（受入 3 / D4）。

**Files:**
- Modify: `time-table-to-line/src/components/pages/TimelinePage.tsx:59,126-134`

**Step 1:** 実装する（既存テストは旧ゲートを固定していないため、撤去自体は既存を壊さない。lint 確認を兼ねる）。

`TimelinePage.tsx:59`（`authId` は唯一の使用箇所だったため削除）:

```tsx
-  const authId = authInfo.type === 'auth' ? authInfo.authId : undefined;
```

`TimelinePage.tsx:126-134`:

```tsx
  // イベントクリックで詳細オーバーレイを開く（Issue #44: 同グループメンバーは全員閲覧可能。閲覧専用）
  const handleItemClick = (itemId: Id, e: React.SyntheticEvent, _time: number) => {
    const event = state.find((evt) => evt.id === itemId);
    if (!event) return;
    setSelectedEvent(event);
    setOverlayPos(computeOverlayPos(e, containerRef));
  };
```

> 詳細は常に `readOnly={true}`（L242）で表示され、`AddChildForm` が編集ボタンを自分のイベントのみに制御するため、**閲覧のみ**の緩和になる。`isAdmin`（L47）は `MilestoneAddButton` / `MilestoneClosedButton` 用に残す。

**Step 2:** lint / build で未使用変数が無いことを確認。

```bash
bun run lint
# Expected: 0 error / 0 warning（authId 削除で未使用エラー解消）
bun run build
# Expected: 0 errors（tsc が URL protocol/unused を拾わないこと）
```

**Step 3:** コミット。

```bash
git add src/components/pages/TimelinePage.tsx
git commit -m "feat(issue-44): 非管理者も同グループのイベント詳細（閲覧専用）を開けるようにする"
```

---

## Task 5: 品質ゲート（親が実行） + 記録

**Objective:** フロント / バックエンドの全ゲートを通し、ドキュメント不整合を残さない。

**Step 1:** フロントの品質ゲート一式。

```bash
bun run testrun   # Expected: all passed（新規 spec / test 含む）
bun run lint      # Expected: --max-warnings 0（0 error / 0 warning）
bun run build     # Expected: 0 errors（tsc + vite）
```

**Step 2:** バックエンドのゲート。

```bash
cd ../light_token_server && .venv/bin/python -m pytest -q
# Expected: all passed（test_timetable.py の新規 1 件を含む全体）
```

**Step 3:** 実ブラウザ確認（test-plan.md §3）をユーザーへ依頼し、指摘があれば本 Issue の該当タスクで修正。

**Step 4:** コミット済み状態で `git status --short` がクリーン（追跡対象ファイルに未コミット変更が無い）ことを確認。

```bash
cd ../time-table-to-line && git status --short
cd ../light_token_server && git status --short
```

> ドキュメント（README / overview / architecture / test-plan）は実装完了後に不整合が無いか見直し、あれば同じコミットで直す（要求 5）。