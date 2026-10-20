# テスト計画

## 単体テスト

### T-1: `eventRow` に `display: flex` 追加
- `MilestoneEventsDrawer` のスナップショットテストで、タイトルが三点リーダーで表示されることを確認
- `clampLine` スタイルが適用された `UnstyledButton` が 1 行表示（`WebkitLineClamp: 1`）であることを確認

### T-2: 開閉機能実装
- `MilestoneEventRow` のタイトルクリックでメタ情報の表示/非表示が切り替わることを確認
- `aria-expanded` 属性が `true`/`false` で切り替わることを確認
- キーボード操作（Enter/Space）で開閉が切り替わることを確認

### T-6: closed キー無効化テスト
- イベント作成・更新・削除の成功時に `milestoneKeys.closed()` が無効化されることを確認
- `queryClient.invalidateQueries({ queryKey: milestoneKeys.closed() })` が呼ばれることをモックで検証

## 統合テスト

- `MilestoneEventsDrawer` を実際にレンダリングし、長いタイトルが三点リーダーで表示されることを確認
- `ClosedMilestoneDrawer` の段 3 で、チェブロンとタイトルの両方が同じ開閉状態を反映することを確認

## E2E テスト（ブラウザ確認）

- Issue #40 の `MilestoneEventsDrawer` で、長いイベントタイトルが三点リーダーで表示されることを実ブラウザで確認
- `clampText.css.ts` の変更が Issue #40 の見た目に影響しないことを確認

## 品質ゲート

- `bun run testrun` - すべてのテストが通過すること
- `bun run lint` - 警告ゼロ（`--max-warnings 0`）
- `bun run build` - ビルドが成功すること
- `light_token_server` の pytest - すべてのテストが通過すること
