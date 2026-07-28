# Phase A: コードベースクレンジング

> **実行方式:** subagent 並列（A-1〜A-5 を同時に subagent に投げる）
> **リスク:** 低。削除して build が壊れたら `git checkout` で戻せる。
> **所要時間:** 各タスク 2〜5 分、合計 15 分程度

## A-1: 未使用ファイル App.tsx の削除

**Objective:** クラスコンポーネント `App.tsx`（と同伴の `App.css`）はエントリポイントとして使われていない。`main.tsx` は既に `./components` の `Index` を使用している。

**Files:**
- Delete: `src/App.tsx`
- Delete: `src/App.css`

**Step 1: 参照確認**
```bash
grep -rn "from.*['\"]\.\.\/App['\"]\|from.*['\"]\.\/App['\"]\|import.*App\b" src/ --include="*.{ts,tsx}"
```
Expected: `src/main.tsx:6:import { Index } from './components';` のみ（App は参照されていない）。

**Step 2: ファイル削除**
```bash
git rm src/App.tsx src/App.css
```

**Step 3: ビルド確認**
```bash
bun run build
```
Expected: 0 errors。

**Step 4: Commit**
```bash
git commit -m "chore: 未使用クラスコンポーネント App.tsx 削除"
```

---

## A-2: 未使用フック useMouseEvent の削除

**Objective:** `useMouseHandle.ts` には `useMouseEvents`（本番・CalendarComponent から使用）と `useMouseEvent`（未使用）の 2 つのフックが export されている。未使用の方を削除する。

**Files:**
- Modify: `src/hooks/useMouseHandle.ts`

**削除対象（59〜81 行目）:**
```typescript
const useMouseEvent = () => {
  const [eventDate, setEventDate] = useState<PickDate>({
    id: '',
    start: new Date(),
    end: new Date()
  });
  const onEventResize: withDragAndDropProps<TimelineEventProps>['onEventResize'] = data => {
    // ...
  };
  const onEventDrop: withDragAndDropProps<TimelineEventProps>['onEventDrop'] = data => {
    // ...
  };
  return {onEventResize, onEventDrop, eventDate};
};
```

**Step 1: 参照確認**
```bash
grep -rn "useMouseEvent" src/ --include="*.{ts,tsx}"
```
Expected: `src/hooks/useMouseHandle.ts` の定義行のみ（useMouseEvents は別物なので引っかからない）。もし他から import されていたら削除しない。

**Step 2: 該当行を削除（59 行目から 81 行目）**

**Step 3: ビルド確認**
```bash
bun run build
```
Expected: 0 errors。

**Step 4: Commit**
```bash
git commit -m "chore: 未使用フック useMouseEvent 削除"
```

---

## A-3: fetch.ts の未使用変数 cache 削除

**Objective:** `src/resources/fetch.ts` 37〜38 行目の `const cache = new Map();` は使われていないコードの残骸。

**Files:**
- Modify: `src/resources/fetch.ts`

**削除対象:**
```typescript
// とりあえず、値が取れるからこっち採用
const cache = new Map();
```

**Step 1: ビルド確認**
```bash
bun run build
```
Expected: 0 errors。

**Step 2: Commit**
```bash
git commit -m "chore: fetch.ts 未使用 cache Map 削除"
```

---

## A-4: TimelineType.ts 未使用型・デバッグ定数の整理

**Objective:** 型ファイルに残る試行錯誤の残骸（未使用型、デバッグ用の const 宣言）を削除する。`PickDate` のみ他の hook で使用されている可能性があるため、参照確認後に判断。

**Files:**
- Modify: `src/lib/TimelineType.ts`

**Step 1: 参照確認**
```bash
grep -rn "PickDate\|AuthGuardContext\|ExcludeQuery\|PropertyToNumber\|NumberOfId\|pickId\|pickGroup" src/ --include="*.{ts,tsx}"
```

**削除方針（grep 結果に応じて判断）:**

| 対象 | 行 | 条件 |
|------|----|------|
| コメントブロック `/** Before App type */` 〜 `*/` | 17-41 | 常に削除 |
| `PropertyToNumber` + `PickTypeId` + `NumberOfId` + `pickId` + `pickGroup` + `const x` | 43-50 | 常に削除 |
| `PickDate` + コメント `// 使ってません` | 66-67 | 他ファイルから参照があれば型定義のみ残す、なければ削除 |
| `// inferって何？` | 74 | 常に削除 |
| `Option` + `ExpectedAuth` + `AuthGuardContext` + `const opt1` `const opt2` | 75-87 | 常に削除 |
| `ExpectedQuery` + `ExcludeQuery` + `const h` `const i` | 89-92 | 常に削除 |

**Step 2: ビルド確認**
```bash
bun run build
```
Expected: 0 errors。

**Step 3: Commit**
```bash
git commit -m "chore: TimelineType.ts 未使用型とデバッグ定数を整理"
```

---

## A-5: コメントアウトコードの一括削除

