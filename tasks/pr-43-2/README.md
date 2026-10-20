# PR #42-2: PR #43 レビュー指摘事項の修正

## 概要

PR #43 レビュー（`.github/reports/pr-43-review.md`）の指摘事項 [#1]-[#5] と、Issue #40 の三点リーダー・イベントタイトル開閉機能の不具合を修正する。

## 対象指摘事項

| # | 優先度 | 対象 | 種別 | 状態 |
|---|---|---|---|---|
| 1 | 中 | `src/hooks/useEventMutation.ts` | キャッシュ無効化の抜け | 実装済み（コード確認済み） |
| 2 | 低〜中 | `src/components/molecules/clampText.css.ts` | 共有スタイルの副作用（#40 影響） | 未修正 |
| 3 | 低 | `src/lib/milestone.ts` | 日付のタイムゾーン解釈 | 未修正 |
| 4 | 低 | `ClosedMilestoneDrawer.tsx` | アクセシビリティ（aria-controls・二重トグル） | 未修正 |
| 5 | 低 | `tasks/specs` | 品質ゲート数値の未検証 | 未実施 |

## 関連 Issue

- Issue #40: 三点リーダーが動作していない、イベントタイトルで開閉機能が付いていない
- PR #43: レビュー指摘事項 [#1]-[#5]

## ディレクトリ構成

```
tasks/pr-43-2/
├── README.md          # 本ファイル（実装計画の概要）
├── overview.md        # 現状と課題の詳細
├── architecture.md    # 修正方針と設計
├── tasks.md           # 実装タスク一覧
└── test-plan.md       # テスト計画
```
