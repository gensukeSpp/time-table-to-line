# リファクタリング拡張計画: Task 7 以降の Phase 分割

> **For Hermes:** 各 Phase は独立したミッションとして実装する。Phase 内のタスクは 1 ファイルずつ進める。

**Goal:** Task 7（コンポーネント移動）完了後、残存するコード品質問題を段階的に解消し、バグ修正（タスク 8）と機能追加（タスク 9）にスムーズにつなげる。

**原則:** 「リファクタリング最優先」。各 Phase は (1) 安全に粒度を細かく区切り、(2) 毎 Phase 終了時に `bun run build && bun run lint && bun run testrun` で健全性を確認する。

**前提タスク:** Task 6（Theme.ts 削除 + console.log 全削除 + no-console 再有効化）と Task 7（コンポーネント移動）は完了済みとする。

**Tech Stack:** TypeScript 5.7, ESLint 9, Vanilla Extract, React 19, date-fns, @tanstack/react-query

---

## Phase A: コードベースクレンジング（即効・低リスク）

この Phase は安全に消せる未使用コード・不要コメントを一掃する。バグ修正に着手する前にノイズを減らす。

### A-1: 未使用ファイル App.tsx の確認と削除

**Objective:** クラスコンポーネント `App.tsx` がどこからも使われていないことを確認し削除する。

**Files:**
- Delete: `src/App.tsx`
- Delete: `src/App.css`

**参照確認:**
```bash
grep -rn "from.*['\"]\.\.\/App['\"]\|from.*['\"]\.\/App['\"]\|import.*App" src/ --include="*.{ts,tsx}"
```
Expected: `src/main.tsx` からのみ参照 → main.tsx は既に別のエントリーポイントを使っている（`./components` の `Index`）。

**削除コマンド:**
```bash
git rm src/App.tsx src/App.css
bun run build
```

**Commit:**
```bash
git commit -m "chore #260724: 未使用クラスコンポーネント App.tsx 削除"
```

---

### A-2: 未使用フック useMouseEvent（小文字）の整理

**Objective:** `useMouseHandle.ts` には `useMouseEvents`（本番）と `useMouseEvent`（未使用）の 2 つのフックが存在する。未使用の方を削除する。

**Files:**
- Modify: `src/hooks/useMouseHandle.ts`

**削除対象:** 59-81 行目（`useMouseEvent` フック全体）
**確認:**
```bash
grep -rn "useMouseEvent" src/ --include="*.{ts,tsx}"
```
Expected: `useMouseHandle.ts` の定義のみ（export されていても import 元がなければ削除）。

---

### A-3: 未使用の cache.js `cache` Map 変数削除

**Objective:** `src/resources/fetch.ts` の 38 行目 `const cache = new Map();` はコメントアウトされたコードからの残骸。削除する。

**Files:**
- Modify: `src/resources/fetch.ts`

**削除対象:** 37-38 行目（コメント + `const cache = new Map();`）

---

### A-4: TimelineType.ts の未使用型整理

**Objective:** コメントアウトされた型定義、未使用の型、デバッグ用定数を削除する。

**Files:**
- Modify: `src/lib/TimelineType.ts`

**削除対象:**
- 5 行目: コメントアウト `// type CustomEvent = ...`
- 42-51 行目: `PropertyToNumber`, `PickTypeId`, `NumberOfId`, `pickId`, `pickGroup`, `const x` — これらは TimelineItemBase の Id 型を number に変換しようとした試行錯誤の残骸
- 66 行目: `// 使ってません` の `PickDate` 型 — 使われている箇所を確認してから判断
- 67-68 行目: `export type PickDate` — 調べる
- 74 行目: `// inferって何？`
- 75-93 行目: `Option`, `ExpectedAuth`, `AuthGuardContext`, `const opt1`, `const opt2`, `ExpectedQuery`, `ExcludeQuery`, `const h`, `const i` — 実験的な型の残骸
- 17-41 行目: 大きなコメントブロック

