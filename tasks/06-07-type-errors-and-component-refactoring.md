# Task 6・7 実装計画: TypeScript 型エラー修正 + コンポーネントリファクタリング

> **For Hermes:** 各タスクは 1 ファイルずつ進める。Task 7 はファイル移動が発生するため git mv を使用。

**Goal:** 残存する TypeScript エラーを全て解消し、コンポーネント構成を Atomic Design に則って整理する。

**Architecture:**
- **Task 6**: 未使用ファイル `Theme.ts` を削除し、`console.log` を片付けて `no-console` ルールを再 activete する。他に型エラーがなければ build 0 error を達成。
- **Task 7**: コンポーネントを molecules / organisms / pages / templates の適切なディレクトリに配置し直す。CSS ファイルはコンポーネント横置きを維持。

**Tech Stack:** TypeScript 5.7, ESLint 9, Vanilla Extract, React 19

---

## 事前確認: 現状分析

### 現在の build エラー（1 件）

| ファイル | エラー | 原因 |
|----------|--------|------|
| `src/lib/Theme.ts:2` | Cannot find module '@emotion/react' | 未使用の Chakra UI テーマファイル。`@emotion/react` はインストールされていない |

### console.log の残存状況
- `no-console` ルールは現在 `'off'`（Task 1 で一時的に無効化）
- ソースコード内に **約 50 件** の console.log が残存
- コメントアウトされた console.log も多数あり（削除予定）

### コンポーネント構成の現状と問題点

```
src/components/
├── molecules/        # 小さな再利用コンポーネント
│   ├── EventUpdateButtonComponent.tsx    ✅ 正しい
│   ├── TimeUpdateButtonComponent.tsx     ✅ 正しい
│   ├── TimeUpdateButtonComponent.css.ts  ✅ 横置き
│   └── WrapComponent.tsx                 ✅ 正しい（カスタムイベントラッパー）
├── organisms/        # 複合コンポーネント
│   ├── DaysComponent.tsx                 ⚠️ カスタムカレンダービュー → pages/ に移動
│   ├── Dialog.tsx                        ⚠️ 汎用ダイアログ → molecules/ に移動
│   ├── Dialog.css.ts / dialog.module.css ⚠️ Dialog に同伴
│   ├── DialogOnSlotComponent.tsx         ✅ 正しい（Dialog のラッパー）
│   ├── InputItem.tsx / InputItem.css.ts  ✅ 正しい（複合フォーム）
│   └── InputTitleDialog.tsx              ✅ 正しい（タイトル入力フォーム）
├── pages/            # ページコンポーネント
│   ├── AuthLeaveComponent.tsx            ✅ 正しい
│   ├── CalendarComponent.tsx             ✅ 正しい
│   ├── CalendarComponent.css.ts          ✅ 横置き
│   ├── CalendarWrapperComponent.tsx      ✅ 正しい
│   ├── CalendarComponentWrapper.css.ts   ⚠️ ファイル名が不統一
│   └── TimelineComponent.tsx             ✅ 正しい
└── templates/        # レイアウト・プロバイダー
    ├── AuthParent.tsx                    ✅ 正しい
    ├── AxiosClientProvider.tsx           ✅ 正しい
    ├── EventsParent.tsx                  ✅ 正しい
    └── ViewComponents.tsx                ✅ 正しい
```

---

## 実装タスク: Task 6

### Task 6-1: Theme.ts 削除（未使用ファイル）

**Objective:** 未使用の `Theme.ts` を削除し、最後の build エラーを解消する。

**Files:**
- Delete: `src/lib/Theme.ts`

**Step 1: 削除**

```bash
git rm src/lib/Theme.ts
```

**Step 2: ビルド確認**

```bash
bun run build
```

Expected: 0 errors。

**Step 3: 削除前に影響範囲を確認**

`Theme.ts` のエクスポート (`customTheme`) がどこからも import されていないことを確認する。

```bash
grep -rn "customTheme\|Theme.ts" src/ --include="*.{ts,tsx}" || echo "No references found"
```

**Step 4: Commit**

```bash
git commit -m "feat #260724: 未使用ファイル Theme.ts 削除"
```

---

### Task 6-2: ESLint no-console ルールを有効化 + 全 console.log 削除

