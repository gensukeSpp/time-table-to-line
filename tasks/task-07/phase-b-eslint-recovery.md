# Phase B: ESLint 安全性回復

> **実行方式:** 対話（手動）。各サブルールを 1 つずつ 'warn' に戻し、警告を潰してから次のルールへ進む。
> **リスク:** 中。`react-hooks/exhaustive-deps` の再有効化で無限ループが発生するリスクあり。
> **所要時間:** ルールあたり 5〜15 分、合計 30〜60 分

## 開始状態

```bash
bun run lint
```
Expected: 0 errors, 0 warnings（Task 6 完了後）。

eslint.config.js で現在無効化されているルール:
- `'no-console': 'off'`
- `'@typescript-eslint/no-unused-vars': 'off'`
- `'@typescript-eslint/no-unused-expressions': 'off'`
- `'react-hooks/exhaustive-deps': 'off'`

---

## B-1: `no-unused-expressions` を 'warn' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'@typescript-eslint/no-unused-expressions': 'off',
```
→
```typescript
'@typescript-eslint/no-unused-expressions': 'warn',
```

**予想される警告箇所（事前確認）:**
```bash
bun run lint 2>&1 | grep -E "no-unused-expressions"
```

**典型的な修正パターン:**
```typescript
// 修正前（無意味な式文）
[event];  // CalendarComponent.tsx など
onSelectSlot?.(slotInfoState!);

// 修正後
void onSelectSlot?.(slotInfoState!);
// または変数代入
const _unused = [event];
```

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: no-unused-expressions を warn に戻し修正"
```

---

## B-2: `no-unused-vars` を 'warn' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'@typescript-eslint/no-unused-vars': 'off',
```
→
```typescript
'@typescript-eslint/no-unused-vars': 'warn',
```

**修正方針:**
- 使われていない import → 削除
- 使われていない変数 → 削除
- どうしても必要な unused 変数には `_` 接頭辞（例: `_unused`）
- React Props の分割代入で unused → `{ usedProp, _unusedProp }` の形で許容

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: no-unused-vars を warn に戻し修正"
```

---

## B-3: `react-hooks/exhaustive-deps` を 'warn' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'react-hooks/exhaustive-deps': 'off',
```
→
```typescript
'react-hooks/exhaustive-deps': 'warn',
```

### 既知の要注意箇所

**CalendarComponent.tsx の 3 つの useEffect/useCallback:**
1. **86 行目:** `useEffect` → `onTimeChangeEvents` + `eventList` が依存配列に。`eventList` は `useMouseEvents` の戻り値で、DnD 操作のたびに新しい参照になる。依存に追加すると無限ループの可能性あり。**対応:** `onTimeChangeEvents` のみ依存に残し、`eventList` は意図的に外す理由をコメントに書いて `// eslint-disable-next-line react-hooks/exhaustive-deps` で明示的に許容する。

2. **140 行目:** `useEffect` → `onSelectSlot`（useCallback の戻り値）+ `slotInfoState` が依存に。同様に `slotInfoState` が `onSelectSlot` 内で更新される可能性があり循環参照に注意。**対応:** `onSlotInfo` のみ依存に残すか、設計を見直す。

3. **33 行目:** `useCallback` の `onEventResize` → 依存配列が空 `[]`。`prevRef` へのアクセスがあるが、ref は安定した参照なので `[]` で問題ない。ただし `TimelineEventProps` の型に依存する処理はないため、空配列は意図的であることをコメントで明示。

**TimelineComponent.tsx の useEffect:**
- **31 行目:** `useEffect` → 依存配列が空 `[]`。`containerRef` へのアクセスがあるが、ref は安定しているので `[]` で正しい。

### 修正パターン

```typescript
// パターン 1: 依存配列を正しく更新する
useEffect(() => {
  doSomething(value);
}, [value]);  // value を追加

// パターン 2: 意図的に依存を外す（コメントで理由を明示）
useEffect(() => {
  doSomething(value);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // value の変更で再実行したくない
```

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: exhaustive-deps を warn に戻し依存配列を修正"
```

---

## B-4: `no-console` を 'warn' に（Task 6-2 完了後）

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'no-console': 'off',
```
→
```typescript
'no-console': 'warn',
```

**事前確認（console.log 0 件であること）:**
```bash
grep -rn "console\.\(log\|warn\|error\|info\)" src/ --include="*.{ts,tsx}" | grep -v "node_modules" | grep -v "\.git" || echo "0 console.* calls found"
```
Expected: テストファイル以外 0 件（Task 6-2 で全削除済み）。

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: no-console を warn に戻す"
```

## B-5: 全ルール warn 状態での最終確認

```bash
bun run build && bun run lint
```
Expected: build 0 error, lint 0 error 0 warning。

```bash
git add eslint.config.js
git commit -m "chore: eslint.config.js 全ルール状態を整理"
```

## リスクメモ

- **exhaustive-deps** が最もリスクが高い。修正後に `bun run dev` で開発サーバーを起動し、カレンダー操作とタイムライン表示で無限ループ（タブが固まる・ログが flood する）が発生しないことを目視確認する。