**事前確認:**
```bash
grep -rn "PickDate\|AuthGuardContext\|ExcludeQuery\|ExpectedAuth\|PropertyToNumber\|NumberOfId\|pickId\|pickGroup" src/ --include="*.{ts,tsx}"
```

`PickDate` が使われている場合（例: `useEventMutation.ts` の `useUpdateDateMutation`）は型定義を残し、定数 `const x`, `const h`, `const i` のみ削除。

---

### A-5: コメントアウトコードの一斉削除（ノイズ低減）

**Objective:** 全ファイルに散らばる巨大なコメントアウトブロックを削除する。以下が主な対象:

| ファイル | 削除するコメントアウト行 |
|----------|------------------------|
| `src/lib/TimelineType.ts` | 17-41, 66, 74 |
| `src/lib/SampleState.ts` | 17, 22, 27-32, 42 |
| `src/lib/TmelineData.ts` | 7, 16, 24 |
| `src/hooks/useMouseHandle.ts` | 8, 12, 17, 26, 35, 40, 47, 53 |
| `src/hooks/useEventMutation.ts` | 8-12, 20-22, 35-38, 56, 82-85 |
| `src/hooks/useCallingForm.tsx` | 9 |
| `src/hooks/useAuthGuard.ts` | 14 |
| `src/resources/fetch.ts` | 4, 19-20, 49-51, 56 |
| `src/resources/cache.ts` | 5, 15 |
| `src/resources/queries.ts` | 37-43, 60-61, 97, 132-169 |
| `src/components/pages/CalendarComponent.tsx` | 38, 65, 89-90, 96, 98, 116, 133, 135, 161, 175, 189, 211, 215 |
| `src/components/pages/CalendarWrapperComponent.tsx` | 14 |
| `src/components/pages/TimelineComponent.tsx` | 25, 57 |
| `src/components/pages/AuthLeaveComponent.tsx` | 31 |
| `src/components/molecules/WrapComponent.tsx` | 8, 18, 23, 44, 54 |
| `src/components/molecules/TimeUpdateButtonComponent.tsx` | 20-21, 34 |
| `src/components/molecules/EventUpdateButtonComponent.tsx` | 13-16 |
| `src/components/organisms/Dialog.tsx` | —（特になし）|
| `src/components/organisms/DialogOnSlotComponent.tsx` | 15 |
| `src/components/organisms/InputItem.tsx` | 3, 5, 8, 35-36, 47-51, 56-57, 98-100 |
| `src/components/organisms/InputTitleDialog.tsx` | 17, 19, 31, 50 |
| `src/components/organisms/DaysComponent.tsx` | 6, 16-23, 64-75 |
| `src/components/templates/AuthParent.tsx` | 10-16, 30 |
| `src/components/templates/AxiosClientProvider.tsx` | 9, 27, 46, 53 |
| `src/components/templates/EventsParent.tsx` | 10, 23-32, 36, 39, 41, 44, 47, 49 |
| `src/components/templates/ViewComponents.tsx` | 22, 25 |
| `src/components/index.tsx` | 4 |

**重要:** これはファイル単位でコミットを分ける（後で git blame で追えるようにするため）。

---

## Phase B: ESLint 安全性回復（中リスク）

AGENTS.md に「ESLint は `--max-warnings 0`」とあるが、現在 4 つのルールが無効化されている。段階的に有効化する。

### B-1: `@typescript-eslint/no-unused-expressions` を 'warn' で再有効化

**Objective:** `no-unused-expressions` を 'warn' に戻して警告を出し、それを削除する。

**Files:**
- Modify: `eslint.config.js`
- Fix: 警告が出たファイル

**コマンド:**
```bash
bun run lint 2>&1 | grep -E "no-unused-expressions|@typescript-eslint/no-unused" | head -20
```

修正の方針:
- `CalendarComponent.tsx:42` などにある `[event];` のような式文 → 削除または変数代入に変更
- 空のカンマ式など → ロジックに応じて削除

