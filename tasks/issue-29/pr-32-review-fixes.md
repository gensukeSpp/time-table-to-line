# PR #32 レビュー指摘対応 — 計画とタスク

参照: `.github/reports/pr-32-review.md`（指摘事項 3 件）

## 指摘の全体像と方針

| # | 指摘 | 深刻度 | 対応方針 |
|---|---|---|---|
| 1 | ビュー切替時に過去の slotInfo を再通知する不要な状態更新 | P2 | `CalendarView` の effect 依存から `currentView` を外し、**slot 選択時に view を同時に保存**する。`slotInfoState` が未定義のときは通知しない。`DialogOnSlot` の close を親 state に反映する `onClose` callback を追加する |
| 2 | 実ブラウザ受け入れ要件を自動テストで検証できていない | P2 | `MyCalendar` 統合テストで `allDayAccessor` の描画結果（all-day バンド配置）と slot 選択 → `onSlotInfo` 通知の経路を検証する。`DialogOnSlot` 統合テストで view → `TitleInput` payload 伝播と close → 親 state 反映を検証する |
| 3 | `isFullDayEvent` の判定が「同一分」を許容する | P2 | **start は厳密比較**（`getTime() === startOfDay().getTime()`）に変更。**end は同一分許容を仕様として明記**し、境界テストを追加する |

---

## 指摘 1: slotInfo 再通知の解消（P2）

### 問題の構造

- [`CalendarView.tsx`](../../src/components/pages/CalendarView.tsx) の `useEffect` が `[onSelectSlot, slotInfoState, onSlotInfo, currentView]` に依存 → `currentView` が変わるたびに最後の `slotInfoState` を再送信する。
- [`DialogOnSlot.tsx`](../../src/components/organisms/DialogOnSlot.tsx) の `handleClose` はローカル引数 `slotInfo = undefined` を書き換えるだけで、親の `slotPicker` state が残る。

### 修正タスク

1. **`CalendarView`**: `slotInfoState` を `{ slotInfo: SlotInfo; view: View }` のペアで保存する。
   - `onSelectSlot` 内で選択時点の view を同時に保存する。
   - effect 依存から `currentView` を削除し、`slotSelection` 変化時のみ `onSlotInfo` を呼ぶ。
   - `slotSelection` が `undefined` のときは通知しない（初回通知の抑止）。
2. **`CalendarPage`**: `handleSlot` は変更不要（`{ slotInfo, view }` を受ける）。
3. **`DialogOnSlot`**: `onClose?: () => void` prop を追加し、`handleClose` で親に close を通知する。
4. **`CalendarPage`**: `DialogOnSlot` に `onClose`（`handleCloseSlotPicker`）を渡し、close で `slotPicker` をクリアする。

### 影響範囲

- `CalendarActionProps`（[`TimelineType.ts`](../../src/lib/TimelineType.ts)）はシグネチャ変更なし（`onSlotInfo?: (selectedSlot: SlotInfo, view: View) => void` のまま）。
- `TitleInput` / `InputTitleDialog.tsx` は影響なし（`isMonth` の受け渡し経路は不変）。`handleClose` の `useCallback` 化により、`TitleInput` 側 `useEffect([closeDialog])` の不要発火も抑制される。
- 11PM 丸め（`resolveSlotEnd`）は不変。

### テスト（RED → GREEN）

- 初回マウント時（slot 未選択）は `onSlotInfo` が呼ばれないこと。
- slot 選択 → `onSlotInfo` が 1 回呼ばれ、選択時点の view が渡ること。
- その後 view を切り替えても `onSlotInfo` が再呼び出しされないこと（再通知抑止の固定）。
- 新たな slot 選択で再度 1 回だけ呼ばれること。

---

## 指摘 2: 受け入れ要件の自動テスト化（P2）

### 修正タスク

1. **`MyCalendar` ロジックテスト**（新規 [`CalendarView.spec.tsx`](../../src/tests/CalendarView.spec.tsx)）
   - RBC の `Calendar` をスタブに置き換え、`onSelectSlot` / `onView` をテストから発火できるようにする。
   - 初回通知なし / 選択時 1 回通知（view 付き）/ view 切替で再通知なし / month 通知を検証。
   - `allDayAccessor(fullDayEvent) === true` / 通常イベント `=== false` を検証。
2. **`DialogOnSlot` 統合テスト**（新規 [`DialogOnSlot.spec.tsx`](../../src/tests/DialogOnSlot.spec.tsx)）
   - `view='month'` + slotInfo でダイアログが開き、`TitleInput` の submit payload の `end_time` が `endOfDay` になること（view → isMonth → resolveEventEnd の伝播）。
   - `view='week'` では `resolveSlotEnd`（+1h）になること。
   - close ボタンで `onClose` が呼ばれること。
3. **実 RBC 描画テスト**（[`Calendar.spec.tsx`](../../src/tests/Calendar.spec.tsx) 追記）
   - フルデイイベント（0:00–endOfDay）を含む events でレンダーし、`.rbc-allday-cell`（all-day バンド）にイベントが描画されること。
   - 通常時間イベントが all-day バンドに載らないこと。
