# Architecture Snapshot: 2026-09-11 (PR #26)

## Purpose
バックエンド側で発生する「猶予期間経過後の自動 `waiting -> closed`」の変更を、フロントエンドで定期的なポーリングにより即座に反映する。

## Overview
- **Data Layer**: `useMilestonesQuery` に `refetchInterval` を追加し、サーバー側の自動 closed 状態を最大間隔 60 分の遅延でフロントへ反映。
- **Environment**: 再取得間隔を `VITE_MILESTONE_REFRESH_INTERVAL_MS`、猶予日数を `VITE_MILESTONE_CLOSE_GRACE_DAYS`（いずれも `.env`）で設定可能にし、未設定時は各々 60 分 / 5 日を既定値として適用。不正値は `parseEnvPositiveInt()` で既定値へフォールバック（PR #26 レビュー [P2] 対応）。`.env.example` に 2 変数を記載。
- **Verification**: `queries.spec.tsx` に定期再取得の検証テストを追加。

## Key Design Decisions
- **ポーリング間隔**: サーバー側の猶予チェック間隔（60 分）に合わせることで、最小のリクエスト数で最大反映精度を実現。
- **UI/UX**: 状態変化（一覧からの除外）は既存ロジックが対応するため、追加の UI や通知は行わない。

## Commits List
- `1da4b2d` feat #(task11-FE): useMilestonesQuery に refetchInterval を追加(自動 closed 反映)
- `79cc3b6` docs #(task11-FE): 自動 closed の画面反映実装を TASKS.md に記録

## Changed Files List
- `src/resources/queries.ts`
- `src/resources/queries.spec.tsx`
- `src/lib/env.ts`
- `tasks/task-11/` (全関連ドキュメント)