無効化ルールを完全に消すのではなく、問題を修正した上で 'warn' に戻す。

**目標:** `no-unused-expressions: 'warn'` で 0 warning。

---

### B-2: `@typescript-eslint/no-unused-vars` を 'warn' で再有効化

**Objective:** 同様に unused-vars ルールを復活させる。React Props の分割代入で unused が発生する場合は `_` 接頭辞で許容する方針。

**Files:**
- Modify: `eslint.config.js`
- Fix: 警告が出たファイル

---

### B-3: `react-hooks/exhaustive-deps` を 'warn' で再有効化

**Objective:** `useEffect` / `useCallback` / `useMemo` の依存配列を正しくする。

**Files:**
- Modify: `eslint.config.js`
- Fix: 警告が出たファイル

修正の方針（AGENTS.md の「パフォーマンス低下を起こさない」に従う）:
- 依存配列が不足している場合は追加する
- 意図的に依存を外したい場合はコメント付き `// eslint-disable-next-line react-hooks/exhaustive-deps` で明示

**特に注意すべき箇所（既知の問題）:**
- `CalendarComponent.tsx:86` — `useEffect` の依存に `onTimeChangeEvents` と `eventList` がある。無限ループのリスクがあるため、`eventList` を依存から外す必要があるかもしれない（要確認）。
- `CalendarComponent.tsx:140` — `useEffect` の依存に `onSelectSlot`（useCallback の戻り値）と `slotInfoState` がある。これも循環更新の恐れあり。

---

### B-4: `no-console` を 'warn' で再有効化（Task 6-2 完了後）

**Objective:** 全 console.log 削除後に no-console ルールを 'warn' に戻す。

**Files:**
- Modify: `eslint.config.js`

**いったん 'warn' にして、完全 0 を目指す。**

---

## Phase C: クエリ層の重複排除（中リスク・パフォーマンス関連）

### C-1: 重複したクエリフックの統合

**Objective:** `queries.ts` で 3 つのクエリ（`useEventsQuery`, `useUserEventsQuery`, `useEventsQueryForTL`）がほぼ同じロジックを持っている。

**現在の差異:**
| フック名 | queryKey | fetchFn | data 加工 |
|---------|----------|---------|----------|
| `useEventsQuery` | `eventKeys.all()` | `fetchEventsData` | start/end を Date 化 |
| `useUserEventsQuery` | `eventKeys.user()` | `fetchEventsDataForTT` | start/end を Date 化 |
| `useEventsQueryForTL` | `eventKeys.all()` | `fetchEventsData` | start/end + start_time/end_time を Date 化 |

**Files:**
- Modify: `src/resources/queries.ts`
- Modify: 呼び出し元（変更があれば）

**方針:**
- `useEventsQueryForTL` と `useEventsQuery` は `queryKey` が同じ（`eventKeys.all()`）で `fetchFn` も同じ — **重複している**。
- 統合案: `useEventsQuery` に `forTimeline?: boolean` オプションを追加し、`start_time`/`end_time` の加工を切り替える。
- `useUserEventsQuery` は `fetchEventsDataForTT`（異なるエンドポイント）を使用するため独立して良い。

**リスク:** TanStack Query のキャッシュキーが同じ場合、1 つのクエリ結果が両方に使われる挙動になる。重複クエリは UI の不要な再レンダリングを引き起こす可能性がある。削除することでパフォーマンスが改善する。

---

## Phase D: 型安全性向上（高リスク・慎重に）

### D-1: eslint.config.js のルールを段階的に 'error' に引き上げる

Phase B で 'warn' に戻したルールを 1 つずつ 'error' にして `--max-warnings 0` と整合させる。

**Files:**
- Modify: `eslint.config.js`

**手順:**
1. `no-console: 'warn'` → `no-console: 'error'`（0 件確認後に）
2. `no-unused-vars: 'warn'` → `error`
3. `no-unused-expressions: 'warn'` → `error`
4. `react-hooks/exhaustive-deps: 'warn'` → `error`