4. RBC 実 DOM 配置の最終確認は Storybook（`bun run storybook`）で手動確認を継続（レビュー改善提案 4 のとおり、CI と手動確認を分けて記録）。

### テスト戦略の補足

RBC 本体の slot 選択（`Selection`）は `document.elementFromPoint` / boundingRect の座標計算に依存し jsdom で動作しないため、slot 選択通知のライフサイクルは **Calendar スタブによるロジックテスト**で検証し、実 RBC の描画（all-day バンド配置）は `Calendar.spec.tsx` で検証する役割分担とした。

---

## 指摘 3: `isFullDayEvent` の境界精度（P2）

### 仕様確定

- **start**: 厳密に `startOfDay(start)` と一致（ミリ秒単位の `getTime()` 比較）。0:00:00.000 以外（例: 0:00:59）はフルデイ扱いにしない。
- **end**: `endOfDay(start)` と**同一分まで許容**（`isSameMinute` 維持）。理由:
  - month ビュー由来イベントは `endOfDay`（23:59:59.999）で作成される。
  - week ビューで 23:59 台へ DnD/リサイズしたイベントも、実用上「その日の終わり」として all-day バンドに置いて問題ない。
  - 厳密化すると DnD 由来の 23:59:00 が all-day から外れ、23:00 列に細いイベントとして表示される退行が起こりうる。
- この契約を [`slot.ts`](../../src/lib/slot.ts) の JSDoc に明記する。

### 修正タスク

1. `isFullDayEvent` の start 判定を `getTime() === startOfDay(start).getTime()` に変更。
2. JSDoc に「start は厳密 / end は同一分許容」の契約を記載。
3. テスト追加（[`slot.spec.ts`](../../src/tests/slot.spec.ts)）:
   - start=00:00:59 → false（厳密化の証明）。
   - start=00:00:00.001 → false（ミリ秒のズレも許容しない）。
   - end=23:59:00（同一分）→ true（許容の契約固定）。
   - end=23:58:59 → false。

### 影響範囲

- `allDayAccessor`（CalendarView）のみ利用。month 作成時は `startOfDay` を使うため既存データへの影響はない。
- `resolveEventEnd` / `resolveSlotEnd` は不変（11PM 問題の挙動維持）。

---

## 実施順序

1. 指摘 3（純関数 + テスト、影響が最小）
2. 指摘 1（state 構造の修正 + `DialogOnSlot` の `onClose`）
3. 指摘 2（統合テスト、1・2 の修正を固定するテスト）
4. 品質ゲート: `bun run testrun` / `bun run lint` / `bun run build`

## 完了条件

- [x] `isFullDayEvent` の start が厳密比較になり、end の同一分許容が JSDoc + テストで固定されている
- [x] `CalendarView` が slot 選択時のみ `onSlotInfo` を通知し、view 切替で再通知しない
- [x] `DialogOnSlot` の close が親 state（`slotPicker`）をクリアする
- [x] 統合テストで all-day 描画・view 伝播・close 通知が検証されている
- [x] `bun run testrun` / `bun run lint` / `bun run build` がすべて成功

## 実施結果（2026-09-18）

| 指摘 | 変更ファイル | 内容 |
|---|---|---|
| 1 | `src/components/pages/CalendarView.tsx` | `slotInfoState` を `{ slotInfo, view }` ペアの `slotSelection` に統合。effect 依存から `currentView` を削除し、未選択時は通知しない。`onSelectSlot` は選択時点の view を保存（依存に `currentView`） |
| 1 | `src/components/organisms/DialogOnSlot.tsx` | `onClose` prop を追加。`handleClose` を `useCallback` 化し、ローカル引数の無意味な再代入を削除。close が親 state に反映される |
| 1 | `src/components/pages/CalendarPage.tsx` | `handleCloseSlotPicker`（`useCallback`）を追加し `DialogOnSlot` に `onClose` として配線。close で `slotPicker` をクリア |
| 3 | `src/lib/slot.ts` | start を `getTime() === startOfDay().getTime()` の厳密比較に変更。end は同一分許容を契約として JSDoc に明記 |
| 2 | `src/tests/CalendarView.spec.tsx`（新規） | Calendar スタブで slot 選択ライフサイクル（初回通知なし / 選択時 1 回通知 / view 切替で再通知なし / month 通知）と `allDayAccessor` の true/false を検証 |
| 2 | `src/tests/DialogOnSlot.spec.tsx`（新規） | view='month' → `end_time = endOfDay`、view='week' → `+1h` の伝播、close → `onClose` 呼び出しを検証 |
| 2 | `src/tests/Calendar.spec.tsx` | 実 RBC でフルデイイベントが `.rbc-allday-cell` に描画され、時間イベントが載らないことを検証 |
| 2 | `src/tests/vitest-setup.ts` | jsdom に無い `HTMLDialogElement.showModal` / `close` のスタブを追加 |
| 3 | `src/tests/slot.spec.ts` | start 厳密化（00:00:59 / 00:00:00.001 → false）と end 同一分許容（23:59:00 → true / 23:58:59 → false）の境界テストを追加 |

### 品質ゲート

- `bun run testrun`: 18 files / 104 tests passed（1 skipped）
- `bun run lint`: エラー 0（`--max-warnings 0`）
- `bun run build`: tsc + vite build 成功
