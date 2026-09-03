# Architecture Snapshot: 2026-09-01 (PR #21)

## Purpose
管理者がタイムライン上でグループメンバーの作業詳細・進捗を把握できるようにするため、イベントクリックで詳細モーダルを呼び出す機能を実装する。

## Overview
- **Event Detail Overlay**: イベントクリック時に詳細を表示する新しいオーバーレイコンポーネントを実装。
- **Read-Only InputItem**: `InputItem` コンポーネントに `readOnly` モードを追加し、管理者かつ自分以外のイベントの場合に更新/削除ボタンを非表示化。
- **UI Integration**: `TimelinePage` から詳細オーバーレイを適切な位置に表示するロジックを追加。

## Key Design Decisions
- **Permissioning**: 管理者および自分のイベントのみ詳細表示・編集を許可する権限制御を実装。
- **Component Reuse**: 既存の `AddChildForm` コンポーネントを再利用し、一貫性を維持。

## Commits List
- PR #21 (Feature/タイムライン詳細モーダル)

## Changed Files List
- `src/components/organisms/InputItem.tsx`
- `src/components/organisms/EventDetailOverlay.tsx`
- `src/components/organisms/EventDetailOverlay.css.ts`
- `src/components/pages/TimelinePage.tsx`
- `src/tests/InputItem.spec.tsx`
