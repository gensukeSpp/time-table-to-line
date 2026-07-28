# Phase E: バグ調査（タスク 8 への橋渡し）

> **実行方式:** subagent 並列（E-1, E-2, E-3 を 3 並列で調査）
> **リスク:** 低。調査のみでコードを変更しないため。確認結果に基づいて別途修正計画を立てる。
> **所要時間:** 各 5〜10 分の調査、合計 15〜30 分

## ゴール

3 つの既知バグの根本原因を特定し、タスク 8（バグ修正）のための調査レポートを残す。この Phase ではコードは変更しない。

---

## E-1: 11PM 問題の調査

**Objective:** PM 11:00 にイベントが追加できない問題の原因を特定する。

### 調査手順

**Step 1: CalendarComponent の allDayAccessor 設定を確認**

以下の 3 つのパターンが考えられる:

1. **`allDayAccessor` が有効になっている** → 183 行目はコメントアウトされているが、デフォルト動作で 23:00 が「日をまたぐ」と解釈される可能性
2. **`onSelectSlot` → `slotInfo` の値** → `slotInfo.start` が 23:00 のとき、react-big-calendar が自動的に allDay スロットに振り分ける
3. **`slotInfo` → `DialogOnSlot` → `TitleInput` の流れ** → `slotInfo.start` の値が正常か

```bash
# 調査コマンド
grep -n "allDay\|slotInfo\|onSelectSlot\|Slots" src/components/pages/CalendarComponent.tsx
grep -n "slotInfo\|SlotInfo" src/components/organisms/DialogOnSlotComponent.tsx
grep -n "slotStartTime\|startDT" src/components/organisms/InputTitleDialog.tsx
```

**Step 2: react-big-calendar の SlotInfo ドキュメント確認**

`onSelectSlot` のコールバックが返す `SlotInfo` オブジェクトの構造を確認。特に:
- `start` / `end` の値がどのタイムゾーンで返されるか
- `slots` 配列の内容
- `action` プロパティの値

**Step 3: 仮説検証**

**仮説 A（最も可能性が高い）:** react-big-calendar は `start` 時間が 23:00（UTC 換算で 14:00）の場合、`end` が翌日の 0:00 になるため期間が「日をまたぐ」と判断し、allDay スロットに割り振る。

**仮説 B:** `onSelectSlot` → `setSlotInfoState` → `useEffect` で `onSlotInfo` に渡す流れで、`slotInfoState` が正しく伝搬していない。

**仮説 C:** `DialogOnSlot` の `useEffect` で `setOpenDialog(true)` が常に呼ばれる（19-21 行目）。`slotInfo` が undefined にならない限りダイアログが開きっぱなしになる。

### 調査結果の記録場所

調査結果は `tasks/task-07/phase-e-findings.md` に追記する（Phase E 全体の調査結果を集約）。

---

## E-2: タイムライン重なり表示の調査

**Objective:** タイムライン（react-calendar-timeline）でイベントの重なり表示ができない原因を特定する。

### 調査手順

**Step 1: react-calendar-timeline の重なり表示関連オプションを確認**

公式ドキュメントで以下のプロパティを調査:
- `stackItems` — 重なったアイテムを積み重ねて表示するか
- `itemHeightRatio` — アイテムの高さ比率
- `lineHeight` — 現在 60 に設定

**Step 2: 現在の設定を確認**

```bash
# TimelineComponent.tsx の Timeline 要素の props を確認
grep -n "Timeline\|stackItems\|itemHeightRatio\|lineHeight\|canMove\|canResize" src/components/pages/TimelineComponent.tsx
```

**Step 3: データ構造を確認**

`getItems` 関数が返すアイテム配列で、同じグループ・時間帯に複数のイベントが存在するケースがあるか確認。

```bash
# SampleState.ts の exEvents で重なりケースがあるか
grep -A5 "exEvents" src/lib/SampleState.ts | head -30
```

**Step 4: 仮説検証**

**仮説 A:** `stackItems` がデフォルトで `false` になっている。`true` に設定すれば重なり表示が可能になる。

**仮説 B:** 現在 `canMove={false}`, `canResize={false}` が設定されているが、これらが重なり表示に影響する可能性は低い。

**仮説 C:** イベントデータ自体に重なりがない（元データで時間が重複していない）。

### 調査結果の記録

結果は `tasks/task-07/phase-e-findings.md` に追記。

---

## E-3: タイムゾーン問題の調査

**Objective:** DB 保存時刻が日本時間ではない問題の原因を特定する。

### 調査手順

**Step 1: データの流れを追跡**

```
ユーザーがカレンダー上でイベント作成（日本時間 JST）
  → onSelectSlot で slotInfo.start / slotInfo.end を取得
  → DialogOnSlot で TitleInput に slotStartTime を渡す
  → TitleInput で format(slotStartTime, "yyyy-MM-dd HH:mm:ss")
  → createEvent.mutate で POST /event/add
```

**Step 2: 各段階でのタイムゾーン処理を確認**

- `queries.ts` の各クエリで `new Date(item.start ?? new Date())` としている — これは「文字列を Date に変換しているだけ」で、タイムゾーン変換は行っていない
- `TitleInput.tsx` の `startDT` は `format(slotStartTime, "yyyy-MM-dd HH:mm:ss")` — `slotStartTime` が既にブラウザのローカル時間（JST）かどうかが鍵

**Step 3: 仮説検証**

**仮説 A:** `slotInfo.start` は react-big-calendar がブラウザのローカル時間で返すが、`format()` はローカル時間でフォーマットする。つまりブラウザ上では正しく JST に見える。しかし `new Date(startDT)` で Date オブジェクトに再変換するとき、ISO 8601 形式でない文字列（`"2026-07-28 23:00:00"`）はブラウザによってパース結果が異なる。

**仮説 B:** サーバーに送信する際、Axios が Date オブジェクトを自動的に UTC の ISO 文字列にシリアライズするため、サーバー側では UTC として保存される。結果として DB 上では JST-9h の時刻になる。

**仮説 C:** `fetchEventsData` で `new Date(item.start)` が UTC 文字列をパースするため、UI 上では自動的にローカル時間に変換されて正しく見える。

### 調査結果の記録

結果は `tasks/task-07/phase-e-findings.md` に追記。

---

## 調査結果の集約

調査完了後、`tasks/task-07/phase-e-findings.md` を作成し、以下のフォーマットで記録する:

```markdown
# Phase E 調査結果

## E-1: 11PM 問題

**原因:** [特定した原因]
**再現手順:** [手順]
**修正案:** [候補となる修正]
**影響ファイル:** [ファイルパス]

## E-2: タイムライン重なり

**原因:** [特定した原因]
**再現手順:** [手順]
**修正案:** [候補となる修正]
**影響ファイル:** [ファイルパス]

## E-3: タイムゾーン問題

**原因:** [特定した原因]
**再現手順:** [手順]
**修正案:** [候補となる修正]
**影響ファイル:** [ファイルパス]

---

## 優先度評価（タスク 8 に向けて）

| バグ | 影響範囲 | 修正難易度 | 優先度 |
|------|---------|-----------|--------|
| 11PM 問題 | イベント追加 | [低/中/高] | [低/中/高] |
| 重なり表示 | タイムライン表示 | [低/中/高] | [低/中/高] |
| タイムゾーン | DB 保存 | [低/中/高] | [低/中/高] |
```