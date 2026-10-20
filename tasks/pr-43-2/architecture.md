# 修正方針と設計

## 方針

1. **Issue #40 三点リーダー修正**: `MilestoneEventsDrawer.css.ts` の `eventRow` に `display: flex` と `minWidth: 0` を追加し、`clampLine` の `flex: 1` が効くようにする。
2. **Issue #40 開閉機能追加**: `MilestoneEventRow` でメタ情報を `Collapse` で囲み、`expanded` 状態で表示/非表示を切り替える。
3. **PR #43 [#2] 共有スタイル副作用対応**: `clampText.css.ts` の `flex: 1; minWidth: 0` は Issue #41 用として維持し、Issue #40 用には別スタイルまたは条件付き適用を検討。変更理由をコメントに残す。
4. **PR #43 [#1] キャッシュ無効化**: 既にコードに追加済み。テストを 1 件追加（closed 配下イベントの更新で closed キーが無効化されること）。
5. **PR #43 [#3] 日付解釈**: `formatAccomplishedDate` で日付のみの文字列をローカル日付として扱うか、既存と合わせて現状維持を spec に記録。
6. **PR #43 [#4] アクセシビリティ**: `aria-controls` を付与し、段 3 のボタン構成を整理（チェブロンとタイトルのどちらか一方に統一、または両方に役割を明確化）。
7. **PR #43 [#5] 品質ゲート**: `bun run testrun` / `lint` / `build` と `light_token_server` の pytest を再実行。

## 対象ファイル

- `src/components/organisms/MilestoneEventsDrawer.tsx` - 三点リーダー・開閉機能修正
- `src/components/organisms/MilestoneEventsDrawer.css.ts` - `eventRow` に `display: flex` 追加
- `src/components/molecules/clampText.css.ts` - 共有スタイルの変更理由コメント追加
- `src/components/organisms/ClosedMilestoneDrawer.tsx` - `aria-controls` 付与、ボタン構成整理
- `src/lib/milestone.ts` - 日付解釈の検討（現状維持または修正）
- `src/hooks/useEventMutation.ts` - テスト追加（closed キー無効化）
- `src/tests/useEventMutation.test.tsx` - 既存テストに closed キー無効化のテストを追加

## 制約

- Vanilla Extract（`.css.ts`）でスタイルを記述
- Mantine v7 を使用
- date-fns で日付操作
- ESLint `--max-warnings 0`（警告ゼロ必須）
- `console.log` の残存禁止、コメントアウトされた不要コード削除
