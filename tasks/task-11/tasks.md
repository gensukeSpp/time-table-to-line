# 実装タスク — task-11: PR #21 の ts/tsx 限定部分的取り込み

> 各タスクの後に `bun run build` / `bun run lint` / `bun run testrun` を随時実行し、進捗を止めない。
> 実行順序は 1 → 6 の直列依存。サブエージェントに投げる場合は Task 1（認証 3 点セット）を先に完了させ、Task 2〜4 を並列に投げてよい（Task 5 は依存集合なのでその後）。
>
> **参照コード:** PR #21 マージ後の main ブランチの実ファイル。取得コマンド:
> ```bash
> gh api repos/{owner}/{repo}/contents/<path>?ref=main --jq .content | base64 -d
> ```
> 該当 9 ファイルは作業時に `/tmp/pr21-*` として取得済みの場合がある。main 版を「正」とし、本ブランチに無い要素（Milestone 関連等）は取り込まない。

## 想定契約（既存・変更なし）

- **admin 判定:** `/timetable/inquiry` のレスポンス（JWT クレーム由来）の `admin`。イベント側 `admin` フラグは使わない。
- **メンバー名:** `useGroupUsersQuery`（`/group/users` → `GroupUserProps[]`）で `staff_id` を引き、`family_kana` + `last_kana`。
- **`onItemClick`:** `react-calendar-timeline` が提供（`itemId, e, time`）。

---

## Task 1: 認証型の admin 伝播（3 点セット）

**Objective:** `AuthInfoProp` の auth 型に `admin` を通し、TimelinePage で管理者判定できるようにする。

**Files:**
- Modify: `src/lib/authPayload.ts`
- Modify: `src/hooks/useAuthGuard.ts`
- Modify: `src/lib/TimelineType.ts:30-32`（`AuthInfoProp`）

**Step 1:** `src/lib/authPayload.ts` — `InquiryStaff` に `admin: boolean;` を追加し、`normalizeAuthPayload` の return に `admin: Boolean(inner.admin ?? false),` を追加。

**Step 2:** `src/lib/TimelineType.ts` — auth 型を `{ type: 'auth'; authId: number; code: number; group: string; admin: boolean }` に変更。

**Step 3:** `src/hooks/useAuthGuard.ts` — auth 戻り値に `admin: payload.admin,` を追加。

**Step 4:** 型生成箇所の棚卸し

Run: `grep -rn "type: 'auth'" src/ --include='*.ts' --include='*.tsx'`
Expected: auth 型を生成している箇所すべてに `admin` が揃っていること（`useAuthGuard.ts` 以外にあれば修正）。`src/lib/SampleState.ts` の auth 型サンプルは要確認（Storybook 用なら `admin: false` を補う）。

**Step 5:** 検証

Run: `bun run build && bun run lint`
Expected: 0 error / 0 warning

**Step 6:** Commit

```bash
git add src/lib/authPayload.ts src/hooks/useAuthGuard.ts src/lib/TimelineType.ts
git commit -m "feat: AuthInfoProp に admin を伝播（PR#21 取り込み 前提）"
```

---

## Task 2: EventDetailOverlay コンポーネント（新規）

**Objective:** `AddChildForm` を絶対配置するオーバーレイ（外クリック / Escape close 付き）を追加する。

**Files:**
- Create: `src/components/organisms/EventDetailOverlay.css.ts`
- Create: `src/components/organisms/EventDetailOverlay.tsx`
- Test: `src/tests/EventDetailOverlay.spec.tsx`（新規）

**Step 1:** `.css.ts` を作成（`architecture.md` §3 のコードどおり。Vanilla Extract、absolute + zIndex 100 + shadow + 白背景）。

**Step 2:** `EventDetailOverlay.tsx` を作成（`architecture.md` §3 の全文どおり。main 最終形＝外クリック + Escape 対応済み）。ファイル末尾に改行を付ける。

**Step 3:** `src/tests/EventDetailOverlay.spec.tsx` を作成（PR #21 版の 3 ケースそのまま: 外クリックで閉じる / Escape で閉じる / 他キーでは閉じない）。

Run: `gh api repos/{owner}/{repo}/contents/src/tests/EventDetailOverlay.spec.tsx?ref=main --jq .content | base64 -d > src/tests/EventDetailOverlay.spec.tsx` をベースに、末尾改行のみ修正してよい。

**Step 4:** 検証

Run: `bun run testrun -- src/tests/EventDetailOverlay.spec.tsx`（または `bunx vitest run src/tests/EventDetailOverlay.spec.tsx`）
Expected: 3 passed

**Step 5:** Commit

```bash
git add src/components/organisms/EventDetailOverlay.tsx src/components/organisms/EventDetailOverlay.css.ts src/tests/EventDetailOverlay.spec.tsx
git commit -m "feat: タイムライン詳細オーバーレイを新規追加（PR#21 取り込み）"
```

---

## Task 3: AddChildForm の readOnly モード（InputItem.tsx）

**Objective:** `readOnly` プロップ（無条件に編集不可）とメンバー名表示を追加する。Calendar 側は `readOnly` 未指定のため挙動不変。

**Files:**
- Modify: `src/components/organisms/InputItem.tsx`
- Test: `src/tests/InputItem.spec.tsx`（新規）

**Step 1:** 失敗テストを書く。`src/tests/InputItem.spec.tsx` を PR #21 最終形（main 版）のまま作成する:

