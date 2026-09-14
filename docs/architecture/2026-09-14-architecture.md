# Architecture Snapshot: 2026-09-14 (PR #27)

## Purpose
マイルストーン詳細の閲覧権限を非管理者ユーザーにも開放し、進捗状況の可視性を向上させる。あわせてUI調整（余白設定）を実施。

## Overview
- **Permissioning**: 非管理者ユーザーに対して、マイルストーン詳細モーダル（タイトル、ステータス、説明、ガイドライン終了日、達成日）の読み取り専用アクセスを許可。
- **UI Adjustment**: イベント詳細表示に `padding: '0.75rem'` を追加し、視認性を改善。

## Key Design Decisions
- **Read-Only Access**: 非管理者は閲覧のみ可能とし、編集ボタン等の操作用UIは表示されないように制限。
- **UI Consistency**: 既存のイベント詳細表示に余白を追加し、デザインの一貫性を確保。

## Commits List
- PR #27 (Feature/マイルストーン閲覧権限の緩和と余白)

## Changed Files List
- `src/components/organisms/MilestoneList.test.tsx` (テスト更新)
- `src/components/organisms/MilestoneDetailDialog.tsx` (権限制御ロジック追加)
- `src/components/organisms/EventDetailOverlay.css.ts` (スタイル追加)
- ... (その他UI関連ファイル)
