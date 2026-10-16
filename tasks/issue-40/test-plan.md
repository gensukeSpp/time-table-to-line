# テスト計画 — 'open', 'waiting' 状態マイルストーンのイベント参照

## 1. 静的品質ゲート（全タスク共通）

| コマンド | 期待 |
|---------|------|
| `bun run testrun` | 全 PASS（既存 + 新規 spec / test） |
| `bun run lint` | `--max-warnings 0`（0 error / 0 warning） |
| `bun run build` | 0 errors（tsc + vite） |
| `cd ../light_token_server && python -m pytest tests/test_milestone.py -q` | 全 PASS |

> フロント側は `console.log` 禁止（AGENTS.md セキュリティ方針）。未使用 import / 変数は lint で排除。

## 2. 単体テスト

### 2-1. フロント（Vitest）

| 対象 | ファイル | 検証内容 | 受入 |
|------|---------|---------|------|
| 純粋ヘルパ | `src/tests/milestoneEvents.spec.ts` | ラベル / 英字トークン / null / 空 / 未知値の正規化、5 グループの表示順、空グループ除去、空配列 | 2, 3 |
| Query hook | `src/resources/queries.spec.tsx` | `enabled=false` で fetch しない / `true` で `/milestone/{id}/events` を呼ぶ | 1 |
| Drawer コンポーネント | `src/components/organisms/MilestoneEventsDrawer.test.tsx` | progress 別グループ表示、アコーディオン展開で title / staff_id / group_name / 開始日時、null → 指定なし | 2, 3, 4 |
| '...' ボタン | `src/components/organisms/MilestoneList.test.tsx` | '...' クリック → Drawer が開く（`M1 のイベント` aria-label） | 1, 6 |

### 2-2. バックエンド（pytest）

| 対象 | 変更 |
|-----|------|
| `tests/test_milestone.py::test_milestone_events_allowed_for_non_admin` | **更新**（旧 `forbidden_for_non_admin`）。非 admin でも 200 / 一覧が返る | 
| `tests/test_milestone.py::test_milestone_events_returns_events_across_groups` | **更新**。`group_name` が `SHORT_A` / `SHORT_B` になることを検証 |

> **回帰確認:** `/milestone/closed/{id}/events` の admin ゲート（`test_closed_milestone_events_forbidden_for_non_admin`）は意図どおり残るため、「非 admin → 403」のまま。改修で壊れていないことを pytest で確認する。

## 3. 実ブラウザ確認（ユーザーが実施）

Timeline 画面（`/timeline`）で確認:

1. **管理者**: マイルストーン 1 件以上のタイトル右に '...' が表示される
2. 管理者: '...' クリック → 右から Drawer がスライドし、マイルストーン名 + カラーバーが表示
3. 管理者: progress ごとにアコーディオン（これから / まだ / もうすぐ / 完了 / 指定なし）が表示
4. 管理者: 開くと各イベントの title / スタッフID / グループ名 / 開始日時が表示。グループ名が正しい（他グループ含む）
5. 管理者: 長い title は 1 行 ≒ 三点リーダー、クリックで 2 行表示になる
6. 管理者: progress 未設定（null）のイベントが「指定なし」に入る
7. **一般ユーザー（admin=false）**: 同じく '...' → Drawer を開き、イベント一覧を閲覧できる（編集ボタン等は出ない）
8. 閉じる: Drawer 外クリック / Escape / 閉じるボタンで閉じる

## 4. リグレッション

- 既存のマイルストーン CRUD（作成 / close / re-open）が Timeline で引き続き動くこと。
- `MilestoneList` のタイトルクリック → 従来の詳細モーダル（`マイルストーン詳細`）が引き続き開くこと（'...' ボタン追加による回帰なし）。
- `react-calendar-timeline` のイベント配色（Issue #23）が変わらないこと。
- `bun run testrun` 全体が通ること（`MilestoneList.test.tsx` の既存 9 件 + 追加分）。

## 5. リスク対応

| リスク | 対応 |
|-------|------|
| 非 admin の閲覧対応で既存テスト 403 → 200 の矛盾 | テストを更新（付け足さず修正、DRY）。closed 用は admin のまま残す |
| `group_name` 解決の失敗（Team 未登録） | `team if team else None` で null フォールバック → フロントは `?? '不明'` 表示 |
| Accordion / Drawer の描画がテスト環境で崩れる | Mantine `Drawer` は `opened` 既定で描画されるため通常問題なし。不安定なら `screen.getByRole('dialog')` でスコープ |
| `fetchMilestoneEvents` を mock ファクトリに追加し忘れる | `queries.spec.tsx` の `vi.mock('./fetch')` に必ず追加（追加しないとモジュール解決エラー） |
