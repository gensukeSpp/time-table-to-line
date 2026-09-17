# Issue #29 — architecture.md

## 事前調査の結論（実ブラウザ + rbc 1.20.0 ソースで確定）

### react-big-calendar の描画ルール
週/時間ビュー（`TimeGrid.js:293`）でイベントを振り分ける:
```js
if (accessors.allDay(event) || startAndEndAreDateOnly(start,end) || (!showMultiDayTimes && !isSameDate(start,end))) {
  allDayEvents.push(event)   // 上部 `.rbc-row`（= `.rbc-allday-cell` 内）に配置
} else {
  rangeEvents.push(event)    // `.rbc-time-content`（時間列）に配置
}
```

`.rbc-event-allday` クラスは `EventCell.js:60,81` で決まる:
```js
showAsAllDay = isAllDay || accessors.allDay(event) || diff(ceil(end,'day'), start, 'day') > 1
className に 'rbc-event-allday': showAsAllDay
```

**重要な区別: `.rbc-row` への配置と `.rbc-event-allday` クラスは別の信号で制御される。**
- `.rbc-row` 配置: `allDay` アクセサ OR 日付のみ(0:00–0:00) OR 日跨ぎ
- `.rbc-event-allday` クラス: `allDay` アクセサ OR 日跨ぎ(diff>1)

### 実ブラウザで確定した事実（社員番号 201 でログインし、テストデータ挿入）
| データ | start/end（JST 9 月） | 週ビューでの配置 | `rbc-event-allday` |
|--------|----------------------|------------------|--------------------|
| `TEST-fullday-2359` | 0:00 / 23:59:59 | **時間列** `.rbc-time-content` | なし（`rbc-event`） |
| `TEST-dateless` | 0:00 / 0:00（date-only） | `.rbc-row-segment > .rbc-row` | **なし**（`rbc-event`） |
| `日跨ぎサンプル`（既存） | 日跨ぎ | `.rbc-row-segment > .rbc-row` | **あり**（`rbc-event rbc-event-allday`） |

→ **日を跨がない「0:00–23:59」イベントは、既定では週ビューの時間列に落ちる。**
→ `.rbc-row` に置きつつ `.rbc-event-allday` も付けるには、**`allDayAccessor(event)` がフルデイイベントで `true` を返すことが必須**（date-only だけではクラスが付かない）。
→ これは `tasks/task-08/`（11PM 問題）の `allDayAccessor = () => false` を、フルデイ時のみ真にする変更を意味する。

### 現状の不具合の再現（月ビュークリック作成）
実ブラウザで月ビューのセルをクリック → タイトル入力 → 追加すると、保存されたのは
`start: 0:00 / end: 1:00`（1 時間枠・group 9）。
→ `DialogOnSlot → TitleInput` が `end = resolveSlotEnd(0:00) = addHours(0:00,1) = 1:00` を生成するため。
→ issue の「フルデイ（0:00–23:59）に区別する」修正の必要性を再現確認。

## 型定義・API 契約

### API 契約（変更なし）
- `POST /event/add` は `{staff_id, group, start_time, end_time, title, ...}`（ISO 文字列）を受け付け、任意の日時を保存できる。
- フロントの `TimelineEventProps` は `start_time` / `end_time`（Date）。rbc に入れる時は `startAccessor` / `endAccessor` で渡す。
- フルデイの UTC 表現は「0:00 JST = 前日 15:00 UTC」「23:59 JST = 14:59 UTC」（issue の括弧注記 前日 15:00 / 14:59 と一致）。

### 変更する型
```ts
// src/lib/TimelineType.ts
import { Event, SlotInfo, View } from 'react-big-calendar';   // View を追加

export interface CalendarActionProps {
  onTimeChangeEvents?: (movedEvents: TimelineEventProps[]) => void
  onSlotInfo?: (selectedSlot: SlotInfo, view: View) => void   // view を追加
}
```
- `onSlotInfo` に `view` を加えることで、'month' 由来作成だけ `fullDay` にできる。
- 既存の呼び出し `onSlotInfo={() => {}}` / Storybook `action('onSlotInfo')` は引数が少なくても代入可能（TS は引数数の少ない関数を許容）→ 互換。

