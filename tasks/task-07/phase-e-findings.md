# Phase E 調査結果

## E-1: 11PM 問題

**原因:** react-big-calendar で 23:00 のスロットをクリックすると、`SlotInfo.end` が翌日 00:00 になる。この「日をまたぐ」期間を react-big-calendar が allDay として解釈する可能性が高い。

**再現手順:**
1. カレンダーの週表示で 23:00 のスロットをクリック
2. `onSelectSlot` が受け取る `SlotInfo` の `start`=23:00, `end`=00:00(翌日)
3. react-big-calendar がこのスロットを allDay 扱いにする

**コード上の問題箇所:**
- `CalendarView.tsx:94` - `onSelectSlot` は `SlotInfo` をそのまま受け取っている
- `InputTitleDialog.tsx:26-27` - `endDT` は `addHours(slotStartTime, 1)` で計算（正しく 1 時間後）
- ただし、CalendarView.tsx には `allDayAccessor` が未設定（デフォルト動作に依存）

**仮説:**
- 仮説 A（最も可能性が高い）: react-big-calendar のデフォルト `allDayAccessor` が 23:00〜00:00 を allDay と判定
- 仮説 B: `onSelectSlot` の `action` が `'click'` の場合、スロットが 1 時間単位で選択されるが、23:00 は翌日 00:00 が end になるため日跨ぎ判定

**修正案:**
1. `allDayAccessor` を明示的に設定し、allDay イベントを無効化する
   ```tsx
   allDayAccessor={() => false}
   ```
2. または `onSelectSlot` で `slotInfo.end` が翌日の場合、`end` を当日 23:59 に丸める

**影響ファイル:**
- `src/components/pages/CalendarView.tsx`

---

## E-2: タイムライン重なり表示

**原因:** `react-calendar-timeline` の `Timeline` コンポーネントに `stackItems` プロパティが未設定。デフォルトは `false` で、重なったアイテムは同じ行に描画され、下のアイテムが隠れる。

**再現手順:**
1. 同じグループ（staff_id）に時間帯が重複する 2 つのイベントがある状態
2. タイムライン表示で重なりが表示されない（上に描画されたものが下を隠す）

**コード上の問題箇所:**
- `TimelinePage.tsx:75-94` - `Timeline` コンポーネントに `stackItems` が未設定
- `lineHeight={60}` は設定済み

**修正案:**
```tsx
<Timeline
  // ... 既存の props
  stackItems={true}  // 追加
/>
```

`stackItems={true}` を追加するだけで、重なったアイテムが上下に積み重ねて表示される。

**影響ファイル:**
- `src/components/pages/TimelinePage.tsx`

---

## E-3: タイムゾーン問題

**原因:** データフローの各段階でのタイムゾーン処理を調査。

**データフロー:**
```
ユーザー操作（JST 23:00）
  → onSelectSlot: slotInfo.start = 23:00 JST（Date オブジェクト）
  → TitleInput: format(slotStartTime, "yyyy-MM-dd HH:mm:ss") = "2026-07-28 23:00:00"
  → new Date(startDT) = 23:00 JST の Date オブジェクト
  → Axios POST: 自動的に UTC の ISO 文字列にシリアライズ ("2026-07-28T14:00:00.000Z")
  → サーバー: UTC として保存
  → 読み込み時: new Date(item.start) = UTC を JST に変換して表示
```

**分析:**
- `format()` はローカル時間（JST）でフォーマットする → 正しい
- `new Date("2026-07-28 23:00:00")` はブラウザでローカル時間としてパース → 正しい
- Axios が Date を UTC の ISO 文字列に変換 → サーバーには UTC で送信
- サーバーが UTC で保存 → DB 上は UTC（JST - 9h）
- 読み込み時に `new Date(utcString)` で JST に再変換 → 表示は正しい

**結論:** UI 上の表示は正しく動作しているはず。サーバーが UTC で保存するのは正常な動作（ベストプラクティス）。ただし、以下の場合に問題が発生する:

1. **サーバー側の API が UTC のまま JST として扱う場合** — サーバーのタイムゾーン設定を確認する必要あり
2. **`new Date("2026-07-28 23:00:00")` のパース結果がブラウザ依存の場合** — Safari ではこのフォーマットを Invalid Date と判定する可能性あり

**修正案（Safari 対応）:**
```typescript
// 修正前
const startDT = format(slotStartTime, "yyyy-MM-dd HH:mm:ss");
start_time: new Date(startDT)

// 修正後（format の結果をISOStringで送信）
start_time: slotStartTime  // Date オブジェクトを直接渡す
```

`format()` → `new Date()` の迂回をやめ、Date オブジェクトを直接ミューテーションに渡す方が安全。

**影響ファイル:**
- `src/components/organisms/InputTitleDialog.tsx`

---

## 優先度評価（タスク 8 に向けて）

| バグ | 影響範囲 | 修正難易度 | 優先度 |
|------|---------|-----------|--------|
| 11PM 問題 | イベント追加（23:00 限定） | 低（`allDayAccessor` 追加のみ） | **高** |
| 重なり表示 | タイムライン表示 | 低（`stackItems={true}` 追加のみ） | **高** |
| タイムゾーン | DB 保存（Safari で問題の可能性） | 中（Date オブジェクトの渡し方変更） | **中** |
