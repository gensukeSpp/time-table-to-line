# テスト計画 — イベントのマイルストーン所属と配色（Issue #23）

## 1. 静的品質ゲート（全タスク共通・親が実施）

| コマンド | 期待 |
|---------|------|
| `bun run testrun` | 全 PASS |
| `bun run lint` | 0 error / 0 warning（`--max-warnings 0`） |
| `bun run build` | 0 errors（tsc + vite build） |

注意: `console.log` を残さない（AGENTS.md 方針）。未使用 import / 変数を残さない（`--max-warnings 0` が検出）。

## 2. 単体テスト

### 2-1. `src/tests/milestoneLookup.spec.ts`（新規、純粋ロジック）
- `buildMilestoneColorMap` / `buildMilestoneStatusMap` が id → color / status を返す
- `computeItemDecorations`:
  - open 所属 → `{ backgroundColor }` のみ（受け入れ 2）
  - waiting 所属 → `{ backgroundColor, opacity: 0.7 }`（受け入れ 3）
  - 未所属（undefined / null）→ `{}`（デフォルト色のまま）
  - closed（map に無い id）→ `{ backgroundColor: undefined なし }`（色なし・opacity なし）

### 2-2. `src/tests/InputItem.spec.tsx`（既存に追記）
- edit モード: セレクトに **open のみ** 表示、waiting は出ない（受け入れ 1）
- セレクト選択で `eventItem.milestone_id` が number として更新される
- （opts）`EventUpdateButtons` の `handleUpdate` が `milestone_id` を含むペイロードで `/event/update/{id}` を送る（`useUpdateEventMutation` の mutationFn 引数を spy する）

### 2-3. 参照パターン
- テストの Provider 構成: `src/tests/InputItem.spec.tsx`（MantineProvider + QueryClientProvider + AuthStateContext.Provider `{type:'token'}`）を踏襲
- react-query のモック: `queryClient.setQueryData(milestoneKeys.all(), mockMilestones)` で `/milestone/all` を seed（ネットワーク遮断、`staleTime: Infinity`）— `src/stories/Timeline.stories.tsx` / `InputItem.spec.tsx` のやり方と同様

## 3. 実ブラウザ確認（ユーザー自身が実施）

1. バックエンド `light_token_server`（port 8000）を起動し、ログイン → `/calendar?userID=` へ遷移
2. **Calendar**: 自分のイベントをクリック → 詳細フォームに「マイルストーン：」セレクトがあり、**open 状態のみ**列挙されている（waiting / closed は出ない）
3. セレクトで open マイルストーンを選び「更新」→ `/event/update/{id}` に `milestone_id` が送信され DB 保存される
4. **Timeline**: 所属したイベントがマイルストーンの色で表示される
5. 所属マイルストーンを（管理者で）`accomplished_date` 入力して「waiting」状態にする → そのイベントが `opacity: 0.7` の網掛けになる
6. 未所属イベントは従来どおりデフォルト色 `#2196f3` のまま
7. **Timeline 詳細（readOnly）**: 所属イベントをクリック → マイルストーン名が表示される

## 4. 回帰確認

- 既存 `InputItem.spec.tsx`（readOnly の更新/削除ボタン非表示、メンバー名表示）が引き続き PASS すること
- `MilestoneList.test.tsx` / `MilestoneCreateDialog.test.tsx` が PASS すること（`milestones` の取得追加による副作用が無いこと）
- Timeline の既存動作（ドラッグズーム、`onItemClick` 詳細モーダル、タブ切替時の resize）が壊れていないこと（`itemRenderer` 追加の影響確認）
- `bun run build` で型不整合が無いこと（特に `InputItem.tsx` の `NativeSelect` / `milestone_id` の number / null 変換）

## 5. リスク対応

| リスク | 対応 |
|--------|------|
| `NativeSelect` のラベル/role がテストで特定しづらい | `getAllByRole('combobox')` で 2 番目を対象にする等、`InputItem.spec.tsx` の実 DOM に合わせてセレクタ調整 |
| 所属解除（null）が保存されない | **決定（Q1）:** バックエンド `model_fields_set` 対応を先に入れる（フロント側からは行わない）。フロントは「所属なし」→ `null` を送る。単体テストは `EventUpdateButtons` が `milestone_id: null` をペイロードに含むことの検証までに留め、DB 保存の確認はバックエンド対応後に実ブラウザで実施 |
| `itemRenderer` の既存描画（クリック領域・タイトル表示）が崩れる | デフォルト `Li` renderer を再現（`rct-item-content` / `title` / resize ハンドル）。「更新」領域クリックと `onItemClick` の競合がないか実ブラウザで確認 |
| waiting 網掛けが closed と混同される | opacity は color に追加で適用（`{backgroundColor, opacity}`）し、色は残す（混同しない） |