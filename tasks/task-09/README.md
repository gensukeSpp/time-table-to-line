# Task 9: E-2 タイムライン重なり表示 — 検証プラン

> **紐付け元:** [`tasks/task-07/phase-e-findings.md`](../task-07/phase-e-findings.md) — Phase E の **E-2: タイムライン重なり表示**。
>
> **対象範囲:** 本タスクは **検証プラン** に特化する（実装の `stackItems={true}` 追加は前提として別途実施済み／実施すること）。
> **前提:** `TimelinePage.tsx` の `<Timeline>` に `stackItems={true}` が入っている状態から開始する。

## 目的（Goal）

タイムライン上で、**同一ユーザー（同一 `staff_id` ＝ 同一グループ行）のイベントが時間的に重複するとき、双方が隠れずに上下に積み重ねて表示される**ことを、実ブラウザで確定する。

## 検証対象の整理（重要・ユーザー指摘を反映）

- 本アプリでは **グループ行 = ユーザー（`staff_id`）単位**。`getGroup()` が `staff_id` → group id、`getItems()` が `staff_id` → item.group にマップする。
- したがって **異なるユーザーはそもそも別グループ行** に描画されるため、重なりは発生しない（**この部分の検証は不要**）。
- **検証すべき唯一のケースは「同一ユーザー（同一グループ行）・同一時間帯」の重複**。この時のみ同じ行でアイテムが衝突し、`stackItems` が上下に積み重ねる。
- ライブラリ仕様（`react-calendar-timeline/README.md:276`）に「stackItems はミリ秒/Moment 必須、native `Date` 不可」とあるが、内部は `.valueOf()` 比較のため `Date` でも機能する可能性が高い。**native `Date` のままで機能するかを必ず確定する**（最重要リスク）。

## 変更対象ファイル（検証用データのみ・本番ロジックは既存のまま）

- **Modify:** `src/lib/SampleState.ts` — 同一ユーザーで時間重複するデモイベントを追加
- **Modify:** `src/stories/Timeline.stories.tsx` — モックの group と items の id を一致させ、重なりが見える状態にする
- **Test（任意）:** `src/tests/` に同一ユーザー重複イベント用の描画テスト

> 本番ロジック（`TimelinePage.tsx` の `stackItems={true}`）は変更しない（Task 9 は検証のみ）。

---

## 検証データの設計

### 現状の問題点（なぜデータ調整が必要か）

検証するには「**同一ユーザー（同一 group id）・時間重複**」の 2 イベントが必要。しかし:

1. `exEvents`（`SampleState.ts`）には同一 `staff_id` で時間が重なるイベントが**存在しない**（staff 500: item1 now..+1h / item3 +2h..+3h は非重複）。
2. Storybook では item の group（`staff_id`=500/501）と mock の group id（`staff_id`=1/2）が**不一致**で、アイテムが行に載らない可能性がある。

### 検証データの追加（SampleState.ts）

`exEvents` に、**staff_id 500 で item1 と時間が重複する**イベントを追加する。

```ts
// 既存 item1: staff_id 500, start=now, end=now+1h
{
  id: 4,
  group: 2,
  staff_id: 500,                          // 同一ユーザー（item1 と同じグループ行）
  title: 'item 4 (same-user overlap)',
  start_time: addHours(new Date(), 0.5),  // now+30分
  end_time: addHours(new Date(), 1.5),    // now+90分  → item1 と時間重複
  start: adjustTime(1),
  end: adjustTime(2),
},
```

> **シナリオ整理（検証すべき/不要なケース）**
>
> | ケース | 状態 | stackItems の期待挙動 | 検証要否 |
> |--------|------|----------------------|----------|
> | 同一ユーザー・時間重複（item1 / item4） | **衝突** | 上下に積み重ねて両方表示 | **要** |
> | 同一ユーザー・時間非重複（item1 / item3） | 衝突なし | 同一行に隣接表示（変化なし） | 要（回帰確認） |
> | 異なるユーザー（staff 500 / 501） | 別グループ行 | そもそも別行で衝突なし | 不要 |

### Storybook の group id 整合（Timeline.stories.tsx）

`getItems` は item.group = `staff_id`。mock グループ `mockGroupMembers` の `staff_id` を **exEvents の staff_id（500 / 501）に揃える**。

```ts
const mockGroupMembers: GroupUserProps[] = [
  { staff_id: 500, family_kana: "group 1", last_kana: "last1" },
  { staff_id: 501, family_kana: "group 2", last_kana: "last2" },
];
```

これで item.group（500/501）と group id（500/501）が一致し、重なり描画を視覚確認できる。

---

## 検証シナリオと合格基準

### Scenario 1: 同一ユーザー・時間重複 → 積み重ね表示（核心）

- **確認:** グループ行（staff 500）に item1 と item4 が **上下に分かれて** 完全に見える（どちらも隠れない）。
- **合格:** item1 と item4 の描画矩形が縦方向にずれ、両方 read できる。DOM 上、各 item に `style.top` が異なる値を持つ。

### Scenario 2: 同一ユーザー・時間非重複 → 回帰なし

- **確認:** staff 500 の item3（+2h..+3h）は従来どおり同じ行に表示される（積み重ねられない）。
- **合格:** 非衝突アイテムの描画位置・見た目が従来と変わらない。

### Scenario 3: 異なるユーザー → 別行のまま

- **確認:** staff 501 の item2 は独自の行に表示される（変化なし）。
- **合格:** 別行に描画され、重なり表示の影響を受けない。

### Scenario 4: native `Date` でも stackItems が機能するか（最重要リスク）

