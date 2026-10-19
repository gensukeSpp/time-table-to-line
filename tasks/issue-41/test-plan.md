# テスト計画 — 'closed' のマイルストーンのイベントを参照

## 1. 静的品質ゲート（全タスク共通）

| コマンド | 期待 |
|---------|------|
| `bun run testrun` | 全 PASS（既存 + 新規 spec / test） |
| `bun run lint` | `--max-warnings 0`（0 error / 0 warning） |
| `bun run build` | 0 errors（tsc + vite） |
| `cd ../light_token_server && .venv/bin/python -m pytest tests/test_milestone.py -q` | 全 PASS |

> `.python-version` が 3.13 を指すが pyenv に未インストールのため、素の `python` は失敗する。**`.venv/bin/python` を明示**する。
> フロントは `console.log` 禁止（AGENTS.md）。未使用 import / 変数は lint で排除。

## 2. 単体テスト

### 2-1. バックエンド（pytest, `tests/test_milestone.py`）

| 追加テスト | 検証内容 | 受入 |
|-----------|---------|------|
| `test_closed_milestones_returns_closed_sorted_desc` | closed のみ・`accomplished_date` 降順・open を含まない | 2, 5 |
| `test_closed_milestones_puts_null_accomplished_last` | 削除 API 由来（達成日 NULL）の closed が末尾、`accomplished_date is None` | 2, 5 |
| `test_closed_milestones_excludes_open_and_waiting` | open / waiting は空配列 | 2 |
| `test_closed_milestones_forbidden_for_non_admin` | 非 admin → 403 | 1 |

> **既存テストの回帰:** `test_closed_milestone_events_*`（8 件）と `test_milestone_events_*`（Issue #40 更新分）は**変更しない**。新規ルート追加で 404 にならないこと（＝ルート衝突なし）を pytest 全体で担保する。

### 2-2. フロント（Vitest）

| 対象 | ファイル | 検証内容 | 受入 |
|------|---------|---------|------|
| 純粋ヘルパ | `src/tests/milestoneEvents.spec.ts` | `filterCompletedEvents` が「完了」ラベル / `complete` トークンのみ残し、null / 他進捗を落とす。空配列 | 3 |
| 純粋ヘルパ | `src/tests/milestone.spec.ts`（新規） | `formatAccomplishedDate` が `yyyy/MM/dd`、null / undefined → `達成日なし` | 4 |
| Query hook | `src/resources/queries.spec.tsx` | `useClosedMilestonesQuery(enabled=false)` で fetch しない / `true` で 1 回。`useClosedMilestoneEventsQuery(id=null)` で fetch しない / id ありで `(7)` 呼び出し | 2 |
| Drawer | `src/components/organisms/ClosedMilestoneDrawer.test.tsx`（新規） | ① closed 一覧にタイトル + 達成日（null → 達成日なし）② マイルストーン行クリックで **完了イベントのみ** ③ イベント行クリックで staff_id / group_name / 終了日時 ④ 空状態 | 2, 3, 4, 6 |
| ボタン | `src/components/organisms/MilestoneClosedButton.test.tsx`（新規） | 非 admin はボタン非表示 / admin はクリックで Drawer が開く | 1 |

**タイムゾーン注意:** `end` は UTC ISO 文字列（`...Z`）で返り、表示はローカル TZ。テストの時刻アサートは「分」だけを見る（`\d{2}:30` 等）。既存 `MilestoneEventsDrawer.test.tsx` と同じ方針。

## 3. 実ブラウザ確認（ユーザーが実施）

Timeline 画面（`/timeline`）にて。

1. **管理者**: ツールバー右側で「マイルストーン作成」の**直下**に「閉じたマイルストーン」ボタンが表示される
2. 管理者: クリック → 右から Drawer がスライドし、closed マイルストーンが**達成日の新しい順**に並ぶ
3. 管理者: 各行は「タイトル + 達成日（小さいフォント）」の 1 行。長いタイトルは三点リーダー → クリックで 2 行
4. 管理者: マイルストーン行クリック → 所属イベントのうち **progress「完了」のみ**がタイトル一覧で開く（「これから」「まだ」等は出ない）
5. 管理者: イベントタイトルクリック → `スタッフID` / `グループ名` / `終了日時` が表示される（終了日時が `end_time` と一致）
6. 管理者: イベントが 0 件の closed マイルストーンでは「完了イベントはありません」
7. **一般ユーザー（admin=false）**: ボタン自体が表示されない
8. 閉じる: Drawer 外クリック / Escape / 閉じるボタンで閉じる

> 参考: 一般ユーザーでの API 直叩き確認（ブラウザ DevTools）— `GET /milestone/closed` が 403 を返すこと（フロントの出し分けに依存しない多層防御の確認）。

## 4. リグレッション

- Issue #40 の '...' → `MilestoneEventsDrawer`（open / waiting）が従来どおり動く。**clamp スタイル抽出（Task 4）後も 1 行 / 2 行切替が効く**こと。
- `MilestoneList` のタイトルクリック → 詳細モーダルが開く（`MilestoneList.test.tsx` 9 件）。
- マイルストーン CRUD（作成 / close / re-open / 削除）後に一覧が更新される（`invalidateMilestoneList` が closed 一覧も無効化）。
- `Timeline.spec.tsx`（Storybook スモーク）が通る — ツールバー DOM 構造の変更（`adminBar` 追加）で壊れないこと。
- `react-calendar-timeline` のイベント配色（Issue #23）は不変。

## 5. リスク対応

| リスク | 対応 |
|-------|------|
| 新規 `GET /milestone/closed` が `/milestone/closed/{id}/events` を壊す | ルートはセグメント数が異なるため衝突しない。pytest 全体（closed events 8 件）を必ず実行 |
| 達成日 NULL の closed で表示が崩れる | `formatAccomplishedDate(null)` → 「達成日なし」。バックエンドで NULL を末尾固定 |
| `useClosedMilestoneEventsQuery` の過剰フェッチ | `enabled` を「Drawer が開いている」かつ「行が開いている」に限定 |
| `vi.mock('./fetch')` の列挙漏れ | `fetchClosedMilestones` / `fetchClosedMilestoneEvents` を必ずファクトリへ追加（漏れるとモジュール解決エラー） |
| 共有 CSS 抽出で Issue #40 の見た目が変わる | クラス名は同一。`flex: 1; min-width: 0` を追加しても縦並びの既存 Drawer には影響しない（テストで確認） |
| ボタン配置が toolbar のレイアウトを崩す | `adminBar`（column, align-items: flex-end）で右寄せ維持。`MilestoneAddButton.css.ts` の余白二重を解消 |
