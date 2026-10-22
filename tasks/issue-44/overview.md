# Overview — 2 つの調整と、1 つの仕様変更

## 目的

Issue #40 / #41 の流れで「マイルストーン作成」「イベント進捗」「グループイベントへのアクセス権限」が一通り動くようになったが、その運用を妨げる小さな問題が 3 点残っている。

1. **マイルストーンを続けて作成できない**（前回の内容がフォームに残る → 誤って同じマイルストーンを作る事故の温床）
2. **進捗状況を「未定」に戻せない**（どっちつかずの状態を表現できない、配色も戻せない）
3. **非管理者が他メンバーのイベント詳細を閲覧できない**（#40 で「マイルストーン経由で他者イベントの一部を見せた」が、直接クリックでは見られない不整合）

これらを修正し、使い勝手とグループ共有の一貫性を整える。

## ユーザーストーリー（Issue #44 より）

1. マイルストーンを 1 つ作成した直後、もう一度「マイルストーン作成」を押すとフォームが空で現れる
2. イベントに付けた進捗を削除して「未定」に戻すと、イベントの配色がデフォルト `#3174ad` に戻る
3. 一般ユーザー（非管理者）が、グループ内の**他メンバーのイベント**をクリックすると、詳細モーダル（閲覧専用）が現れる

## スコープ

### スコープ内

| カテゴリ | やること |
|---------|--------|
| バックエンド | `POST /event/update/{id}` の `progress` を「送られたか」で判別し、明示的 **null で解除できる**ようにする（`milestone_id` と同じ `model_fields_set` パターン） |
| フロント（マイルストーン） | `MilestoneCreateDialog` に再オープン時のフォーム空化（`useEffect` で 3 フィールドをリセット） |
| フロント（イベント編集） | `AddChildForm` の進捗 `NativeSelect` をオブジェクト型 `data` 化し、プレースホルダー（`''`）選択で **null** を保存できるようにする |
| フロント（権限） | `TimelinePage.handleItemClick` の「管理者 OR 自分のイベントのみ」ゲートを撤去し、**同グループメンバー全員が閲覧専用詳細モーダル**を開けるようにする |

### スコープ外

- マイルストーン CRUD・詳細モーダルの変更
- イベントの編集権限（更新 / 削除は自分のイベントのみのまま）
- 進捗の配色パレット変更（`src/lib/progressColor.ts` は不変）
- 詳細モーダルの見た目・レイアウト変更

## 前提・依存

- **`progress` の配色は既に null 対応済み**: `src/lib/progressColor.ts` の `progressToColor(null)` は `DEFAULT_EVENT_COLOR`（`#3174ad`）を返し、`CalendarView.tsx` の `eventPropGetter`（Issue #35）が rbc デフォルトへ委譲する。したがって**値が本当に null になれば配色は自動で `#3174ad` に戻る**（新規配色実装は不要）。
- **`progress` の「null にできない」根本原因は 2 箇所**:
  1. フロント `InputItem.tsx:118` の `NativeSelect` が `data` をプレーン文字列配列で渡しており、プレースホルダー選択で `'---進捗を選んでください---'` という**文字列**が `progress` に入る（null にならない）。
  2. バックエンド `app/routers/timetable.py:205-206` が `if body.progress is not None:` で null を無視し、DB へ落とさない。
- マイルストーン作成フォーム（`MilestoneCreateDialog.tsx`）は `title` / `description` / `guidelineEndDate` を `useState` で保持しており、成功時 `onClose()` するだけでリセットしない。再オープン時（`MilestoneAddButton` の `setOpened(true)`）に前回値が残る。
- 詳細モーダルは `TimelinePage.tsx:238-242` で常に `readOnly={true}` を渡す閲覧専用。`AddChildForm` は「更新 / 削除」ボタンを `isOwnEvent`（`staff_id === authId`）でのみ表示し、他メンバーには出さない（`InputItem.tsx:140-144`）。閲覧専用分岐（`InputItem.tsx:76-102`）は admin ゲートを含まない。
- 管理者判定は `/timetable/inquiry` 由来の `AuthInfoProp{type:'auth'}.admin`（`useAuthInfo()`）。イベントの `admin` フラグは常に false なので使わない。
- バックエンドのテスト実行は `.venv/bin/python -m pytest`（`.python-version` の pyenv 3.13 が未インストールのため素の `python` は失敗する）。

## リスク

1. **`isAdmin` と `authId` の未使用化（lint）** — `TimelinePage.tsx` でゲート撤去後、`authId`（L59）は唯一の使用箇所だったため**未使用**になり ESLint エラー（`--max-warnings 0`）になる。`authId` 宣言を削除する。`isAdmin`（L47）は `MilestoneAddButton` / `MilestoneClosedButton` で引き続き使用されるため残す。
2. **`progress` を「値が入っていない（undefined）」と「null」の区別を間違える** — フロント状態は undefined（未定）だが、`EventUpdateButtons` が **`?? null`** で必ず明示的 null へ変換して送る（undefined のまま JSON 化するとキーごと消え、バックエンドの `model_fields_set` に `'progress'` が含まれず解除されない）。これに伴い `TimelineEventProps.progress` を `string | null` 許容へ拡張。
3. **既存 UI との回帰** — 進捗 `data` をプレーン文字列からオブジェクトへ変えるため、`InputItem.spec.tsx` / 実ブラウザで選択肢ラベルが同じこと（`これから` … `完了`）を確認する。
4. **閲覧緩和による意図しない他者イベント編集** — 詳細モーダルは常に `readOnly`、編集ボタンは自分のイベントのみなので**閲覧のみ**に限定される。万一編集 UI が現れる場合は `readOnly` 契約（PR #21）に違反していないか確認する。
5. **フォームリセットのタイミング** — リセットは「`opened` が true になった瞬間」ではなく「false → true の遷移」で行うよう `useEffect([opened])` で実装する（常時 true レンダーではリセットしない）。

## 完了条件

- バックエンド `.venv/bin/python -m pytest tests/test_timetable.py -q` 全 PASS（新規 1 件含む）
- `bun run testrun` 全 PASS（新規 spec / test 含む）
- `bun run lint`（--max-warnings 0）0 error / 0 warning
- `bun run build`（tsc + vite）0 errors
- 実ブラウザ確認（受入 1 / 2 / 3、test-plan.md §3）