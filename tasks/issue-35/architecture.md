# Issue #35 — architecture.md

## 配色パレット（進捗 → 色）

キーは「保存されうる値」の両表現を扱う。

| 進捗（意味） | 日本語ラベル | 英字トークン（`InputItem options` value） | 候補色 | 補足 |
|---|---|---|---|---|
| 初期 / なし | `null` / 未設定 | — | `#3174ad` | デフォルト（rbc 既定） |
| これから | `これから` | `from now` | `#3949ab` | 青寄りの紫（Indigo 600） |
| まだ | `まだ` | `still` | `#5e35b1` | 中間の紫（Deep Purple 600） |
| もうすぐ | `もうすぐ` | `almost` | `#8e24aa` | やや赤寄りの紫（Purple 600） |
| 完了 | `完了` | `complete` | `#d81b60` | 赤寄りの紫／マゼンタ（Pink 600） |

> ⚠ **最終色はユーザー確認が必要**（overview リスク1 / test-plan §リスク対応）。
> 選定基準: ①「青の強い紫→赤の強い紫」の軸、②マイルストーン10色（`#9c27b0 #009688 #795548 #607d8b #e91e63 #3f51b5 #00bcd4 #ff5722 #8bc34a #ff9800`）と衝突しない、③`#3174ad` / `#00695c` と紛らわしくない、④白抜き文字が読める濃色（600 系）。

## 実装方針: `eventPropGetter` に一本化

- 配色は rbc の **`eventPropGetter`** が返す inline `style.backgroundColor` に**一本化**する。
- 既存の `.rbc-event-allday` 固定 CSS（`CalendarView.css.ts:24-26` の `#00695c`）は**削除**する。静的な Vanilla Extract `globalStyle` ではビュー切替ができないため。inline style は CSS より優先され、ビュー毎に制御できる唯一の汎用経路。
- `eventPropGetter` が月（`TimeGridEvent.js:41`）・週全デイ行（`EventRowMixin→EventCell`）・月セル（`DateContentRow→EventCell`）すべてで `getters.eventProp(...).style` として inline 適用されることを確認済み（rbc 1.20.0）。
- `isUndefined` の場合は `{}` を返し、rbc 既定（`#3174ad`）に委譲する。進捗なし＝デフォルトを明示的に返す代わりに `undefined` で default へ。

### ビュー毎の挙動

| view | 判定 | 返す色 |
|---|---|---|
| `month` | `isMonthAllday(event)`（= `isFullDayEvent || !isSameDay`） | `#00695c`（monitor 従来の teal。進捗配色は**出さない**） |
| `month` | それ以外（単日時間イベント） | `undefined` → default `#3174ad` |
| `week` / `day` / `agenda` / `work_week` | `progressToColor(event.progress)` | 進捗色、または `undefined`（null→default `#3174ad`） |

> 注: 当初は 'week' のみを対象としたが、**Issue #37 により week / day / agenda / work_week へ正式拡張**された（`tasks/issue-37/`）。month は対象外のまま。

- 月ビューの多日跨ぎイベント（`diff>1`、`isFullDayEvent` 判定外）を `isMonthAllday` で `#00695c` に残すことで、Issue #30 の描画を回帰ゼロで再現（同 `diff>1` は rbc の `.rbc-event-allday` クラスも付与される対象）。

## 型 / API 契約

`src/lib/progressColor.ts`（新規、純関数）:

```ts
import { isSameDay } from 'date-fns';
import type { View } from 'react-big-calendar';
import { isFullDayEvent } from './slot';

export const DEFAULT_EVENT_COLOR = '#3174ad';
export const MONTH_FULLDAY_COLOR = '#00695c';

// 進捗 → 色（キーは日本語ラベル。未知値は default）
export const PROGRESS_COLORS: Readonly<Record<string, string>> = {
  'これから': '#3949ab',
  'まだ': '#5e35b1',
  'もうすぐ': '#8e24aa',
  '完了': '#d81b60',
};

// 英字トークン → ラベル（旧データ / options.value / テスト互換）
const PROGRESS_TOKEN_TO_LABEL: Readonly<Record<string, string>> = {
  'from now': 'これから',
  still: 'まだ',
  almost: 'もうすぐ',
  complete: '完了',
};

export function progressToColor(progress?: string | null): string {
  if (!progress) return DEFAULT_EVENT_COLOR;
  const key = PROGRESS_TOKEN_TO_LABEL[progress] ?? progress;
  return PROGRESS_COLORS[key] ?? DEFAULT_EVENT_COLOR;
}

// 月ビューの「全デイ扱い」= 同一日フルデイ または 日跨ぎ（rbc の showAsAllDay 相当）。
export function isMonthAllday(start: Date, end: Date): boolean {
  return isFullDayEvent(start, end) || !isSameDay(start, end);
}

export function resolveEventColor(
  event: { progress?: string | null; start_time: Date; end_time: Date },
  view: View
): string | undefined {
  if (view === 'month') {
    return isMonthAllday(event.start_time, event.end_time)
      ? MONTH_FULLDAY_COLOR
      : undefined;
  }
  const color = progressToColor(event.progress);
  return color === DEFAULT_EVENT_COLOR ? undefined : color;
}
```

## 変更対象ファイル表

| 種別 | ファイル | 変更内容 |
|---|---|---|
| 新規 | `src/lib/progressColor.ts` | 配色定数 + `progressToColor` / `isMonthAllday` / `resolveEventColor` |
| 新規 | `src/tests/progressColor.spec.ts` | 上記 3 関数の単体テスト |
| 変更 | `src/components/pages/CalendarView.tsx` | `eventPropGetter`（`useCallback [currentView]`）を追加し `<DnDCalendar>` に配線 |
| 変更 | `src/tests/CalendarView.spec.tsx` | stub の `eventPropGetter` を検証するテスト追加 |
| 変更 | `src/components/pages/CalendarView.css.ts` | `.rbc-event-allday` 固定色（行24-26）を**削除**。EW アンカー規則は残す |

## コンポーネント配置・依存

```
CalendarView.tsx
  └─ eventPropGetter = useCallback((e) => resolveEventColor(e, currentView) ..., [currentView])
       └─ resolveEventColor → lib/progressColor.ts（純関数）
```

- `eventPropGetter` は `currentView` を閉じ込めるため、`const [currentView, setCurrentView] = useState<View>('week')` **より後に宣言**する（TDZ 回避。issue-30 の `draggableAccessor` と同じ配置規則）。`useCallback(fn, [currentView])` でビュー切替時に作り直す。
- `progressToColor` は `InputItem.tsx` の既存 `options`（ラベルと value のペア）と**別モジュール**に置く（DRY のため `InputItem` 側の是正は別タスクとし、本タスクでは触らない）。将来どちらかに集約する場合は `PROGRESS_COLORS` を共通化できる。

## 即時反映（要件 3・4）
`eventPropGetter` は render ごとに re-evaluate される。イベント「更新」後に TanStack Query が invalidate → イベントリスト更新 → 再 render → 新 `progress` が配色に乗る。追加実装不要。
