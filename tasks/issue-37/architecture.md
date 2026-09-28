# Issue #37 — architecture.md

## 1. カレンダーレンダリング構造（現状）

`CalendarView.tsx`（`MyCalendar`）は `react-big-calendar` を `withDragAndDrop` で包んで `<DnDCalendar>` として描画する。

- `views` 未指定 → 全 5 ビュー有効（month / week / work_week / day / agenda）。
- `view={currentView}`（`useState<View>('week')`）、`date={displayDate}`（`useState(new Date())`）の**制御コンポーネント**。
- `onView` / `onNavigate` で各 state を更新。ビュー切替時に `displayDate` は再正規化されない。
- アクセサは `TimelineEventProps` の `start_time` / `end_time` / `allDayAccessor=isFullDayEvent`。
- イベント配列は `newState`（=`useEventsState()` を `staff_id === authId` でフィルタ。Issue #37 で `stateAll.length > 2` 条件を除去）。

## 2. day / agenda 空表示の調査結果（実ブラウザ確認で解決）

当初「day / agenda にイベントが表示されない」と疑ったが、**実ブラウザ確認で描画は正常と判明（見誤り）**。`architecture` として残すのは以下。

### 表示ウィンドウ（各ビューの描画範囲）
`react-big-calendar` は `date`（= `displayDate`、初期値 `new Date()`＝今日）をアンカーに範囲を決める。day は単日、agenda は未来 30 日のみのため、**過去イベントは月/週では見えるが day/agenda では範囲外**になり得る（「見誤り」の原因となった性質）。

| ビュー | 範囲（`date=displayDate` 基準） | 備考 |
|---|---|---|
| `month` | 月全体（過去日含む） | `Month.js` / `BackgroundCells` |
| `week` | `[startOfWeek(date), +7日)` | `Week.js` / `TimeGrid` |
| `day` | `[startOfDay(date)]` **単日のみ** | `Day.js:109-112`（`range = [startOf(date,'day')]`） |
| `agenda` | `[startOf(date), endOf(date+30))` | `Agenda.js:130-134`（`DEFAULT_LENGTH=30`、**未来方向のみ**） |
| `work_week` | `date` を含む平日5日 | `WorkWeek.js` |

### イベント抽出（全ビュー共通）
`localizer.inEventRange({event, range})`（`lib/localizer.js:85-98`）で判定。スコープ内ならどのビューでも抽出される（`Calendar.spec.tsx` の `defaultView='day'` が 3 件描画で PASS）。

### 発見した潜在バグ（→ 本 Issue で修正）
`stateAll.length > 2` はリファクタ前残骸で、**ユーザーのイベントが 2 件以下だと `state=undefined` になり描画されない**。`useEventsState()` は常に配列を返すため、条件を削除しても副作用なし（`CalendarView.tsx` で修正済み）。

## 3. 配色分岐の契約（進捗色の適用対象）

`src/lib/progressColor.ts` の `resolveEventColor(event, view)` を **week / day / agenda / work_week へ正式適用**する。以下が現状の挙動（変更のベースライン）。

```
const resolveEventColor = (event, view) => {
  if (view === 'month') {
    return isMonthAllday(event.start_time, event.end_time)
      ? MONTH_FULLDAY_COLOR        // #00695c（フルデイ・日跨ぎ）
      : undefined;                 // 単日時間 → rbc 既定 #3174ad
  }
  const color = progressToColor(event.progress);   // null/未知 → DEFAULT #3174ad
  return color === DEFAULT_EVENT_COLOR ? undefined : color;  // 進捗4色 or undefined
};
```

### 分岐表（Issue #37 の正式仕様）
| view | 進捗あり | 進捗なし（null/未知） |
|---|---|---|
| `week` | `progressToColor(progress)`（4色） | `undefined`（→ rbc 既定 `#3174ad`） |
| `day` | 同上 | 同上 |
| `agenda` | 同上 | 同上 |
| `work_week` | 同上 | 同上 |
| `month` | 進捗配色**なし**（`MONTH_FULLDAY_COLOR` or `undefined`） | 変化なし |

- **ロジック変更は不要**（既に day / agenda / work_week に進捗色を返す。挙動は変更しない）。doc コメントのみ明示。
- 進捗色の適用対象（week/day/agenda/work_week）はドキュメントの view 表更新（`tasks.md` Task 4）で確定する。

## 4. 変更対象と実績
本 Issue で実施・計画された変更は以下。

| 種別 | ファイル | 内容 |
|---|---|---|
| 計画 | `tasks/issue-37/*`（本一式） | 調査結果・実装記録・試験 |
| 変更（済） | `src/components/pages/CalendarView.tsx:32-34` | `stateAll.length > 2` ガード除去（2 件以下でも描画） |
| 変更（済） | `src/tests/Calendar.spec.tsx` | 2 件以下描画テスト追加 / stale コメント修正 / `console.log` 削除 |
| 変更（済） | `src/tests/progressColor.spec.ts` | day / agenda / work_week の `resolveEventColor` テスト追加 |
| 変更（済・コメントのみ） | `src/lib/progressColor.ts` | 分岐 doc コメントを明示（挙動不変） |
| 変更（済） | `specs/2026-09-25-spec.md`（新規） / `tasks/issue-35/README.md`・`architecture.md` / `docs/architecture/README.md` | 進捗配色対象 view を week → week/day/agenda/work_week に統一（view 表明示・注記追加） |

## 5. TanStack Query / 型・コンポーネント
- 本 Issue は**サーバー状態・型・新規コンポーネントの追加なし**。進捗色は既存 `eventPropGetter`（`CalendarView.tsx:80-86`）経由で `resolveEventColor(stateEvent, currentView)` を呼ぶだけ。
- `TimelineEventProps.progress` はラベル or 英字トークン共存（`progressToColor` が正規化済み。変更不要）。
- `currentView` は `View` 型（`week|day|agenda|work_week|month` を包含）。`resolveEventColor` の引数が `View` なので拡張不要。

## 6. 設計上の注意（Issue #35 からの踏襲事項）
- `eventPropGetter` は `currentView` を閉じ込めるため、`const [currentView, setCurrentView] = useState<View>('week')` **より後に**宣言する（TDZ 回避、issue-30/35 と同じ配置規則）。`useCallback(fn, [currentView])`。
- day / agenda でも `eventPropGetter` の inline style が `getters.eventProp(...).style` として適用されることを rbc 1.20.0 で確認済み（`Agenda.js:50` ほか）。
- 月ビューの `isMonthAllday`（Issue #30 の teal 回帰ゼロ）は**維持**する。