**Objective:** 全ファイルに散在するコメントアウトされたコード（かつての実装の残骸）を削除する。ファイル数が多いため、ディレクトリごとに分割コミットする。

**Files:** 下記ファイルすべて

### ファイル一覧と削除パターン

| 番号 | ファイル | 削除対象（コメントアウトされたコード行） |
|------|---------|----------------------------------------|
| 1 | `src/lib/TimelineType.ts` | 行 5, 17-41, 66-67, 74, 75-93 |
| 2 | `src/lib/SampleState.ts` | 行 17, 22, 27-32, 42 |
| 3 | `src/lib/TmelineData.ts` | 行 7, 16, 24 |
| 4 | `src/hooks/useMouseHandle.ts` | 行 8, 12, 17, 26, 35, 40, 47, 53 |
| 5 | `src/hooks/useEventMutation.ts` | 行 8-12, 20-22, 35-38, 56, 82-85 |
| 6 | `src/hooks/useCallingForm.tsx` | 行 9 |
| 7 | `src/hooks/useAuthGuard.ts` | 行 14 |
| 8 | `src/resources/fetch.ts` | 行 4, 19-20, 49-51, 56 |
| 9 | `src/resources/cache.ts` | 行 5, 15 |
| 10 | `src/resources/queries.ts` | 行 37-43, 60-61, 97, 132-169 |
| 11 | `src/components/pages/CalendarComponent.tsx` | 行 38, 65, 89-90, 96, 98, 116, 133, 135, 161, 175, 189, 211, 215 |
| 12 | `src/components/pages/CalendarWrapperComponent.tsx` | 行 14 |
| 13 | `src/components/pages/TimelineComponent.tsx` | 行 25, 57 |
| 14 | `src/components/pages/AuthLeaveComponent.tsx` | 行 31 |
| 15 | `src/components/molecules/WrapComponent.tsx` | 行 8, 18, 23, 44, 54 |
| 16 | `src/components/molecules/TimeUpdateButtonComponent.tsx` | 行 20-21, 34 |
| 17 | `src/components/molecules/EventUpdateButtonComponent.tsx` | 行 13-16 |
| 18 | `src/components/organisms/DialogOnSlotComponent.tsx` | 行 15 |
| 19 | `src/components/organisms/InputItem.tsx` | 行 3, 5, 8, 35-36, 47-51, 56-57, 98-100 |
| 20 | `src/components/organisms/InputTitleDialog.tsx` | 行 17, 19, 31, 50 |
| 21 | `src/components/organisms/DaysComponent.tsx` | 行 6, 16-23, 64-75 |
| 22 | `src/components/templates/AuthParent.tsx` | 行 10-16, 30 |
| 23 | `src/components/templates/AxiosClientProvider.tsx` | 行 9, 27, 46, 53 |
| 24 | `src/components/templates/EventsParent.tsx` | 行 10, 23-32, 36, 39, 41, 44, 47, 49 |
| 25 | `src/components/templates/ViewComponents.tsx` | 行 22, 25 |
| 26 | `src/components/index.tsx` | 行 4 |

**Step 1: コミット分割計画**

```bash
# lib/ グループ
git add src/lib/TimelineType.ts src/lib/SampleState.ts src/lib/TmelineData.ts
git commit -m "chore: lib/ のコメントアウトコード削除"

# hooks/ グループ
git add src/hooks/useMouseHandle.ts src/hooks/useEventMutation.ts src/hooks/useCallingForm.tsx src/hooks/useAuthGuard.ts
git commit -m "chore: hooks/ のコメントアウトコード削除"

# resources/ グループ
git add src/resources/fetch.ts src/resources/cache.ts src/resources/queries.ts
git commit -m "chore: resources/ のコメントアウトコード削除"

# components/pages/ グループ
git add src/components/pages/CalendarComponent.tsx src/components/pages/CalendarWrapperComponent.tsx src/components/pages/TimelineComponent.tsx src/components/pages/AuthLeaveComponent.tsx
git commit -m "chore: pages/ のコメントアウトコード削除"

# components/molecules/ グループ
git add src/components/molecules/WrapComponent.tsx src/components/molecules/TimeUpdateButtonComponent.tsx src/components/molecules/EventUpdateButtonComponent.tsx
git commit -m "chore: molecules/ のコメントアウトコード削除"

# components/organisms/ グループ
git add src/components/organisms/DialogOnSlotComponent.tsx src/components/organisms/InputItem.tsx src/components/organisms/InputTitleDialog.tsx src/components/organisms/DaysComponent.tsx
git commit -m "chore: organisms/ のコメントアウトコード削除"

# components/templates/ + index グループ
git add src/components/templates/AuthParent.tsx src/components/templates/AxiosClientProvider.tsx src/components/templates/EventsParent.tsx src/components/templates/ViewComponents.tsx src/components/index.tsx
git commit -m "chore: templates/ のコメントアウトコード削除"
```

**Step 2: 各コミット後にビルド確認**
```bash
bun run build
```
Expected: 0 errors。