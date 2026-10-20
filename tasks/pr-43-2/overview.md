# 現状と課題

## Issue #40: 三点リーダーが動作していない

### 原因

`src/components/organisms/MilestoneEventsDrawer.tsx` の `MilestoneEventRow` コンポーネントで、`eventRow`（`Box`）に `display: flex` が設定されていない。

`clampText.css.ts` の `clampLine` スタイルには `flex: 1; minWidth: 0` が含まれているが、親要素が flex コンテナでないため `flex: 1` が効かず、タイトルが折り返さず三点リーダー（ellipsis）が表示されない。

### 開閉機能が付いていない

`MilestoneEventRow` では `UnstyledButton` のクリックで `expanded` 状態を切り替えているが、メタ情報（スタッフID、グループ名、開始日時）は常に表示されており、開閉による表示/非表示の切り替えが実装されていない。

## PR #43 [#2]: 共有 clamp スタイルの副作用

`clampText.css.ts` に `flex: 1; minWidth: 0` を追加したことで、Issue #40 の `MilestoneEventsDrawer` の `eventRow` 直下に `UnstyledButton` がある場合、flex は効かない（現状は `display: flex` なし）。今後の DOM 変更で挙動が変わる可能性がある。

## PR #43 [#1]: キャッシュ無効化の抜け

`useEventMutation.ts` の各 mutation（create/delete/update/dateList）で `milestoneKeys.closed()` の invalidate が既にコードに追加済み（確認済み）。テストの追加が必要。

## PR #43 [#3]: 日付のタイムゾーン解釈

`formatAccomplishedDate` で `new Date('2026-08-20')` は UTC 0 時として解釈され、JST では前日になる可能性。既存の `getMilestoneClosedAt` も同じ方式。

## PR #43 [#4]: アクセシビリティ

`ClosedMilestoneDrawer.tsx` の `UnstyledButton` に `aria-controls` がない。段 3 のチェブロン `ActionIcon` とタイトル `UnstyledButton` の 2 つが同じ開閉を行い、どちらも同じ状態を見る。

## PR #43 [#5]: 品質ゲート数値の未検証

`bun run testrun` / `lint` / `build` と `light_token_server` の pytest を再実行し、結果を記録する必要がある。