**各ステップで:**
```bash
bun run lint
# 0 errors, 0 warnings を確認してから次のルールへ
```

---

### D-2: fetch.ts の共通ヘッダー抽出

**Objective:** `fetch.ts` の 5 つの関数すべてに同一のヘッダーオブジェクトが重複している。Axios インターセプターで一元化できる部分は AxiosClientProvider に寄せる。

**Files:**
- Modify: `src/resources/fetch.ts`（重複削除）
- Modify: `src/components/templates/AxiosClientProvider.tsx`（共通化）

**方針:**
- `Authorization: Bearer ${postToken}` はインターセプターで既に付与されている（AxiosClientProvider.tsx 19-30 行目）。各 fetch 関数から削除できる。
- 残る `Access-Control-Allow-Origin: '*'` と `credentials: 'include'` は `basicAxios` のデフォルト設定として `AuthInfo.ts` に移せる。

**Files:**
- Modify: `src/lib/AuthInfo.ts`（default headers に追加）

---

### D-3: イベント作成の型安全性向上（InputTitleDialog.tsx）

**Objective:** `InputTitleDialog.tsx` の `createEvent.mutate` に渡すオブジェクトが `start: Date` / `end: Date` を持っていない（`start_time` / `end_time` のみ）。react-big-calendar が期待するプロパティが不足している可能性あり。この不備は 11PM 問題とも関連する可能性がある。

**Files:**
- Modify: `src/components/organisms/InputTitleDialog.tsx`

**現状:**
```typescript
createEvent.mutate({
  id: Number(eventsState.slice(-1)[0].id) + 1,
  group: authInfo.code,
  staff_id: authInfo.authId,
  title: title,
  start_time: new Date(startDT),
  end_time: new Date(endDT)
  // start と end が欠落！
});
```

**修正後:**
```typescript
createEvent.mutate({
  id: Number(eventsState.slice(-1)[0].id) + 1,
  group: authInfo.code,
  staff_id: authInfo.authId,
  title: title,
  start_time: new Date(startDT),
  end_time: new Date(endDT),
  start: new Date(startDT),
  end: new Date(endDT)
});
```

---

## Phase E: バグ修正準備（タスク 8 への橋渡し）

### E-1: 11PM 問題の根本原因調査 + 応急処置

**Objective:** PM 11:00 にイベントが追加できない問題の原因を特定し、修正する。

**現状の分析:**
- `CalendarComponent.tsx` の `allowAllDay`（142-147 行目）が常に `true` を返す
- これが `allDayAccessor` に設定されると、午後 11 時（23:00）のイベントが allDay 扱いになる可能性が高い（react-big-calendar が「日付をまたぐ」と判断するため）

**Files:**
- Modify: `src/components/pages/CalendarComponent.tsx`

**修正方針:**
```typescript
// 現状（常に true）
const allowAllDay = (event: TimelineEventProps) => {
  setAllDayEvent(event);
  return true;
}

// 修正案（allDayAccessor 自体を削除するか、適切な条件に）
// <DnDCalendar ... allDayAccessor={allowAllDay} />
// → コメントアウトされている（183 行目）。外す必要はない。
```

**確認:** 183 行目の `// allDayAccessor={allowAllDay}` は既にコメントアウトされている。この問題は別の原因かもしれない。以下を調査:
1. `onSelectSlot` → `onSlotInfo` → `DialogOnSlot` → `TitleInput` の流れで、`slotInfo.start` が 23:00 のとき何が起きているか
2. `react-big-calendar` の `onSelectSlot` が返す `SlotInfo` の正確な値

---

### E-2: タイムライン重なり表示調査

**Objective:** タイムラインでのイベント重なり表示ができない問題の原因を調査する。

**調査項目:**
1. `react-calendar-timeline` にイベントの重なりを許可する設定（`stackItems` など）が存在するか
2. 現在 `TimelineComponent.tsx` で `canMove={false}`, `canResize={false}` に設定されているが、これが stack に影響するか
3. イベントデータの `start_time` / `end_time` が重なりを検出するために正しいフォーマットか