Run: `gh api repos/{owner}/{repo}/contents/src/tests/InputItem.spec.tsx?ref=main --jq .content | base64 -d > src/tests/InputItem.spec.tsx`

内容（最終形）:
- 管理者が他メンバーのイベントを `readOnly` で見るとメンバー名（`family_kana` + `last_kana`）・内容・進捗が表示され、更新 / 削除ボタン・警告ダイアログが出ない
- 自分のイベントも `readOnly` で開くと編集不可（更新 / 削除ボタンが出ない。`内容：` が見える）

Run: `bunx vitest run src/tests/InputItem.spec.tsx`
Expected: FAIL — `readOnly` プロップが未実装のため

**Step 2:** `InputItem.tsx` を main 最終形に合わせて修正（`architecture.md` §2 のとおり）:

- `useGroupUsersQuery` import 追加
- `InputEventProps` に `readOnly?: boolean`（main 版コメントどおり「無条件に編集不可」の旨を記載）
- 分割代入に `readOnly` を追加
- `isOwnEvent = authId === selectedEvent.staff_id`、`readOnlyMode = readOnly === true`
- メンバー名解決 3 行（`groupUsers?.data?.find(...)` → `memberName`）
- `readOnlyMode` のとき早期 return（閲覧専用 UI）
- 編集側の `authId === selectedEvent.staff_id` を `isOwnEvent` に置換

> コピペで正確に入れるなら main 版全文をベースに、本ブランチとの差分（tab/space 等の既存スタイル）を尊重しつつ読み替える。差分要素は上記 6 点のみ。

**Step 3:** 検証

Run: `bunx vitest run src/tests/InputItem.spec.tsx && bun run testrun`
Expected: 新規 2 passed、既存全 PASS（Calendar 側回帰なし）

**Step 4:** Commit

```bash
git add src/components/organisms/InputItem.tsx src/tests/InputItem.spec.tsx
git commit -m "feat: AddChildForm に readOnly（閲覧専用）モードを追加（PR#21 取り込み）"
```

---

## Task 4: TimelinePage への組み込み（onItemClick + オーバーレイ描画）

**Objective:** イベントクリックでオーバーレイを開く配線を追加する（管理者 OR 自分のイベントのみ）。

**Files:**
- Modify: `src/components/pages/TimelinePage.tsx`

**Step 1:** import 追加（`Id` / `useAuthInfo` / `TimelineEventProps` / `EventDetailOverlay`）

**Step 2:** `computeOverlayPos` をコンポーネント外（ファイル冒頭、export 前に追加

**Step 3:** コンポーネント内に `authInfo` / `isAdmin` / `authId` / `selectedEvent` / `overlayPos` を追加。既存の `authState` / `useAuthQuery` 呼び出しは維持（`useAuthInfo` が同じ query key を叩くので二重 fetch なし）。

**Step 4:** `handleItemClick` を追加（`architecture.md` §4 のコードどおり。`isAdmin || authId === event.staff_id` のみ開く）

**Step 5:** JSX 変更

- return を `<>...</>` フラグメントに包む
- コンテナ div に `style={{ position: 'relative' }}`
- `<Timeline>` に `onItemClick={handleItemClick}`
- `</div>` 後に `{selectedEvent && overlayPos && <EventDetailOverlay ... readOnly={true} ... />}`

**Step 6:** 検証

Run: `bun run build && bun run testrun && bun run lint`
Expected: build 0 error / testrun 全 PASS / lint 0 warning

**Step 7:** Commit

```bash
git add src/components/pages/TimelinePage.tsx
git commit -m "feat: タイムラインのイベントクリックで詳細オーバーレイを開く（PR#21 取り込み）"
```

---

## Task 5: 最終品質ゲート

**Objective:** 全ゲートを親で一括確認する。

**Step 1:** `bun run build` → 0 error
**Step 2:** `bun run lint` → 0 error / 0 warning
**Step 3:** `bun run testrun` → 全 PASS

**Step 4:** 取り込み漏れチェック

```bash
# PR #21 の src/ 配下 ts/tsx が本ブランチのスコープに全部入ったか確認
gh pr diff 21 --name-only | grep -E '\.(ts|tsx)$'
git log --oneline -5
```

Expected: ts/tsx 9 ファイルがすべて本計画の対象表（README）に含まれていること。`.gitignore` 以外の作業ツリー汚れがないこと。

**Step 5:** Commit（残分があれば）

```bash
git add -A && git commit -m "chore: task-11 PR#21 取り込み 最終調整"
```

---

## Task 6: 実ブラウザ確認（ユーザー実施）

**Objective:** 実機での挙動を受け入れ条件どおり確認する（`test-plan.md` 参照）。

1. 管理者で `/timeline` を開き、他メンバーのイベントをクリック → 閲覧専用モーダル（メンバー名・更新/削除ボタンなし）がイベント付近に重なって開く
2. 自分のイベントをクリック → 閲覧専用モーダル（編集は Calendar 側という仕様どおり更新/削除ボタンなし）
3. 一般ユーザーで他メンバーのイベントをクリック → 開かない
4. オーバーレイ外クリック / `Escape` で閉じる
5. Calendar 側の従来モーダル（自分のイベント編集）が従来どおり動く（`readOnly` 未指定の回帰確認）