**Objective:** `no-console: 'warn'` を再 activete し、全ての console.log を削除して lint が通る状態にする。

**Files:**
- Modify: `eslint.config.js`（no-console を 'warn' に戻す）
- Modify: 約 12 ファイルの console.log 削除

**Step 1: eslint.config.js の no-console を 'warn' に戻す**

```typescript
'no-console': 'warn',
```

**Step 2: 全 console.log の洗い出しと削除**

削除対象のファイルと行数:

| ファイル | 削除する console.log |
|----------|---------------------|
| `src/resources/fetch.ts` | 7 行（17, 33, 53, 78, 91） |
| `src/hooks/useTimelineDragZoom.ts` | 2 行（32, 55） |
| `src/hooks/useMouseHandle.ts` | 6 行（31, 52, 70, 77） |
| `src/hooks/useCallingForm.tsx` | 1 行（27） |
| `src/hooks/useEventMutation.ts` | 6 行（40, 57, 87, 88, 109, 110） |
| `src/hooks/useDialog.tsx` | 1 行（20） |
| `src/components/pages/AuthLeaveComponent.tsx` | 2 行（14, 15） |
| `src/components/pages/CalendarComponent.tsx` | 13 行（30, 33, 66, 68, 80, 92, 100, 106, 111, 131, 146, 210） |
| `src/components/pages/TimelineComponent.tsx` | 4 行（21, 55, 56, 100） |
| `src/components/molecules/TimeUpdateButtonComponent.tsx` | 4 行（10, 23, 29, 36） |
| `src/components/molecules/EventUpdateButtonComponent.tsx` | 1 行（22） |
| `src/components/molecules/WrapComponent.tsx` | 1 行（17） |
| `src/components/organisms/Dialog.tsx` | 2 行（35, 43） |
| `src/components/organisms/DialogOnSlotComponent.tsx` | 1 行（17） |
| `src/components/organisms/InputItem.tsx` | 2 行（38, 43） |
| `src/components/organisms/InputTitleDialog.tsx` | 1 行（38） |
| `src/components/organisms/DaysComponent.tsx` | 1 行（57） |
| `src/components/templates/AuthParent.tsx` | 1 行（18） |
| `src/components/templates/AxiosClientProvider.tsx` | 7 行（11, 15, 22, 25, 29, 40, 49） |

**コメントアウトされた console.log（削除のみ）:**
- `src/resources/fetch.ts:19-20`
- `src/lib/TmelineData.ts:16, 24`
- `src/hooks/useAuthGuard.ts:14`
- `src/components/pages/CalendarComponent.tsx:38, 65, 98`
- `src/components/molecules/WrapComponent.tsx:23, 44`
- `src/components/molecules/TimeUpdateButtonComponent.tsx:34`
- `src/components/organisms/InputTitleDialog.tsx:31`
- `src/tests/Calendar.spec.tsx:28, 105`（テストファイルのコメントアウトは残す）

**テストファイルの console.log は例外として残す:**
- `src/tests/Calendar.spec.tsx:145` — `console.log(eventTitles)` はテストデバッグ用で有用

**Step 3: lint 確認**

```bash
bun run lint
```

Expected: 0 errors, 0 warnings。

**Step 4: コミット（分割推奨）**

ファイル数が多いため、ディレクトリごとに分割コミットする:

```bash
git add src/resources/fetch.ts src/lib/TmelineData.ts
git commit -m "chore #260724: console.log 削除（resources/lib）"

git add src/hooks/
git commit -m "chore #260724: console.log 削除（hooks）"

git add src/components/pages/ src/components/molecules/ src/components/organisms/ src/components/templates/
git commit -m "chore #260724: console.log 削除（components）"
```

---

### Task 6-3: 最終確認（Task 6）

**Objective:** build 0 error + lint 0 warning を確認する。

**Step 1: build 確認**

```bash
bun run build
```

Expected: 0 errors。

**Step 2: lint 確認**

```bash
bun run lint
```

Expected: 0 errors, 0 warnings。

**Step 3: テスト確認**

```bash
bun run testrun
```

Expected: 既存テストが引き続き PASS。

---

## 実装タスク: Task 7

### Task 7-1: molecules/Dialog.tsx 移動（organisms → molecules）

