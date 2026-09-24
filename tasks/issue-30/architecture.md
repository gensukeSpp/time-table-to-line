# Issue #30 — architecture.md

## 事前調査の結論（react-big-calendar 1.20.0 のソース + 現行実装で確定）

### 調査トピック: `DnDCalendar.eventPropGetter` は適切か？（issue の指示）

**結論: 用途によって「適切 / 不適切」が分かれ、すべてを `eventPropGetter` で賄うのは不適切。DnD の可否制御は専用 props が存在する。**

`eventPropGetter` は「event の**見た目（style / className）**を返す getter」であり、**DnD の可否（ドラッグ可 / リサイズ可）を制御できない**。react-big-calendar の DnD 拡張が用意しているのは別の props である。

#### 根拠（node_modules ソース）
1. **DnD 可否の制御は `draggableAccessor` / `resizableAccessor`**
   `lib/addons/dragAndDrop/EventWrapper.js`:
   - `:90` `var isDraggable = draggableAccessor ? !!(accessor)(event, draggableAccessor) : true;`
   - `:116` `var isResizable = resizable && (resizableAccessor ? !!(accessor)(event, resizableAccessor) : true);`
   - `:130-140` `if (isResizable) { ... renderAnchor('Left'/'Right') ... }`
   → accessor が `false` を返すと、リサイズアンカーが**描画されない**（伸縮不可）。移動も `draggableAccessor=false` で無効化可能。**これが「対策 2」の正しい実装手段**。

   アクセサは `(event) => boolean` の純関数。`withDragAndDrop` が `DnDContext` 経由で `EventWrapper` に配るため、`DnDCalendar` に渡す props としてそのまま使える（`withDragAndDrop.js:92-97` → `DnDContext`）。

2. **`eventPropGetter` の `width` は時間列では上書きされて無効**
   `lib/TimeGridEvent.js:56-68`:
   ```js
   var eventStyle = _objectSpread(_objectSpread({}, userProps.style), {
     top: ..., height: ..., width: ...(layout の width), left: ...(xOffset) });
   ```
   → 時間列のイベントでは、`eventPropGetter` の `width` は **レイアウト算出の width に上書きされる**。よって「対策 3」の「`eventPropGetter` で width を狭める」は**時間列では効果がない**。
   - 一方、月ビュー / 週ビュー全 day バンドの行セグメントでは `EventRowMixin.renderEvent`（`EventRowMixin.js:44-59`）が EventCell に `style` を渡さないため、`eventPropGetter` の style は生存する（`EventCell.js:78` `{...userProps.style, ...style}`）。ただしここで width を狭めると、日セル・マルチデイのグリッド配置が崩れ、隣接時間との視覚的整合が失われる → 採用しない。
   - **時間列の同時刻重なりイベントの「自動で幅を分割する」挙動は曲 built-in**（TimeGridEvent に渡る width が重なり分割後）。「week でも同時刻重なりで幅を狭める」目的は**既に rbc が満たしている**ため、追加実装は不要。

3. **`eventPropGetter` の背景色（background）は時間列でも生存する**
   `TimeGridEvent.js:56-68` が上書きするのは `top/height/width/left` のみで、`background` / `color` は `userProps.style` から引き継ぐ。→ 色分けは eventPropGetter でも可能。ただし `.rbc-event-allday` クラスは Issue #29 で**付与済み**（`EventCell.js:81`）なので、CSS の `:global(.rbc-event-allday)` で着色する方が単一情報源として綺麗。→ **対策 1 は CSS を採用**。

4. **EW リサイズアンカーはヒット領域が極小（対策 3 の根本原因）**
   `lib/addons/dragAndDrop/styles.css`:
   - `:49-59` `.rbc-addons-dnd-resize-ew-anchor { position:absolute; top:4px; bottom:0; }` で **width 未指定**（0px）。`:first-child { left:0 }` `:last-child { right:0 }`
   - 見た目は中の icon（`border-left:3px double`）のみ。→ **クリック判定がほぼ 3px のみ**。隣スロットにイベントがあると、EW アンカーの上に隣イベントが重なって掴めなくなる（z-index も未指定）
   → **対策 3 は「イベント幅を縮める」のではなく、EW アンカーのヒット領域（width）+ z-index を CSS で拡げる**のが安全かつ変更可能な代替

### 現行 `eventPropGetter`（`CalendarView.tsx:34-51`）の「自他判定」は機能していない（issue の要調査への回答）
- `CalendarView.tsx:31-33` で `state` は `staff_id === auth.authId` の**自分のイベントのみにフィルタ済み**。よって `eventPropGetter` の `else` 分岐（他イベント半透明化）は実効しない
- `controlStyle` の `pointerEvents: 'auto'` は CSS の既定値（no-op）
- → **この `eventPropGetter` は実質何もしていない**。削除 / 書き換えてよい（issue が「機能していなければ書き換え OK」とした箇所）