## 純関数（`src/lib/slot.ts` に追加）
```ts
import { addHours, endOfDay, startOfDay, isSameMinute, isSameDay, min } from 'date-fns';

export function resolveSlotEnd(slotStartTime: Date): Date {  // 既存はそのまま
  return min([addHours(slotStartTime, 1), endOfDay(slotStartTime)]);
}

// フルデイ（month）なら endOfDay、それ以外は従来の丸め
export function resolveEventEnd(slotStartTime: Date, fullDay: boolean): Date {
  return fullDay ? endOfDay(slotStartTime) : resolveSlotEnd(slotStartTime);
}

// フルデイイベント判定（allDayAccessor に渡す）: start=0:00 かつ end=当日 23:59
export function isFullDayEvent(start: Date, end: Date): boolean {
  return isSameMinute(start, startOfDay(start))
      && isSameDay(start, end)
      && isSameMinute(end, endOfDay(start));
}
```
- `isFullDayEvent` が `true` になるのは「丁度 0:00 − 当日 23:59」のみ。
  - 'week' 作成（9:00–10:00, 23:00–23:59:59）: start ≠ 0:00 → false
  - 既存 date-only（0:00–0:00）: end ≠ 23:59 → false
  - 日跨ぎ: `isSameDay` false → false
- date-fns 4.4.0 には `isStartOfDay` / `isEndOfDay` が**存在しない**ため、`startOfDay` / `endOfDay` / `isSameMinute` / `isSameDay` で判定する（lint で未定義 import にしないこと）。

## コンポーネント配置（イベントの流れ）
```
CalendarView.onSelectSlot → setSlotInfoState(slotInfo)
  → useEffect: onSlotInfo(slotInfoState, currentView)        [view 追加]
  → CalendarPage.onSlotInfo: setSlotPicker({ slotInfo, view })
  → DialogOnSlot slotInfo=… view=…    
       → TitleInput slotStartTime=slotInfo.start  isMonth=(view==='month')
            → endTime = resolveEventEnd(slotStartTime, isMonth)  // month: endOfDay
            → createEvent.mutate({ start_time: slotStartTime, end_time: endTime })
CalendarView の <Calendar allDayAccessor={e => isFullDayEvent(e.start_time, e.end_time)} />
  → rbc がフルデイを週ビューの .rbc-row に配置 + .rbc-event-allday 付与
```

## 変更対象ファイル表
| ファイル | 変更内容 |
|---------|---------|
| `src/lib/TimelineType.ts` | `onSlotInfo` シグネチャに `view: View` 追加（import 追加） |
| `src/lib/slot.ts` | `resolveEventEnd` / `isFullDayEvent` 純関数を追加 |
| `src/components/pages/CalendarView.tsx` | `onSlotInfo?.(slotInfo, currentView)` に変更（currentView を deps に追加）/ `allDayAccessor` を `isFullDayEvent` へ |
| `src/components/pages/CalendarPage.tsx` | `onSlotInfo` で view を捕捉し `DialogOnSlot` へ `view` を渡す（state を `{slotInfo, view}` 化） |
| `src/components/organisms/DialogOnSlot.tsx` | `view?: View` prop 追加 → `TitleInput` へ `isMonth` 渡す |
| `src/components/organisms/InputTitleDialog.tsx` | `TitleInputProps` に `isMonth: boolean` 追加、`resolveEventEnd(slotStartTime, isMonth)` で end 計算 |
| `src/lib/slot.spec.ts` | `isFullDayEvent` / `resolveEventEnd` の単体テスト追加 |
| `src/tests/TitleInput.spec.tsx`（新規） | 月ビューの作成ペイロードが `end=endOfDay` になることを検証 |
| （要確認）`src/tests/Calendar.spec.tsx` | `allDayAccessor` 変更で既存アサートが壊れないか確認 |
| （要確認）`src/stories/Calendar.stories.tsx` | コンパイル互換のみ確認 |

## バックエンド
変更なし。スキーマ・フィールド名変更はないため、`light_token_server` の両リポジトリ同時変更は不要。