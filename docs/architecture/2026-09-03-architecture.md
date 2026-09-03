# Architecture Snapshot: 2026-09-03 (PR #22)

## Purpose
グループ管理者によるメンバーの作業内容の詳細閲覧を可能にする機能拡張として、タイムラインイベント詳細モーダル（EventDetailOverlay）の実装と、権限管理（admin フラグ）の導入を行いました。

## Overview
- **権限管理の強化**: イベント詳細へのアクセス制御のため、authPayload および型定義に `admin` フラグを追加。
- **詳細モーダル実装**: イベントクリック時に詳細を表示する `EventDetailOverlay` コンポーネントを新規作成。
- **既存ビューの拡張**: `TimelinePage` においてイベントクリック時の詳細表示ロジックを統合し、`InputItem` コンポーネントに読み取り専用モードとメンバー名解決ロジックを追加。

## Key Design Decisions
- **アクセス制御**: `admin` フラグによる役割ベースのアクセス制御を導入。今後のグループ管理機能拡張を見据えたベースとなる。
- **コンポーネント設計**: Atomic Design 規約に基づき、詳細表示用コンポーネントを `organisms` レイヤーに配置。

## Next Steps / Improvements
- 本番環境向けの環境変数設定と `vite.config.ts` の最終構成への最適化。

## Commits
- feat #22: merge-timeline-modal (詳細モーダル実装およびadmin権限追加)

## Changed Files
- `src/lib/authPayload.ts`
- `src/hooks/useAuthGuard.ts`
- `src/lib/TimelineType.ts`
- `src/lib/SampleState.ts`
- `src/tests/Calendar.spec.tsx`
- `src/components/organisms/EventDetailOverlay.tsx`
- `src/components/organisms/EventDetailOverlay.css.ts`
- `src/tests/EventDetailOverlay.spec.tsx`
- `src/components/organisms/InputItem.tsx`
- `src/tests/InputItem.spec.tsx`
- `src/components/pages/TimelinePage.tsx`
