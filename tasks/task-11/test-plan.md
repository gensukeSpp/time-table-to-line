# テスト計画 — task-11: PR #21 の ts/tsx 限定部分的取り込み

## 1. 単体テスト（Vitest + Testing Library）

### `src/tests/InputItem.spec.tsx`（新規、PR #21 最終形を移植）

| ケース | 期待結果 |
|-------|---------|
| 管理者が他メンバーのイベントを `readOnly` で開く | メンバー名（`family_kana` + `last_kana`）が表示される / 内容・進捗が Text 表示される / 更新・削除ボタンが出ない / 「異なるスタッフの、変更はできません」ダイアログが出ない |
| 自分のイベントを `readOnly` で開く | 更新・削除ボタンが出ない / `内容：` が見える（常に閲覧専用の仕様確認） |

テストモックの構成（PR #21 版どおり）:
- `queryClient.setQueryData(authKeys.verify(authToken), ...)` で `/timetable/inquiry` をモック（`staff_id: 1000`, `admin: true`）
- `queryClient.setQueryData(eventKeys.userList(), ...)` で `/group/users` をモック（`GroupUserProps[]`）
- `AuthStateContext.Provider` で token を注入

> **本ブランチ固有の注意:** `authKeys.verify` の query data は `normalizeAuthPayload` を通る。
> Task 1 完了後は `InquiryStaff` に `admin` が必須のため、モックレスポンスに `admin: true` を含めること（PR #21 版は既に含む）。

### `src/tests/EventDetailOverlay.spec.tsx`（新規、PR #21 版そのまま）

| ケース | 期待結果 |
|-------|---------|
| オーバーレイ内クリック | `onClose` が呼ばれない |
| オーバーレイ外（document）クリック | `onClose` が 1 回呼ばれる |
| `Escape` キー | `onClose` が 1 回呼ばれる |
| `Enter` 等の他キー | `onClose` が呼ばれない |

### 既存回帰テスト

| 対象 | 観点 |
|-----|------|
| `src/tests/Calendar.spec.tsx` | Calendar 側 `AddChildForm`（`readOnly` 未指定）が従来どおり動く |
| `src/tests/Timeline.spec.tsx` | タイムライン本体の既存挙動が壊れない |
| その他全 spec | `bun run testrun` 全 PASS |

## 2. 品質ゲート（親が最終実行）

```bash
bun run build      # 期待: 0 error
bun run lint       # 期待: 0 error / 0 warning（--max-warnings 0）
bun run testrun    # 期待: 全 PASS
```

## 3. 実ブラウザ確認（ユーザー実施）

前提: `bun run dev` でフロント起動、バックエンド light_token_server(port 8000) 経由でログイン。

| # | 手順 | 期待結果 |
|---|------|---------|
| 1 | 管理者でログイン → `/timeline` → 他メンバーのイベントをクリック | オーバーレイがイベント直下に重なって開く。メンバー名表示・更新/削除ボタンなし |
| 2 | 自分のイベントをクリック | オーバーレイが開く。閲覧専用（更新/削除ボタンなし。編集は Calendar 側という仕様） |
| 3 | 一般ユーザーで他メンバーのイベントをクリック | オーバーレイが開かない |
| 4 | オーバーレイ表示中に外側クリック | 閉じる |
| 5 | オーバーレイ表示中に `Escape` | 閉じる |
| 6 | オーバーレイ表示中に `×閉じる` ボタン | 閉じる |
| 7 | Calendar 画面で自分のイベント詳細を開く（従来モーダル） | 従来どおり編集可（更新/削除ボタンあり）。`readOnly` 未指定の回帰確認 |
| 8 | タイムラインのドラッグズーム・スクロールが従来どおり動く | クリックとドラッグが競合しない（`canMove={false} canResize={false}`） |

### 位置ずれ発生時の調整ポイント

- 位置ロジックは `computeOverlayPos`（`src/components/pages/TimelinePage.tsx` 冒頭）。オーバーレイがはみ出す / 下端で切れる場合はクランプ値（`cont.height - 220` / `cont.width - 340`）を調整
- `e.currentTarget` が null の場合のフォールバックは `{top: 12, left: 12}`。実ブラウザで開かない・位置が不自然な場合は症状を報告してもらう

## 4. 完了条件

- 単体テスト: 新規 2 ファイル（5 ケース程度）が PASS、既存テスト回帰なし
- 品質ゲート: build / lint / testrun 全通過
- 実ブラウザ: 上表 1〜8 の受け入れ確認
