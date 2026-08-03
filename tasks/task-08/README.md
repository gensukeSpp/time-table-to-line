# Task 8: バグ修正 — E-1 11PM 問題（23:00 イベントが allDay 扱いになる）

> **紐付け元:** [`tasks/task-07/phase-e-findings.md`](../task-07/phase-e-findings.md) — Phase E 調査結果のうち、優先度「高」の **E-1: 11PM 問題** に取り組む。
>
> **実行方式:** 対話（手動）。修正箇所が少数（3 ファイル程度）で相互依存が小さいため、subagent 分割は不要。1 タスクずつ確実に進める。
>
> **前提:** `bun run build` / `bun run lint` / `bun run testrun` が緑の状態から開始する。

## 目的（Goal）

週表示で **23:00 のスロットをクリックした際に、イベントが「1 時間の通常イベント（23:00 付近）」として正しくタイムテーブルの 23:00 列に表示される**ようにする。現在は all-day / multi-day バンドに配置され、ユーザーに「allDay 扱い」と認識される症状を解消する。

## 検証済みの現状（実ブラウザで確定した事実）

### データフロー

```
ユーザーが週表示で 23:00 スロットをクリック
  → react-big-calendar 内部 DayColumn._selectSlot
  → onSelectSlot(SlotInfo{ start: 当日 23:00, end: <23:00 の次=0:00 翌日>, action:'click' })
  → CalendarView.onSelectSlot → setSlotInfoState(slotInfo)
  → onSlotInfo(slotInfo) → CalendarPage.setSlotInfo
  → DialogOnSlot → TitleInput slotStartTime={slotInfo.start}  （= 23:00）
  → TitleInput が end = addHours(start, 1) = 0:00 翌日 を生成してイベント作成
```

### 実ブラウザ（Storybook / react-big-calendar 1.20.0）で確定した挙動

RawCalendar（デフォルト設定）で複数のイベントを検証した結果:

| イベント | end | 描画位置 |
|---------|-----|---------|
| `23:00 → 0:00 翌日` （日跨ぎ） | 0:00 翌日 | **top の all-day / multi-day バンド** |
| `23:00 → 23:59 同日` | 23:59 | **23:00 の時間列**（「11:00 PM – 11:59 PM」） |
| `22:00 → 23:00` | 23:00 | 時間列 |

**結論: react-big-calendar は `end` が「ちょうど 0:00 翌日（日跨ぎ）」のイベントを日跨ぎとして扱い、all-day / multi-day バンドに描画する。** これは `allDayAccessor` の判定とは独立した「日跨ぎ」処理に起因する。

### Phase E 調査との相違点（重要修正）

Phase E 調査結果の E-1 節は、原因を「デフォルト `allDayAccessor` が start/end の日付部分の同一性で allDay 判定」としていた。しかし:

- デフォルト `allDayAccessor` は `event.allDay` プロパティ参照であり（`node_modules/react-big-calendar/lib/Calendar.js:350`）、日付同一性では判定しない。
- `allDayAccessor={() => false}` を入れても、23:00→0:00 イベントは**依然としてバンドに配置される**（実ブラウザで確認。バンド配置は allDay 判定とは別）。
- TitleInput は `addHours(start,1)` で end を作るため、`onSelectSlot` の `slotInfo.end` を正規化しても作成時刻は変わらない。

よって **`allDayAccessor` の追加や slotInfo.end の正規化では症状は解消しない**。「23:00 → 0:00 翌日」という end の持ち方自体を変える必要がある。

## 修正方針（本プラン最終版）

**スロットから作成するイベントの `end` を「日跨ぎする場合は同日 endOfDay（23:59:59.999）に丸める」ことで、23:00 イベントを通常の時間列（23:00 列）に表示させる。**

- 純関数 `resolveSlotEnd(slotStartTime)` を新設: `min(addHours(start, 1), endOfDay(start))`
  - 23:00 → 0:00 翌日 は 23:59:59.999 に丸まる → 時間列に表示
  - 22:00 → 23:00 はそのまま（丸まらない）
- `InputTitleDialog` で end 計算を `resolveSlotEnd` に置き換え。
- 併せて `format()` → `new Date()` の往復を排除し（Date を直接ミューテーションに渡す）、E-3 の Safari 依存リスクも解消。
- `allDayAccessor={() => false}` は防御として明示設定（アプリの不変条件「allDay イベントは存在しない」を保証）。

> 途中まで進めた `normalizeSlotInfo`（slotInfo.end の正規化）は、検証により実修正に寄与しないことが判明したため**不採用**。`src/lib/slot.ts` は実修正の `resolveSlotEnd` に再構成した。

## 変更対象ファイル（最終）

- **Modify:** `src/lib/slot.ts` — `resolveSlotEnd`（純関数、日跨ぎ end を endOfDay に丸める）
- **Modify:** `src/components/organisms/InputTitleDialog.tsx` — end 計算を `resolveSlotEnd` に置換 + Date 直接渡し
- **Modify:** `src/components/pages/CalendarView.tsx` — `allDayAccessor={() => false}`（防御）
- **Test:** `src/tests/slot.spec.ts` — `resolveSlotEnd` の単体テスト

## 検証コマンド

```bash
bun run testrun     # 全テスト（resolveSlotEnd の単体テスト含む）
bun run lint        # --max-warnings 0
bun run build       # tsc + vite build
```

