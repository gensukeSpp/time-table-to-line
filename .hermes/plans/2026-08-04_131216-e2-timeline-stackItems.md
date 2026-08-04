# E-2 タイムライン重なり表示 Implementation Plan

> **For Hermes:** This task is small. Implement directly (no subagent needed). The core code change is one prop; the bulk of the work is verification.

**紐付け元:** [`tasks/task-07/phase-e-findings.md`](../../tasks/task-07/phase-e-findings.md) — Phase E の **E-2: タイムライン重なり表示**。
**前提:** `bun run lint` / `bun run build` / `bun run testrun` が緑の状態から開始する。

**Goal:** 同じグループ（staff_id）で時間帯が重複するイベントを、タイムライン上で上下に積み重ねて「隠さず」表示する。

**Architecture:** `react-calendar-timeline` の `<Timeline>` に `stackItems` / グループ別 `stackItems` プロパティを有効化する。ライブラリが同一グループ内の衝突を検出し、各アイテムに `order`/`top`/`stack` を与えて重ならないよう配置する。グループ高は積み重なりに応じて自動伸長する。

**Tech Stack:** react-calendar-timeline 0.30.0-beta.4 / React 19 / TypeScript / date-fns / Vanilla Extract。

---

## 検証済みの現状（調査で確定した事実）

- `<Timeline>` JSX コンポーネントは **`src/components/pages/TimelinePage.tsx:80-99` の 1 箇所のみ**。DaysComponent はスタイル import のみ。
- `stackItems` はライブラリの有効な prop（`@types/react-calendar-timeline` line 12 / 212、`stackItems?: boolean`）。デフォルト `false`。
- アイテムは `TimelineItemBase<Date>` 型で `start_time` / `end_time` が **native `Date` オブジェクト**（`lib/TimelineType.ts:15-20`、`lib/TmelineData.ts:19-27`）。
- **重要（ライブラリ仕様）:** `react-calendar-timeline/README.md:276` に "**stackItems ... Requires millisecond or `Moment` timestamps, not native JavaScript `Date` objects.**" と明記。ただし内部の衝突・配置ロジック（`dist` 内 `zr`/`Ui`/`Ni` 等）は `.valueOf()` で比較しており、`Date.valueOf()` はミリ秒を返すため通常は動作する。→ **実ブラウザで必ず検証する**（後述のリスク）。
- **検証データの欠落:** `src/lib/SampleState.ts` の `exEvents` は、同一グループ内に**重複時間帯を持つアイテムが存在しない**（group 500: item1 now..+1h / item3 +2h..+3h は非重複）。→ 現状データのままでは Storybook 上、重なり表示を視覚確認できない。検証用に重複イベントを追加する必要がある。
- Timeline の Storybook（`src/stories/Timeline.stories.tsx:83-93`）はタイトル文字列の存在確認のみで、重なり表示は検証していない。exEvents / mockGroup を Provider 経由で注入している。

## なぜ「1 行だけ」で終わらないか（実装範囲の正直な見積もり)

実装中核は **1 プロパティ** だが、正しく動いて**いることを証明**するまでがタスクに含まれる:

1. **本実装**: `TimelinePage.tsx` に `stackItems={true}`（またはグループ別）。
2. **検証データ**: 同一グループ内の重複イベントを用意しないと確認不能。→ `SampleState.ts` に重複ケースを追加するか、実データで確認。
3. **Date vs ミリ秒のリスク検証**: README の注意書きが 0.30.0 でも当てはまるか実ブラウザで確定。
4. **レイアウト回帰確認**: 積み重なりでグループ高が `lineHeight=60` を超えて伸長 → 表示崩れの有無を確認。

つまり **コードはほぼ 1 行、作業の大半は「検証と確認」**。タスクボリュームは小。

---

## 修正方針（本プラン）

**`<Timeline>` に `stackItems={true}` を追加する。** グループ単位で制御したい場合は `groups` 配列の各要素に `stackItems` を設定する方式も選択可（`groups={getGroup(...)}` に付与）。要件は「全グループで共通に重なり表示したい」なので、コンポーネント prop 1 つで足りる。

---

## 変更対象ファイル

- **Modify:** `src/components/pages/TimelinePage.tsx:80-99` — `<Timeline>` に `stackItems={true}` を追加。
- **Modify (検証用):** `src/lib/SampleState.ts` — 同一グループで時間帯が重複するデモイベントを追加（実データで確認する場合は変更不要）。
- **Test (任意):** `src/tests/` にタイムライン重なり用のコンポーネントテスト。Storybook の play テスト拡張でも可。

---

## 実装タスク

### Task 1: `TimelinePage.tsx` に `stackItems={true}` を追加

**Objective:** タイムラインで重なったアイテムを上下に積み重ねて表示する。

**Files:**
- Modify: `src/components/pages/TimelinePage.tsx:80-99`（`<Timeline ... />`）

**Step 1:** `<Timeline>` の props に `stackItems={true}` を追加。

```tsx
<Timeline
  // ... 既存の props
  lineHeight={60}
  stackItems={true}   // 追加
  onCanvasClick={() => {}}
  onBoundsChange={onBoundsChange}
/>
```