**Objective:** 汎用 `<dialog>` コンポーネントを molecules に移動する。

**Files:**
- Move: `src/components/organisms/Dialog.tsx` → `src/components/molecules/Dialog.tsx`
- Move: `src/components/organisms/Dialog.css.ts` → `src/components/molecules/Dialog.css.ts`
- Move: `src/components/organisms/dialog.module.css` → `src/components/molecules/dialog.module.css`
- Modify: 全ての import パスを修正

**Step 1: ファイル移動**

```bash
git mv src/components/organisms/Dialog.tsx src/components/molecules/Dialog.tsx
git mv src/components/organisms/Dialog.css.ts src/components/molecules/Dialog.css.ts
git mv src/components/organisms/dialog.module.css src/components/molecules/dialog.module.css
```

**Step 2: import パス修正**

影響を受けるファイル:
- `src/hooks/useDialog.tsx` — `"../components/organisms/Dialog"` → `"../components/molecules/Dialog"`
- `src/components/organisms/DialogOnSlotComponent.tsx` — `"./Dialog"` → `"../molecules/Dialog"`

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: 0 errors。

**Step 4: Commit**

```bash
git commit -m "refactor #260724: Dialog を molecules に移動"
```

---

### Task 7-2: molecules/DaysComponent.tsx 移動（organisms → pages）

**Objective:** カスタムカレンダービュー `MyWeek` を pages に移動する。

**Files:**
- Move: `src/components/organisms/DaysComponent.tsx` → `src/components/pages/DaysComponent.tsx`

**Step 1: ファイル移動**

```bash
git mv src/components/organisms/DaysComponent.tsx src/components/pages/DaysComponent.tsx
```

**Step 2: import パス修正**

影響を受けるファイルを確認する:

```bash
grep -rn "DaysComponent\|organisms/Days" src/ --include="*.{ts,tsx}"
```

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: 0 errors。

**Step 4: Commit**

```bash
git commit -m "refactor #260724: DaysComponent を pages に移動"
```

---

### Task 7-3: CalendarComponentWrapper.css.ts ファイル名統一

**Objective:** `CalendarComponentWrapper.css.ts` を命名規則に合わせてリネームする。

**Files:**
- Move: `src/components/pages/CalendarComponentWrapper.css.ts` → `src/components/pages/CalendarWrapperComponent.css.ts`

**Step 1: ファイル移動**

```bash
git mv src/components/pages/CalendarComponentWrapper.css.ts src/components/pages/CalendarWrapperComponent.css.ts
```

**Step 2: import パス修正**

```bash
grep -rn "CalendarComponentWrapper" src/ --include="*.{ts,tsx}"
```

`CalendarWrapperComponent.tsx` 内の import を修正:
```typescript
import { tabMenu, tabButton } from './CalendarComponentWrapper.css';
```
→
```typescript
import { tabMenu, tabButton } from './CalendarWrapperComponent.css';
```

**Step 3: ビルド確認**

```bash
bun run build
```

**Step 4: Commit**

```bash
git commit -m "refactor #260724: CalendarWrapperComponent.css.ts ファイル名統一"
```

---

### Task 7-4: コンポーネント名の簡略化（Bonus）

**Objective:** 冗長なコンポーネント名を簡略化する（`Component` 接尾辞の削除等）。

**提案変更:**

| 現在のファイル名 | 変更後 | 理由 |
|-----------------|--------|------|
| `EventUpdateButtonComponent.tsx` | `EventUpdateButton.tsx` | `Component` 接尾辞は冗長 |
| `TimeUpdateButtonComponent.tsx` | `TimeUpdateButton.tsx` | 同上 |
| `DialogOnSlotComponent.tsx` | `DialogOnSlot.tsx` | 同上 |
| `InputTitleDialog.tsx` | `InputTitleDialog.tsx` | 変更なし（適切な長さ） |
| `CalendarWrapperComponent.tsx` | `CalendarPage.tsx` | ページコンポーネントであることを明示 |
| `AuthLeaveComponent.tsx` | `AuthPage.tsx` | 同上 |
| `CalendarComponent.tsx` | `CalendarView.tsx` | カレンダービューであることを明示 |
| `TimelineComponent.tsx` | `TimelinePage.tsx` | ページコンポーネントであることを明示 |

