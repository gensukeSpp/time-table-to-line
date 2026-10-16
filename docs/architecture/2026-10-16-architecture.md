# Architecture Snapshot: 2026-10-16 (PR #42)

## Purpose
Issue #40 に基づき、'open' および 'waiting' 状態のマイルストーンに所属するイベントを、進捗（progress）別の固定順（これから→まだ→もうすぐ→完了→指定なし）でアコーディオン形式で閲覧できる機能を実装しました（PR #42）。あわせて、非管理者ユーザーに対する閲覧権限の緩和（バックエンド側での admin gate 撤去、`require_token` のみ）を実施しています。

## Overview
- **Milestone Events Drawer**: 各マイルストーンタイトルの右側に新設された `...` (ActionIcon) ボタンをクリックすることで、Mantine の `Drawer` (`position="right"`) を開き、所属イベントを進捗（progress）別アコーディオンで一覧表示。
- **Data Model & Helpers**: 
  - `MilestoneEventProps` 型の追加および `groupMilestoneEventsByProgress` ヘルパによる進捗別グループ化 (`milestoneEvents.ts`)。
  - キャッシュキー (`milestoneKeys.events(id)`)、フェッチ関数 (`fetchMilestoneEvents`)、専用クエリフック (`useMilestoneEventsQuery`) の実装。Drawer が開かれるまで fetch を遅延 (`enabled` 制御)。
- **Permission Relaxation**: バックエンド（light_token_server）側で、一般ユーザーによるマイルストーンイベントの閲覧を許可（admin gate 撤去、`require_token` のみ）。フロントエンドは権限分岐を実装しておらず（MilestoneEventsDrawer / useMilestoneEventsQuery は admin 判定なし）、閲覧可能な一般ユーザーに権限がそのまま委ねられる。

## Key Design Decisions
- **遅延読み込み (Lazy Fetching)**: パフォーマンスおよび不要なリクエストを防ぐため、ユーザーが明示的に Drawer を開くまで API リクエストを発行しない設計 (`enabled` フラグによる制御)。
- **純粋関数によるグループ化**: イベントの進捗状態によるグルーピングロジックを純粋関数 (`groupMilestoneEventsByProgress`) として分離し、高いテスト容易性を確保。
- **Atomic Design**: 新規追加の Drawer コンポーネントを `organisms` 層に配置。

## Commits List
- PR #42 (`feat #260928: Issue #40 'open'/'waiting' マイルストーンのイベント参照`)

## Changed Files List
- `src/lib/TimelineType.ts`
- `src/lib/milestoneEvents.ts` (新規追加)
- `src/resources/cache.ts`
- `src/resources/fetch.ts`
- `src/resources/queries.ts`
- `src/resources/queries.spec.tsx`
- `src/components/organisms/MilestoneEventsDrawer.tsx` (新規追加)
- `src/components/organisms/MilestoneEventsDrawer.css.ts` (新規追加)
- `src/components/organisms/MilestoneEventsDrawer.test.tsx` (新規追加)
- `src/components/organisms/MilestoneList.tsx`
- `src/components/organisms/MilestoneList.css.ts`
- `src/components/organisms/MilestoneList.test.tsx`
- `src/components/organisms/MilestoneListTitle.tsx`
- `src/tests/milestoneEvents.spec.ts` (新規追加)
- `specs/2026-10-15-spec.md` (新規追加)
- `tasks/issue-40/*` (関連ドキュメント一式)