## 型定義・API 契約
### API / 型の変更
- バックエンド変更なし。スキーマ・フィールド名の変更なし → 両リポジトリ同時変更は不要
- `TimelineEventProps` の変更は不要（`start_time` / `end_time` / `isDraggable?` は既存）

### 追加する純関数（`src/lib/slot.ts`）
```ts
import { addHours, endOfDay, min, startOfDay, isSameDay, isSameMinute } from 'date-fns';
import type { View } from 'react-big-calendar';   // 追加 import

// 既存: resolveSlotEnd / resolveEventEnd / isFullDayEvent はそのまま

/**
 * Issue #30: 'month' ビューではフルデイイベント以外（時間ごとのイベント）の
 * ドラッグ（移動）・リサイズ（伸縮）を不可にして、誤って 'week' の
 * .rbc-row（バンド行）に落ちる事故を防ぐ。
 * rbc の draggableAccessor / resizableAccessor に「! を付けて」渡す前提。
 */
export function shouldBlockMonthDnd(
  event: { start_time: Date; end_time: Date },
  view: View
): boolean {
  return view === 'month' && !isFullDayEvent(event.start_time, event.end_time);
}
```
- `view === 'month'` のときだけブロックするので、'week' まの縦リサイズ・移動は変わらない
- `isFullDayEvent` を再利用（DRY）。「0:00–23:59」以外はフルデイ扱いにしない

## コンポーネント配置（`CalendarView.tsx` の変更）
```tsx
import { shouldBlockMonthDnd } from '../../lib/slot';   // 追加

// currentView 変化で作り直すアクセサ（closure 参照）
const draggableAccessor = useCallback(
  (event: TimelineEventProps) => !shouldBlockMonthDnd(event, currentView),
  [currentView]
);
const resizableAccessor = useCallback(
  (event: TimelineEventProps) => !shouldBlockMonthDnd(event, currentView),
  [currentView]
);

return (
  <DnDCalendar
    ...
    allDayAccessor={... isFullDayEvent ...}          // 既存のまま
    draggableAccessor={draggableAccessor}            // 追加（対策2）
    resizableAccessor={resizableAccessor}            // 追加（対策2）
    resizable                                          // 既存のまま（global ON）
    // eventPropGetter={eventPropGetter}             // 削除（対策として不要化）
    ...
  />
);
```
- `resizable`（global）= `true` のまま、per-event を `resizableAccessor` で絞る（rbc の正しい併用形）
- 既存 `eventPropGetter`（定数）と `uncontrolStyle` / `controlStyle` を削除

## 対策 1・3：スタイル（`CalendarView.css.ts`）
Vanilla Extract でグローバル（rbc が動的付与するクラス）を上書きするため `globalStyle` を使う。
```ts
import { globalStyle, style } from '@vanilla-extract/css';

// 対策1: フルデイイベント（.rbc-event-allday）の色分け。
// デフォルト #3174ad から区別し、赤・紫（マイルストーン色）を避けた濃色。
// 白抜き文字（rbc 既定 color:#fff）が読める色を選ぶ。候補 #00695c（Teal 800）。
globalStyle(':global(.rbc-event-allday)', {
  backgroundColor: '#00695c',
});

// 対策3: EW リサイズアンカーのヒット領域拡大 + 隣イベントより上に。
// dnd 既定は width 未指定（0px）かつ z-index なし → 隣イベントに遮られ掴めない。
globalStyle(':global(.rbc-addons-dnd-resize-ew-anchor)', {
  width: '20px',
  zIndex: 2,
});
```
- 値は実ブラウザで調整（`test-plan.md`）。アンカーの width を広げすぎるとイベント選択を邪魔する恐れがあるため、最小限に
- `color: #fff` は `.rbc-event` 既定で白なので追加不要。もし候補色で白が沈む場合は `color` も明示

## 変更対象ファイル表
| ファイル | 変更内容 |
|---------|---------|
| `src/lib/slot.ts` | `shouldBlockMonthDnd(event, view)` 純関数を追加（`View` を type import） |
| `src/components/pages/CalendarView.tsx` | `draggableAccessor` / `resizableAccessor` を追加、旧 `eventPropGetter`（自他判定）を削除 |
| `src/components/pages/CalendarView.css.ts` | `:global(.rbc-event-allday)` 着色、`:global(.rbc-addons-dnd-resize-ew-anchor)` ヒット領域拡大 |
| `src/tests/slot.spec.ts` | `shouldBlockMonthDnd` の単体テスト追加 |
| `src/tests/CalendarView.spec.tsx` | アクセサの wiring（view・フルデイ判定）のテスト追加 |

## バックエンド
変更なし。`light_token_server` の両リポジトリ同時変更は不要。