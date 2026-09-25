# Specification Snapshots（仕様記録インデックス）

日付付きの仕様記録（`specs/<日付>-spec.md`）の一覧。`docs/architecture/README.md` と同じ要領で、実装完了後の仕様・決定事項・品質ゲート結果を時系列に追跡するために使用する。

| Date | Purpose |
|---|---|
| [2026-08-31-1](2026-08-31-1-spec.md) | Issue #18: マイルストーン更新機能と waiting 状態（tasks/issue-18 の全 7 タスク実装、PR #19 相当） |
| [2026-08-31-2](2026-08-31-2-spec.md) | admin ガードとマイルストーン状態遷移のフォーカスした検証テスト |
| [2026-09-01](2026-09-01-spec.md) | feature/timeline-event-modal: TimelinePage へのタイムライン詳細モーダル配線（PR #21 系） |
| [2026-09-03-1](2026-09-03-1-spec.md) | PR #21 レビュー対応: readOnly を「無条件に編集不可」の契約に統一（タイムライン詳細は閲覧専用） |
| [2026-09-07-1](2026-09-07-1-spec.md) | Issue #23: イベント↔マイルストーン所属の並列実装 |
| [2026-09-08](2026-09-08-spec.md) | タイムラインのマイルストーン色が選択解除で戻らない色戻りバグの修正（imperative スタイリング、task-12 プラン作成） |
| [2026-09-11](2026-09-11-spec.md) | task-11（フロント）: 自動 close 済みマイルストーンの自動再取得（MILESTONE_REFRESH_INTERVAL_MS） |
| [2026-09-14](2026-09-14-spec.md) | feature/milestone-detail-anyone: マイルストーン詳細の全員閲覧化＋タイムライン詳細の余白調整（PR #27 系） |
| [2026-09-17](2026-09-17-spec.md) | Issue #29: month ビューのイベント追加（フルデイ作成・week 表示） |
| [2026-09-18](2026-09-18-spec.md) | Issue #30: month ビュー DnD 事前処理と安全対策（.rbc-event-allday 固定 CSS 化・EW アンカー等） |
| [2026-09-24](2026-09-24-spec.md) | Issue #35: 進捗別の配色（week ビュー、eventPropGetter 一本化） |
| [2026-09-25](2026-09-25-spec.md) | Issue #37: 進捗配色を week/day/agenda/work_week へ正式拡張＋リファクタ残骸 `stateAll.length > 2` ガード除去 |

## 作成ルール
- 1 機能 / 1 Issue / 1 PR につき 1 ファイルを `specs/<YYYY-MM-DD>[-連番]-spec.md` で作成する。同一日に複数ある場合は末尾に `-1` / `-2` を付与する。
- 冒頭に frontmatter（`created` / `updated`）を付ける。
- 内容は「実施内容・決定仕様・品質ゲート結果・実ブラウザ確認」を簡潔に記録する。関連するプランは `tasks/`（Issue 番号）または `tasks/task-<N>/`（バックエンド等）を参照。
- 対応するアーキテクチャの時系列一覧は `docs/architecture/README.md` を参照。