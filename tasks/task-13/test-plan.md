# test-plan.md —— 検証計画

## 1. 静的品質ゲート（親セッションが最終実施）

```bash
bun run lint      # ESLint --max-warnings 0 / Prettier
bun run build     # tsc + vite build（型エラー 0）
bun run testrun   # Vitest CI 1 回実行
```
全て成功すること。`console.log` を新規に残さないこと（AGENTS.md セキュリティ方針）。

## 2. 単体テスト

| 対象 | 検証内容 | 期待 |
|------|---------|------|
| `src/components/organisms/MilestoneList.test.tsx`（既存を更新, Task 5） | 非管理者（admin=false）でも詳細モーダル（マイルストーン詳細）が開き、作成者名が表示され、更新ボタンが出ない | この 1 件を含め全 passed |
| 同上（admin=true の既存テスト 134 行） | 管理者は詳細を開き、編集できる | 維持 |
| 既存 `EventDetailOverlay.spec.tsx` / `InputItem.spec.tsx` | padding 追加による回帰なし | 既存 green |
| 既存全体 | `bun run testrun` | all green |

## 3. 実ブラウザ確認（ユーザー本人が実施）

1. 一般メンバーアカウントでタイムライン `/timeline` を開く
   - マイルストーン一覧のタイトルがクリック可能（カーソル pointer / グレーアウトなし）
   - タイトルをクリック → 詳細モーダルが開く
   - 詳細モーダルに「タイトル / ステータス / 作成者名 / グループ名 / 説明 /
     ガイドライン終了日 / 達成日」が読取表示される
   - 更新ボタン・入力欄が無い（変更不可）
2. 管理者アカウントで同じ操作
   - 詳細モーダルで編集フォームと更新ボタンが出る → 変更できる
3. タイムラインでイベントをクリック → 詳細表示（`AddChildForm` 閲覧専用）
   - 周囲に余白（padding）が付き、白背景内で文字が端に張り付いていない
   - 閉じるボタンが余白・イベント本文に食い込まない
   - padding が窮屈/過剰なら `EventDetailOverlay.css.ts` の `0.75rem` を調整して再確認

## 4. 回帰リスク確認

- `MilestoneListTitle` の `admin` prop 削除による呼び出し側への影響 → `MilestoneList.tsx` で
  修正済みであること（Task 1→2 の直列依存、lint/build で担保）。
- `AddChildForm` は Calendar 編集フォームでも共用。今回の余白は `EventDetailOverlay.css.ts`
  の `overlay` のみに付与し、`formParent`（共有）は変更しないため Calendar 側に影響なし。
- バックエンド変更なし（`/milestone/all` の open/waiting 返却・権限は既存のまま）。

## 5. 成果物レビュー（親セッション）

- `git diff` で変更がスコープ内（4 ファイル修正 + 1 テスト新規）に収まっていること
- 受け入れ要件 1〜7（README.md）を満たしていること
