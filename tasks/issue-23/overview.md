# 概要 — イベントのマイルストーン所属と配色（Issue #23）

## 目的

個別のイベントを一つのマイルストーンに「所属」させ、所属を視覚的に明瞭化する。Calendar（タイムテーブル）で所属を設定し、Timeline では所属マイルストーンの色でイベントを表示する。所属先が `waiting`（close 猶予期間）の場合は `opacity: 0.7` の網掛けを施す。

## ユーザーストーリー

1. **一般ユーザー** が Calendar で自分のイベントをクリックし、詳細フォームを開く
2. 進捗セレクトの下にある「マイルストーン」セレクトから、**open 状態**のマイルストーン（または「所属なし」）を選ぶ
3. 「更新」をクリックすると `/event/update/{event_id}` に `milestone_id` が送信され DB に保存される
4. Timeline を開くと、そのイベントが**マイルストーンの色**で表示される
5. 所属マイルストーンが `waiting` 状態なら、その色に**網掛け（opacity 0.7）**がかかる
6. 管理者が他メンバーのイベントを Timeline 詳細（readOnly）で開くと、所属マイルストーン名が表示される

## スコープ

### スコープ内
- `AddChildForm`（`src/components/organisms/InputItem.tsx`）にマイルストーンセレクトを追加（open のみ列挙）
- 所属変更の保存は既存 `EventUpdateButtons`（`/event/update/{id}`）を流用
- Timeline（`GroupHorizonTimeline`）のイベント配色：`milestone_id` → `MilestoneProps.color`
- `waiting` 判定と `opacity: 0.7` 網掛け（`completed` は boolean のまま維持）
- readOnly 詳細での所属マイルストーン名表示

### スコープ外（次 Issue / 実装済み）
- マイルストーン close → 子イベント `completed=True`（バックエンド Issue #18 で済み）
- Calendar（react-big-calendar）側でのイベント配色（requirement-03 では適用範囲は Timeline のみ）
- マイルストーン CRUD の UI（Issue #16/#18 済み）

## 前提・依存

- **バックエンドは実装済み**。`light_token_server/app/routers/timetable.py:187-206` の `POST /event/update/{event_id}` が `EventUpdate` の `milestone_id` / `completed`（`app/schemas.py:20-21,27-28`）を受け付けて部分更新する。フロントの型変更は不要（`TimelineEventProps.milestone_id` は既存）。
- `/milestone/all`（`timetable.py:276-288`）は **open + waiting** を返す（closed を除く）。セレクトにはこのうち **status === 'open' のみ** を表示する（受け入れ要件 1）。
- `MilestoneStatus`: `'open' | 'waiting' | 'closed'`。waiting 判定はこの status を `/milestone/all` から lookup して行う（`completed` は使わない）。
- 認証は `AuthAxios` インターセプターが全リクエストに `Authorization` を付与済み。追加配線不要。
- Timeline のイベント描画は `react-calendar-timeline`（0.30.0-beta.4）。項目の色は `itemRenderer` / `getItemProps({ style })` で制御する（後述 architecture §3）。

## リスク・注意

| リスク | 対処 |
|--------|------|
| waiting マイルストーンに現在所属中のイベントを開くと、セレクトの選択肢（open のみ）に現在値が無い | 現在所属のマイルストーンをセレクトのオプションに含め、値を round-trip させる（「所属なし」も選択可） |
| セレクト変更が保存されない | 保存は既存「更新」ボタン（`EventUpdateButtons` → `/event/update/{id}`）に乗せる。`eventItem.milestone_id` を state に持たせ、更新時に `{...indicateEvent, milestone_id}` が送られること |
| `itemRenderer` 実装でデフォルト描画（resize ハンドル・`rct-item-content`）を壊す | `getItemProps()` / `getResizeProps()` を利用してデフォルトの div 構造を再現する。`canResize={false}` なので resize ハンドルは描画されない |
| 色が `#2196f3`（デフォルトイベント色）に近い | バックエンド pallet が open 中の未使用色を自動選択済み（Issue #16）。フロントは表示のみ |
| 所属解除（`milestone_id: null`）が保存されない | **決定（Q1）:** バックエンド `model_fields_set` 対応を先に入れる（`light_token_server` で実施、フロントからは行わない）。フロントは「所属なし」→ `null` を送る。保存確認はバックエンド対応後に実施 |
| 閉じたマイルストーン所属イベントの色 | **決定（Q2）:** デフォルト色 `#2196f3` のまま（YAGNI 推奨どおり）。`/milestone/all` に closed は含まれないため色は引けない → `computeItemDecorations` は `{}` を返し既定色。将来 join での派生が必要なら `milestone_status` 追加フィールドを検討 |

## 完了条件（Done）

- [ ] `bun run build` が 0 error
- [ ] `bun run lint` が 0 error / 0 warning（`--max-warnings 0`）
- [ ] `bun run testrun` が全 PASS
- [ ] Calendar 詳細フォームのセレクトに open マイルストーンのみ表示される（受け入れ 1）
- [ ] 所属変更 + 更新 → `/event/update/{id}` で保存され、再取得時に反映される
- [ ] Timeline で所属イベントがマイルストーンの色で表示される（受け入れ 2）
- [ ] waiting マイルストーン所属イベントに `opacity: 0.7` がかかる（受け入れ 3）
- [ ] 詳細は [`test-plan.md`](./test-plan.md) を参照