**注意:** このタスクは影響範囲が大きい（全ファイルの import パス修正が必要）。**議論が必要なため、このタスクは提案のみとし、実行は別途決定する。**

---

### Task 7-5: 最終確認（Task 7）

**Objective:** 全移動後、lint + build + test が通ることを確認する。

**Step 1: lint 実行**

```bash
bun run lint
```

Expected: 0 errors, 0 warnings。

**Step 2: build 確認**

```bash
bun run build
```

Expected: 0 errors。

**Step 3: テスト実行**

```bash
bun run testrun
```

Expected: 全テスト PASS。

---

## テスト / 検証

| 確認項目 | 方法 | 期待結果 |
|---|---|---|
| build 0 error | `bun run build` | 0 errors |
| lint 0 warning | `bun run lint` | 0 errors, 0 warnings |
| 全テスト PASS | `bun run testrun` | 全 PASS |
| console.log 残存 | `grep -rn "console.log" src/ --include="*.{ts,tsx}"` | テストファイルのみ |
| Theme.ts 参照 | `grep -rn "Theme.ts\|customTheme" src/` | 空 |
| ファイル移動後 import | `bun run build` が通ること | 全ての import パスが正しい |

## リスク・トレードオフ・未解決の質問

1. **console.log 削除のリスク**: 一部の `console.log` はデバッグ用途で意図的に残されている可能性がある。削除前に内容を確認する。特に `AxiosClientProvider.tsx` のログは認証デバッグに使われている可能性が高い。

2. **コンポーネント名変更の影響範囲**: Task 7-4 のコンポーネント名変更は、`src/` 全体の import パス修正が必要。Storybook のストーリーファイルやテストファイルも影響を受ける。このタスクは別途ユーザーとの合意が必要。

3. **Dialog 移動時の import パス**: `useDialog.tsx` の相対パスが変わるため、`hooks/` からの相対パスが `../components/organisms/Dialog` から `../components/molecules/Dialog` に変わる。正しく修正しないと build エラーになる。

4. **DaysComponent の位置付け**: `DaysComponent.tsx` は `MyWeek` というカスタムカレンダービューを定義している。`react-big-calendar` のプラグイン的な位置付けであり、`organisms/` でも `pages/` でもない可能性がある。`templates/` または `lib/` が適切かもしれない。

5. **console.log 削除の優先順位**: まず `no-console: 'off'` のまま `Theme.ts` を削除して build 0 error を達成し、その後に console.log 削除を別途行う、という2段階のアプローチが安全。console.log 削除で予期せぬ問題が発生した場合も、build 0 error を達成した状態をコミットとして残せる。

---

## 拡張リファクタリング計画（Task 7 後）

Task 7（コンポーネント移動）完了後、以下の 6 つの Phase でリファクタリングを継続する。
詳細は `tasks/task-07/` 以下の各ファイルを参照。

| Phase | 内容 | 実行方式 | ファイル |
|-------|------|---------|---------|
| **A** | コードベースクレンジング | subagent 並列 | [`tasks/task-07/phase-a-codebase-cleansing.md`](./task-07/phase-a-codebase-cleansing.md) |
| **B** | ESLint 安全性回復 | 対話 | [`tasks/task-07/phase-b-eslint-recovery.md`](./task-07/phase-b-eslint-recovery.md) |
| **C** | クエリ統合 | subagent | [`tasks/task-07/phase-c-query-consolidation.md`](./task-07/phase-c-query-consolidation.md) |
| **D** | 型安全性向上 | 対話 | [`tasks/task-07/phase-d-type-safety.md`](./task-07/phase-d-type-safety.md) |
| **E** | バグ調査（タスク 8 準備） | subagent 並列 | [`tasks/task-07/phase-e-bug-investigation.md`](./task-07/phase-e-bug-investigation.md) |
| **F** | 品質ゲート | 確認 | [`tasks/task-07/phase-f-quality-gate.md`](./task-07/phase-f-quality-gate.md) |

**戦略文書:** `.hermes/plans/2026-07-28_215000-post-task7-refactoring-phases.md`
**Phase 間の依存関係:** [`tasks/task-07/README.md`](./task-07/README.md) の実行順序図を参照。