---

## 実装タスク（実績）

### Task 1〜2: `resolveSlotEnd` 純関数 + 単体テスト、InputTitleDialog 適用

**Objective:** 日跨ぎするスロットの end を endOfDay に丸める純関数を作り、作成経路に適用する。

**Files:**
- Create/Modify: `src/lib/slot.ts`
- Modify: `src/components/organisms/InputTitleDialog.tsx`
- Test: `src/tests/slot.spec.ts`

**Step 1: 失敗するテストを書く**（`src/tests/slot.spec.ts`）

```ts
import { describe, expect, it } from 'vitest';
import { addHours, endOfDay, setHours, startOfDay } from 'date-fns';
import { resolveSlotEnd } from '../lib/slot';

describe('resolveSlotEnd', () => {
  it('通常スロット（例: 9:00）は start + 1h を返す', () => {
    const start = setHours(startOfDay(new Date()), 9);
    expect(resolveSlotEnd(start)).toEqual(addHours(start, 1));
  });
  it('23:00 スロットは日跨ぎせずに同日 endOfDay に丸める', () => {
    const start = setHours(startOfDay(new Date()), 23);
    expect(resolveSlotEnd(start)).toEqual(endOfDay(start));
  });
  it('22:00 スロットは日跨ぎしないため start + 1h のまま', () => {
    const start = setHours(startOfDay(new Date()), 22);
    expect(resolveSlotEnd(start)).toEqual(addHours(start, 1));
  });
});
```

**Step 2: 最小実装**（`src/lib/slot.ts`）

```ts
import { addHours, endOfDay, min } from 'date-fns';

export function resolveSlotEnd(slotStartTime: Date): Date {
  return min([addHours(slotStartTime, 1), endOfDay(slotStartTime)]);
}
```

**Step 3: InputTitleDialog に適用**

`src/components/organisms/InputTitleDialog.tsx`:
- `import { resolveSlotEnd } from '../../lib/slot';` を追加（`addHours, format` import は削除）
- end 計算を `const endTime = resolveSlotEnd(slotStartTime);` に置換
- ミューテーションは `start_time: slotStartTime, end_time: endTime`（Date 直接渡し）

**Step 4: 検証**

Run: `bun run testrun && bun run lint && bun run build`
Expected: 全て PASS

**Step 5: コミット**

```bash
git add src/lib/slot.ts src/tests/slot.spec.ts src/components/organisms/InputTitleDialog.tsx
git commit -m "fix: resolve 11PM slot end to endOfDay so it renders in time column (E-1)"
```

### Task 3: `allDayAccessor={() => false}` 設定（防御）

**Objective:** アプリ全体で allDay 扱いをしないことを明示的に保証する。

**Files:**
- Modify: `src/components/pages/CalendarView.tsx`（`<DnDCalendar .../>` に追加）

**Step 1: props に追加**

```tsx
<DnDCalendar
  ...
  defaultView="week"
  allDayAccessor={() => false}
  ...
/>
```

**Step 2: 検証**

Run: `bun run testrun && bun run lint && bun run build`
Expected: 全て PASS（既存テストに影響なし）

### Task 4: 実ブラウザでの動作確認（実施済み）

**Objective:** 実際の挙動を確定する。→ 実ブラウザ（Storybook + react-big-calendar 1.20.0）で検証。

**実施内容:**
- RawCalendar で 23:00→0:00 翌日 / 23:00→23:59 / 22:00→23:00 を描画し、配置を確認。
- 結論: 日跨ぎ（0:00 翌日）はバンド、同日 23:59 なら時間列（前掲の表）。
- `allDayAccessor` 依存でないことを確認。

### Task 5: 品質ゲート最終確認

**Objective:** lint / build / test を全て通す。

```bash
git status
git diff --stat
bun run lint        # 0 error, 0 warning
bun run build       # 0 error
bun run testrun     # 全 PASS
```

## 完了条件（Done）

- [x] `resolveSlotEnd` が 23:00 スロットの end を同日 endOfDay に丸める（単体テスト PASS）
- [x] `InputTitleDialog` が `resolveSlotEnd` + Date 直接渡しで作成する
- [x] `CalendarView` に `allDayAccessor={() => false}`（防御）
- [x] lint / build / test 全て緑
- [x] 実ブラウザで「end 23:59 のイベントは 23:00 列に描画」されることを確認

## リスク・トレードオフ・未解決点

- **保存データの意味** : 23:00 スロット作成の end は `00:00 翌日` → `23:59:59.999 同日` に変わる。タイムテーブル上は 23:00 列に正しく表示され、実用上は「23:00 に終わる最後の瞬間」として整合する。タイムライン表示側も 23:00–23:59 となり、実質ほぼ同一。
- **真の日跨ぎイベント** : 仮に将来「23:00 開始・翌日 0:30 終了」のような長時間日跨ぎイベントを直接作成する要件が出た場合、本ロジック（1 時間スロット前提）では endOfDay に丸められるため、その際は別途対応が必要（YAGNI の範囲で今回は対象外）。
- **ドラッグ＆ドロップによる 23:00 へのリサイズ/移動** : 本修正はスロットクリックでの新規作成経路（TitleInput）に対応。DnD で 23:00 丁度に end が来るケースは別途検証対象（E-1 の報告症状はクリックでの追加のためスコープ外）。