- **確認:** README の「ミリ秒/Moment 必須」が 0.30.0-beta.4 で実際に効くか。
- **合格:** `start_time` / `end_time` が `Date` のままでも Scenario 1 が成立する。
- **不合格時の対処（その場合のみタスク追加）:** item を渡す前に `start_time` / `end_time` を `.getTime()` の数値に変換（+ 型整合）。→ `TimelinePage.tsx:82-86` と `TimelineType.ts` の `TimelineEventProps` 型を `TimelineItem<number>` 側に合わせる変更が必要。

### Scenario 5: グループ行高の伸長

- **確認:** 積み重なるとグループ行の高さが `lineHeight=60` を超えて伸び、項目が欠けない。
- **合格:** 伸長してもスクロール・配置が崩れない。必要あれば `itemHeightRatio` / `itemVerticalGap` で調整（表示のみ）。

---

## 検証手順（実行コマンド）

**Step 1: 検証データを反映**

```bash
# SampleState.ts / Timeline.stories.tsx の追加・修正を適用済みの状態にする
```

**Step 2: Storybook で確認**

```bash
bun run storybook
```

→ ブラウザで `MyTimeline` ストーリーを開き、Scenario 1〜5 を目視確認。

**Step 3（任意）: 単体テスト**

同一ユーザー・時間重複のデータで stackItems が有効なことを assert するコンポーネントテストを追加する場合、`src/tests/` に配置し `bun run testrun` で確認。

**Step 4: 品質ゲート**

```bash
bun run lint        # 0 error / 0 warning
bun run build       # PASS
bun run testrun     # 全 PASS（既存テストに回帰なし）
```

---

## 完了条件（Done）

- [ ] Scenario 1: 同一ユーザー・時間重複のイベントが上下に積み重ねて両方表示される
- [ ] Scenario 2: 同一ユーザー・時間非重複は従来どおり（回帰なし）
- [ ] Scenario 3: 異なるユーザーは別行のまま（変化なし）
- [ ] Scenario 4: native `Date` のままで stackItems が機能することを確定
- [ ] Scenario 5: グループ行高が伸長しても崩れない
- [ ] lint / build / testrun 全て緑

## 検証実績（実施結果・確定した事実）

> 実ブラウザ（Storybook 上、react-calendar-timeline 0.30.0-beta.4）で確定。

- **Scenario 4（最重要）: native `Date` では stackItems は機能しない。**
  - `stackItems={true}` のみで `Date` のまま渡した状態 → 同一ユーザーで時間重複する 2 イベントが **同一 `top: 10.5`** に描画され（重なり合い、下が隠れる）、スタックされないことを DOM で確認。
  - README の「ミリ秒/Moment 必須、native `Date` 不可」が **0.30.0-beta.4 でも実際に当てはまる**ことを実ブラウザで確定。
- **対応: `Date` → ミリ秒 `number` 変換を適用。** `src/lib/TmelineData.ts` に `toTimelineStackItems()`（純関数）を新設し、`TimelinePage.tsx` の `<Timeline items>` で使用。実装詳細は [`stackItems-date-implementation.md`](./stackItems-date-implementation.md)。
- **Scenario 1（核心）: 変換後、同一ユーザー・時間重複が積み重なることを確定。**
  - 変換後: item1 `top: 10.5`、item4（item1 と時間重複）`top: 70.5`（差はちょうど `lineHeight=60`）→ **上下に積み重ねて両方表示**。
  - `getBoundingClientRect` でも item1 top 148 / item4 top 208（Δ60px）で確認。
- **Scenario 2: 同一ユーザー・時間非重複**（item3）→ `top: 10.5` のまま（同一行に隣接、積み重ねなし）。
- **Scenario 3: 異なるユーザー**（item2 / staff 501）→ 別行（`top: 268`）のまま。
- **Scenario 5: グループ行高** → スタックにより行高が `lineHeight=60` を超えて伸長し、積み重ねた双方が欠けずに表示されることを確認。

### 完了状態

- [x] `TimelinePage.tsx` に `stackItems={true}` + `toTimelineStackItems(state)` を適用
- [x] `toTimelineStackItems()` の単体テスト（`src/tests/tmelineData.spec.ts`）PASS
- [x] 検証用データ（`Timeline.stories.tsx` の `timelineOverlapEvents`）で同一ユーザー重複を表示
- [x] 同一ユーザー・時間重複が上下に積み重ねて表示される（DOM で確定）
- [x] lint / build / testrun 全て緑（29 passed / 1 skipped）
- [x] 既存カレンダー・DnD・フォーム（`Date` のまま）に影響なし（`exEvents` は無変更）

## リスク・トレードオフ・未解決点

- **README の「ミリ秒/Moment 必須」記述**: 最大の不確定要因。0.30.0-beta.4 の実コードは `.valueOf()` ベースのため `Date` で動く可能性が高いが、**必ず実ブラウザで確定**。ダメなら数値変換を伴う修正（型整合含む）が必要になり、その時のみスコープが拡大する。
- **グループ行高の伸長**: 積み重ねで行高が `lineHeight=60` を超えるのは想定内だが、見た目・スクロール領域が変わる。調整が必要なら `itemHeightRatio` / `itemVerticalGap` を使用。
- **Storybook の既存の group id 不一致**: 現状 mock と items で group id がずれており、重なりを視覚確認できない。検証の前提として group id 整合（mock 500/501）を必須とする。
- **本番データでの確認**: デモデータで挙動を確定後、可能なら `bun run dev` で実データ（同一 staff に時間重複するイベント）でも同様に積み重なることを確認する。
