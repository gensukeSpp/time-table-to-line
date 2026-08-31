# イベント配色 (waiting opacity 0.7) に向けた `TimelineEventProps.completed` 型変更の検討

> **For Hermes:** これは設計判断のプラン。実装は非同梱 (判断確定後に別タスク化)。

**Goal:** 今後「マイルストーンに応じたイベント配色」(waiting 状態で `{"opacity": 0.7}`) を実装するにあたり、`TimelineEventProps.completed: boolean` を `'open' | 'waiting' | 'closed'` に変更すべきかを決める。

**結論 (推奨): 変更しない。** `completed` は boolean のまま維持し、waiting 由来の装飾は「イベントが属するマイルストーンの `status` (既存の `MilestoneStatus`)」から派生させる。イベントに 3 値状態を持たせたい場合は別フィールド (`milestone_status`) を追加する。

---

## 根拠

### 1. データ契約が boolean のままである (最重要)

バックエンド (`../light_token_server`) ではイベント側の `completed` は Boolean のまま:

- `app/models.py:105` — `completed = Column(Boolean, ...)` (`T_TIMELINE_EVENT`)
- `app/routers/timetable.py:324,348` — マイルストーン close 時に子イベントへ `ev.completed = True` をセット
- `app/schemas.py:21,28` — `completed: bool = False` / `completed: bool | None = None`

3 値状態 `'open' | 'waiting' | 'closed'` は **マイルストーン側** の `M_MILESTONE.status` (`app/models.py:126-137`、フロント `src/lib/TimelineType.ts:25` の `MilestoneStatus`) にのみ存在する。イベントの `completed` を 3 値にすると、フロント側の型だけがバックエンド契約と乖離する。このプロジェクトではスキーマ契約変更は両リポジトリ同時が原則 (memory: Pydantic は不明フィールドを黙って無視するため、片側だけの rename は値が静かに落ちる)。

### 2. 意味論の重複

`waiting` は「再 open の猶予期間 (waiting for close)」という **マイルストーンの状態** であり、個々のイベントの状態ではない。イベントに 3 値を持たせると:

- 「closed マイルストーンに属するが、waiting 由来でまだ completed=true になっていないイベント」のような、マイルストーン状態と同期しないイベント状態を表現できてしまう
- sync 責務 (マイルストーン close → 子イベント一括更新) と表示責務が 1 フィールドに混ざる

### 3. 表示は派生で足りる

配色の条件は「属するマイルストーンの status が waiting」であり、フロントは `/milestone/all` (open + waiting を返す: `timetable.py:281`) を TanStack Query で既に保持している。`milestone_id` で lookup して `status` を引くだけで `opacity: 0.7` は実現でき、`completed` の型変更は不要。

---

## 推奨実装方針 (判断が確定した場合のタスク分割)

### Task 1: マイルストーン status lookup の hook 用意
- **Modify:** `src/resources/` 配下 (milestone query を既に使用する箇所と同じパターン)
- `useMilestones()` の戻り値から `Map<number, MilestoneStatus>` を `useMemo` で派生させる helper (例: `buildMilestoneStatusMap`)
- **Test:** `src/tests/` に lookup の単体テスト (open / waiting / closed / 未所属 undefined)

### Task 2: Timeline 側イベント描画への opacity 反映
- **Modify:** Timeline のイベント描画コンポーネント (itemRenderer 相当) と `src/components/organisms/MilestoneList.css.ts` ではなく timeline 側の `.css.ts`
- `milestone_id` → status map → `status === 'waiting'` なら `opacity: 0.7` (Vanilla Extract は動的値を直接持てないため、`style({ opacity: 0.7 })` のクラスを条件付与する形)
- **Test:** waiting マイルストーン所属イベントに該当クラスが付くかの Testing Library テスト

### Task 3: `completed` boolean の用途の明確化 (optional)
- `TimelineEventProps.completed` は現状フロントでは未使用 (`grep` で定義箇所のみ)。使用する場面が来たら「自動 completed フラグ」として boolean のまま JSDoc コメントで意味を明記

---

## Risks / Tradeoffs

- **3 値変更を選んだ場合の代替**: UI 上でイベント単体に 3 状態を持たせたい要件が将来出た場合は、`milestone_status?: MilestoneStatus` を**追加フィールド**としてレスポンスに加える (バックエンドは milestone join で派生)。boolean `completed` は削除せず互換維持。
- **YAGNI**: 現時点で必要なのは表示のみなので、フィールド追加も保留が妥当。

## Open Questions

- waiting の opacity をカレンダー (Calendar) 側にも適用するか? (requirement-03 では Calendar は個人用・マイルストーン選択のみで、適用範囲は Timeline のみのはず)