**Step 2:** 型・ビルドが通ることを確認。

Run: `bun run build`
Expected: tsc + vite build が PASS（TypeScript は追加プロパティに問題なし）。

**Step 3: コミット**

```bash
git add src/components/pages/TimelinePage.tsx
git commit -m "feat: enable stackItems on timeline so overlapping events stack (E-2)"
```

### Task 2: 検証用に重複イベントを用意

**Objective:** 実際の重なり表示を確認できるデータを用意する。

**背景:** `exEvents`（SampleState）には同一グループ内の重複イベントが無く、Task 1 だけでは視覚確認ができない。

**Files:**
- Modify: `src/lib/SampleState.ts`（`exEvents` に重複ケースを追加）

**Step 1:** group 500（staff_id 500）に、既存 item1（now..+1h）と時間が被るイベントを追加。

```ts
{
  id: 4,
  group: 2,
  staff_id: 500,
  title: 'item 4 (overlap)',
  start_time: addHours(new Date(), 0.25),   // now+15min で item1 と重複
  end_time: addHours(new Date(), 1.25),
  start: adjustTime(1),
  end: adjustTime(2),
},
```

> 実データ（group/users が返す重複イベント）で確認する場合は、この変更は不要。Storybook は `exEvents` を EventsStateContext に注入しているため、Storybook 確認には必ずこのデータ追加が必要。

**Step 2: コミット**

```bash
git add src/lib/SampleState.ts
git commit -m "test: add overlapping demo event for timeline stackItems verification (E-2)"
```

### Task 3: 実ブラウザ（Storybook）で重なり表示を確認

**Objective:** `stackItems` が native `Date` でも実際に機能することを確定する。

**Step 1:** Storybook を起動して `MyTimeline` ストーリーを開く。

Run: `bun run storybook` → ブラウザで `MyTimeline` を表示。

**Step 2:** 確認項目:
- group 500 に item1 と item4（overlap）が **上下に分かれて**描画される（`stack` が効く）。
- group の行高が伸びて両方が完全に見える。
- **Date オブジェクトでもスタックが動作する**（README の注意書きが現実の挙動に影響しないか）。

**起こり得る不具合と対処:**
- **スタックが効かない / 描画が崩れる（Date 起因）**: README の「ミリ秒/Moment 必須」が実際に効く場合。この場合は item を渡す前に `start_time`/`end_time` を `.getTime()` の数値に変換する mapping を `TimelinePage.tsx:82-86` に追加（`TimelineItemBase<number>` として渡す）。ただし TypeScript 型（`TimelineItem<Date>`）との整合に注意 → この場合のみタスク追加。

**Step 3: 失敗時のみ — ミリ秒変換タスク（条件付き）**

```tsx
// TimelinePage.tsx:82-86 の items mapping で start/end を数値化
items={state.map((item) => ({
  ...item,
  start_time: item.start_time.getTime(),
  end_time: item.end_time.getTime(),
}))}
```

この場合 `TimelineType.ts` の `TimelineEventProps` 型も `TimelineItem<number>` 側に合わせる等の調整が必要になる（大きめの変更）。まずは Task 3 Step 2 で **Date のままで動くことを確認**し、動けば本タスクは不要。

### Task 4: 品質ゲート

**Objective:** lint / build / test を全て通し、回帰がないことを確認。

**Step 1:**

```bash
bun run lint        # 0 error / 0 warning
bun run build       # tsc + vite build PASS
bun run testrun     # 全 PASS（既存テストに影響なし）
```

**Step 2: 差分確認**

```bash
git status
git diff --stat
```

---

## 完了条件（Done）

- [ ] `TimelinePage.tsx` の `<Timeline>` に `stackItems={true}` が入っている
- [ ] Storybook で同一グループの重複イベントが上下に分かれて表示される（native `Date` のままで動作）
- [ ] group 行高が伸びても表示崩れがない
- [ ] lint / build / testrun 全て緑

## リスク・トレードオフ・未解決点

- **READEME の「ミリ秒/Moment 必須」記述**: 0.30.0-beta.4 の実コードは `.valueOf()` ベースのため Date で動く可能性が高いが、未確定。**必ず実ブラウザで確認**。ダメなら数値変換（+型調整）が必要になり、その場合のみタスク規模が大きくなる。
- **グループ高の伸長**: 積み重なりでグループ高が `lineHeight=60` を超える。意図した挙動だが、見た目・スクロール領域が変わる。`itemHeightRatio` や `itemVerticalGap` で調整が必要になる可能性を確認。
- **既存の非重複データには影響なし**: `stackItems` は衝突時のみ順序を付与するため、重ならないイベントは従来どおり描画される。
- **`lineHeight=60` 固定のまま**: スタック領域を確保するため、グループが伸びる実装（`Ki` が `groupHeight` を増やす）に依存。問題があればグループ別 `height` 指定で対応。

---

## 実行ハンドオフ

Task が小さいため直接実装を推奨（subagent 不要）。完了後、`tasks/task-08/README.md`（または新規 `tasks/task-09/README.md`）に実績として追記する運用に合わせる。