**Files（調査のみ）:**
- Read: `src/components/pages/TimelineComponent.tsx`
- Read: `src/lib/TmelineData.ts`（getItems のロジック）

---

### E-3: タイムゾーン問題の調査

**Objective:** DB 保存時刻が日本時間ではない問題の原因を調査する。

**調査項目:**
1. `fetch.ts` の各 fetch 関数が送受信する時刻のフォーマット
2. `queries.ts` の useMemo 内で `new Date(item.start ?? new Date())` としているが、これがタイムゾーンを正しく扱えているか
3. サーバー側の仕様（期待する時刻形式）

---

## Phase F: リファクタリング完了後の品質ゲート

### F-1: 最終的な lint: 0 errors, 0 warnings の達成

```bash
bun run lint
```

Expected: 0 errors, 0 warnings。

`--max-warnings 0` で通ることを確認。

### F-2: build 0 error の維持

```bash
bun run build
```

Expected: 0 errors。

### F-3: テスト全 PASS

```bash
bun run testrun
```

Expected: 全 PASS。

---

## テスト / 検証一覧

| Phase | 確認項目 | 方法 | 期待結果 |
|-------|---------|------|---------|
| A | 未使用ファイル削除後 build | `bun run build` | 0 errors |
| A | 未使用フック参照なし | `grep -rn "useMouseEvent" src/` | 定義行のみ |
| B | no-unused-expressions | `bun run lint` | 0 warnings |
| B | no-unused-vars | `bun run lint` | 0 warnings |
| B | exhaustive-deps | `bun run lint` | 0 warnings |
| B | no-console | `bun run lint` | 0 warnings |
| D | 全ルール error | `bun run build && bun run lint` | 0 errors, 0 warnings |
| E | 各バグ調査結果 | ドキュメントとして残す | 原因特定と次のアクション |
| F | 最終品質ゲート | `bun run build && bun run lint && bun run testrun` | 全 PASS |

---

## リスク・トレードオフ・未解決の質問

1. **exhaustive-deps の再有効化リスク**: `CalendarComponent.tsx` で依存配列が不完全な `useEffect` / `useCallback` が複数存在する。修正時に無限ループが発生する可能性がある。1 箇所ずつ丁寧に確認しながら進める。

2. **queries.ts の統合リスク**: TanStack Query のキャッシュキーが重複している場合、1 つのクエリ結果が他のクエリにも影響する。現在 `useEventsQuery` と `useEventsQueryForTL` が同じ `eventKeys.all()` を使っているが、実際に両方のコンポーネントが同時にマウントされることはない（Tabs で切り替わる）ため、パフォーマンス上の問題は限定的。統合は安全だが、誤ったキャッシュ無効化を避けるため、統合後のテストが重要。

3. **console.log 削除とデバッグ可用性**: `useEventMutation.ts` の console.log は本番環境のエラー追跡に使われる可能性がある。削除前に各ログの目的を確認する。特に `onError` / `onSettled` 内のログはエラーハンドリングの代替として機能している可能性がある。

4. **TypeScript の型削除リスク**: `TimelineType.ts` の未使用型削除で、`PickDate` が `useEventMutation.ts:99` の `useUpdateDateMutation` で使われている可能性がある。削除前に必ず grep で参照を確認する。

5. **各 Phase の優先順位**: Phase A は最優先（即効、低リスク）。Phase B は中優先（ESLint 品質ゲートの回復）。Phase C-E はバグ修正への事前準備として、タスク 8 と並行しても良い。Phase F は全 Phase 終了後。

6. **Storybook / テストコードのメンテナンス**: 各 Phase でコンポーネントのインターフェースが変わった場合、`src/stories/` の Storybook ファイルと `src/tests/` のテストファイルも更新が必要。特に統合テスト（`Calendar.spec.tsx`, `Timeline.spec.tsx`）に注意。