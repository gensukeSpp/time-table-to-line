# Architecture Snapshot: 2026-09-17 (PR #32)

## Purpose
'month' ビューからの「1日いっぱい(Allday)」イベント追加機能の実装。

## Overview
- **Month View Support**: 'month' ビューのスロットクリック時に 0:00–23:59 のフルデイイベントを追加可能に。
- **Date Handling**: 日付範囲を `endOfDay` に丸める処理を導入し、`react-big-calendar` 上での正しい描画（`rbc-event-allday` クラス付与）を実現。
- **Bug Fix**: `onSlotInfo` 伝播ロジックにおける無限ループを `useCallback` で解消。

## Key Design Decisions
- `rbc-event-allday` クラス付与によるフルデイ描画の制御。
- `resolveEventEnd` ユーティリティによる終了時刻の丸め処理の集約。

## Changed Files
- `src/components/pages/CalendarPage.tsx`
- `src/components/pages/CalendarView.tsx`
- `src/components/organisms/InputTitleDialog.tsx`
- `src/lib/slot.ts`
- `src/tests/slot.spec.ts`
- `src/tests/TitleInput.spec.tsx`
