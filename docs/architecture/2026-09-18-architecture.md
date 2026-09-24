# Architecture Snapshot: 2026-09-18 (PR #33)

## Purpose
'month' ビューにおける DnD 操作の最適化と誤操作防止。

## Overview
- **DnD Pre-processing**: 'month' ビューにおいて、フルデイイベントと単日時間イベントを区別。単日時間イベントの誤操作（誤ったリサイズ・移動による他バンドへの移動）を防止。
- **UI Interaction**: 
    - フルデイイベントの視認性向上のため、CSS特異度を調整し、色分けを強化。
    - EW（East-West）リサイズハンドルのクリック領域を拡大し、操作性を向上。
- **Cleanup**: 機能していなかった旧 `eventPropGetter` を削除。

## Key Design Decisions
- `draggableAccessor` / `resizableAccessor` の導入による DnD 可否の制御。
- `eventPropGetter` のようなスタイル系 getter ではなく、ライブラリ本来のアクセサ props を採用。
- CSS の特異度を利用したスタイリング調整。

## Commits List
- PR #33 (Feature/month ビューの DnD 前処理と誤操作防止)

## Changed Files List
- `src/components/pages/CalendarView.css.ts`
- `src/components/pages/CalendarView.tsx`
- `src/lib/slot.ts` (関数追加: `shouldBlockMonthDnd`、`isSameDay` 条件で日跨ぎイベントをブロック対象から除外)
- `src/tests/slot.spec.ts` (テスト追加: `shouldBlockMonthDnd` の month/week/agenda・フルデイ/時間/日跨ぎケース)
- `src/tests/CalendarView.spec.tsx` (テスト追加: view 切替ごとの `draggableAccessor` / `resizableAccessor` 検証)
