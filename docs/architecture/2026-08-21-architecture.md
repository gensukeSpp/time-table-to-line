# Architecture Snapshot: 2026-08-21 (PR #13)

## Purpose
修正: タイムテーブル上のイベント操作（ドラッグ/リサイズ）時に、画面描画が正しく更新されない（または二重描画が発生する）という長年潜在していた UX 問題を解決しました。また、新規機能「マイルストーン」の実装に向けた要件定義の策定と、関連タスクの計画を行いました。

## Overview
タイムテーブルのイベントデータ管理において、表示用データフィールド (`start_time`/`end_time`) と操作用フィールド (`start`/`end`) の不整合を解消し、状態更新ロジックを破壊的な直接参照 (`prevRef`) から、React のリアクティブ原則に従う関数型アプローチ（状態置き換え方式）へ刷新しました。これにより、描画とデータ状態の正確な同期を担保します。

## Key Design Decisions
- **データアクセサの統一**: カレンダーの表示に用いる `start_time`/`end_time` とドラッグ操作で更新する `start`/`end` を同期するように修正。
- **状態管理の再設計**: React のリアクティブシステムとの互換性を確保するため、破壊的な `prevRef` ロジックを廃止し、関数型フィルタリングによる状態更新へ移行。
- **ドメイン表現の明確化**: `MyHorizonTimeline` を `GroupHorizonTimeline` へ改称し、操作対象のグループ性を明示。

## Next Steps / Improvements
- **テスト修正**: `src/tests/Calendar.spec.tsx` のモックから削除された `prevRef` を除去する。
- **バックエンド実装**: フロントエンドの変更に合わせ、`/event/update/{event_id}` API で `start_time`/`end_time` を永続化できるように拡張する。

## Commits List
- PR #13 (「マイルストーン」要件定義読み込みと、リサイズ・ムーブの不具合修正)

## Changed Files List
- 約17ファイル変更 (src/hooks/useMouseHandle.ts, src/components/pages/CalendarView.tsx, requirement-03.md 他)
