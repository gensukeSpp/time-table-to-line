# テスト計画 — 2 つの調整と、1 つの仕様変更

## 1. 静的品質ゲート（全タスク共通）

| コマンド | 期待 |
|---------|------|
| `bun run testrun` | 全 PASS（既存 + 新規 spec / test） |
| `bun run lint` | `--max-warnings 0`（0 error / 0 warning） |
| `bun run build` | 0 errors（tsc + vite） |
| `cd ../light_token_server && .venv/bin/python -m pytest tests/test_timetable.py -q` | 全 PASS |

> `.python-version` が 3.13 を指すが pyenv に未インストールのため、素の `python` は失敗する。**`.venv/bin/python` を明示**する。
> フロントは `console.log` 禁止（AGENTS.md）。未使用 import / 変数は lint で排除（Task 4 の `authId` 削除で対応）。

## 2. 単体テスト

### 2-1. バックエンド（pytest, `tests/test_timetable.py`）

| 追加テスト | 検証内容 | 受入 |
|-----------|---------|------|
| `test_event_update_progress_null_clears` | `progress` に値を設定 → **null で解除** → `GET /event/all` でも null が反映される | 2 |

> **既存テストの回帰:** `test_event_update`（progress 上書き）は変更しない。`progress: "done"` の上書きは従来どおり動くこと（`model_fields_set` に `'progress'` が含まれるため）。

### 2-2. フロント（Vitest）

| 対象 | ファイル | 検証内容 | 受入 |
|------|---------|---------|------|
| 進捗 null | `src/tests/InputItem.spec.tsx` | 進捗がある自分のイベントで、進捗セレクトをプレースホルダー（`''`）へ戻すと `toHaveValue('')` になり、**更新で `progress: null` を送信**する | 2 |
| フォームリセット | `src/components/organisms/MilestoneCreateDialog.test.tsx` | 1 回目: 開いて入力 → コミットで閉じる。2 回目: 再度開くと**タイトルが空** | 1 |

**注意（InputItem.spec）:** 進捗 null テストを追加するとき、`useEventMutation`（`useUpdateEventMutation` / `useDeleteMutation`）の **module モックを追加**する。無いと `mutate.mock.calls` を取得できない。既存の edit モードテスト（マイルストーン選択）はミューテーションを fire していないため、モック追加で壊れない。進捗セレクトは DOM 順で `combobox` の 0 番目（マイルストーンは 1 番目）。

**タイムゾーン/検証の落とし穴:**
- 進捗セレクトを `''` に戻したときの値表示は `toHaveValue('')`（プレースホルダーは `{ value: '' }` なので `value === ''` が正しい。ラベル文字列 `'---進捗を選んでください---'` と混同しない）。
- `progress: undefined` と `null` は**別物**。テストは `toBeNull()` で assert（`undefined` だとバックエンドで解除されない）。

## 3. 実ブラウザ確認（ユーザーが実施）

Timeline 画面（`/timeline`）と Calendar 画面（`/calendar`）にて。

1. **受入 1**: 管理者で「マイルストーン作成」→ タイトル等を入力 → 追加で閉じる → もう一度「マイルストーン作成」→ **フォームが空**であること
2. **受入 2**: 自分のイベントを Calendar で開き、進捗を一度選ぶ（例: 「まだ」→ 紫系）→ プレースホルダー（「---進捗を選んでください---」）へ戻す → 保存 → **配色がデフォルト `#3174ad`（青）に戻る**こと。別タブ / 再取得後も進捗が空であること
3. **受入 3**: **一般ユーザー（admin=false）** で Timeline を開き、**他メンバーのイベント**をクリック → **詳細モーダル（閲覧専用）** が現れること。そのモーダルに**更新 / 削除ボタンが出ない**こと。自分のイベントも同様に開けること
4. （回帰）: 管理者も他メンバー / 自分のイベントの詳細を開けること。マイルストーン一覧・作成・詳細モーダルが従来どおり動くこと

## 4. リグレッション

- `InputItem.spec.tsx`（進捗 / マイルストーン選択、readOnly）が通ること。進捗 `data` をプレーン文字列 → オブジェクトに変えても選択肢ラベル（`これから` 〜 `完了`）が不変なこと。
- `MilestoneCreateDialog.test.tsx`（5 件）が通ること。リセット `useEffect` 追加で初回オープン / 送信 / 送信無効化ロジックが壊れないこと。
- `Timeline.spec.tsx`（Storybook スモーク）が通ること — ツールバー DOM は不変。
- バックエンド `test_timetable.py` 全体が通ること — `test_event_update`（progress 上書き）の回帰が無いこと。
- `CalendarView.spec.tsx` / `progressColor.spec.ts` が通ること — 配色は不変（null 時 `#3174ad` のみ確認）。

## 5. リスク対応

| リスク | 対応 |
|-------|------|
| ゲート撤去で `authId` が未使用 → lint エラー | `TimelinePage.tsx:59` の `authId` 宣言を削除（`isAdmin` は残す） |
| `progress: undefined` 送信で解除されない | フロントは必ず `''` → `null` へ変換し明示送信。テストは `toBeNull()` |
| 進捗 `data` 変更で選択肢が変わる | ラベルは不変。`InputItem.spec` + 実ブラウザで確認 |
| 閲覧緩和で編集 UI が誤表示 | 詳細モーダルは常に `readOnly` + `AddChildForm` が `isOwnEvent` で編集ボタンを制御（PR #21 契約のまま） |