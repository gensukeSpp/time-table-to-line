# リファクタリングロードマップ

リファクタリングは **コンポーネント単位で細かくタスク分割し、順序立てて進める**。

## 完了（2026-07-24）

1. **パッケージ管理**: yarn → bun 移行（完了）
2. **ライブラリ更新**: 全依存を最新に一括インストール（React 19, Vite 6, Mantine v7, TanStack Query 5, 等）
3. **不要コード削除**: `src/DnDApp.tsx`, `src/lib/ClickOrDouble.js` 削除、vite.config.ts 整理

## 完了（2026-08-10 時点）

4. **バグ修正**: 11PM 問題（task-08 / E-1）、タイムライン重なり表示（task-09 / E-2）
5. **認証 401 調査**: task-10（原因はフロントのトークン未送信。backend 修正不要）
6. **RBAC 土台**: `TimelineEventProps` に `admin: boolean` 追加（PR #9 / commit `71a9ae1`）
7. **マイルストーン追加・表示**: PR #17（Issue #16）。admin 判定を `useAuthInfo().admin`（実データ）に修正。更新/削除・子イベント紐付け・配色は未実装（→ `.qwen/rules/MILESTONE.md` 参照）

## 完了（2026-09-03 時点）

8. **マイルストーン更新 & waiting 状態**: PR #19（Issue #18）。`MilestoneStatus`（open/waiting/closed）導入、`guideline_end_date` スペル修正、`useUpdateMilestoneMutation` / `useRemoveMilestoneMutation` 追加、`MilestoneDetailDialog` / `MilestoneListTitle` 新規。closed 動作・自動 completed は未実装（→ `.qwen/rules/MILESTONE.md` 参照）
9. **タイムライン詳細モーダル**: PR #21（Issue #20）。`AddChildForm` に `readOnly` プロップ追加（管理者 + 他人のイベントで読取専用）、`EventDetailOverlay` 新規（絶対配置オーバーレイ、外部クリック + Escape で close）、`TimelinePage.tsx` の `onItemClick` 配線（管理者 OR 自分のイベントのみ開く、`computeOverlayPos` で位置計算）。**契約: `readOnly` は無条件読取専用**（権限由来の条件は親側で伝播）

## 完了（2026-09-18 時点）

10. **マイルストーン所属 & 配色**: PR #24（Issue #23）。`InputItem.tsx` に open マイルストーンセレクト（所属なし → `milestone_id: null`）、`TimelinePage.tsx` の `itemRenderer` 配色 + waiting `opacity: 0.7`、`milestoneLookup.ts` 新規（`buildMilestoneColorMap` / `buildMilestoneStatusMap` / `computeItemDecorations`）。→ 詳細は `.qwen/rules/MILESTONE.md`
11. **マイルストーン色の永続化修正**: task-12（commit `6131aba`）。選択解除で色が `#2196f3` に戻る不具合を、`itemRenderer` の `ref` コールバック + `!important` 直接適用で修正。`itemContext.selected` を型追加し選択色 `#ffc107` を明示適用
12. **マイルストーン自動 closed（backend + 画面反映）**: task-11（`light_token_server`: APScheduler で猶予期間経過を定期確定）+ PR #26 / task-11-FE（`useMilestonesQuery` に `refetchInterval` 追加、猶予日数 `VITE_MILESTONE_CLOSE_GRACE_DAYS` = 既定 5 日・再取得間隔 `VITE_MILESTONE_REFRESH_INTERVAL_MS` を env 化、`parseEnvPositiveInt()` で不正値フォールバック）
13. **マイルストーン詳細の全員閲覧化**: PR #27（task-13）。`MilestoneListTitle` の admin ゲート撤廃（閲覧は全員・更新は admin のみ）、`MilestoneDetailDialog` に非管理者向け読取専用表示、`EventDetailOverlay.css.ts` に `padding: '0.75rem'`
14. **month ビュー フルデイイベント追加**: PR #32（Issue #29）。`isFullDayEvent` / `resolveEventEnd`（`endOfDay` 丸め）追加、`onSlotInfo` を `(slotInfo, view)` に拡張、週ビューの `.rbc-row` 配置 + `rbc-event-allday` クラス付与。`CalendarPage` のインライン無名 `onSlotInfo` 起因の無限ループ（Maximum update depth exceeded）を `useCallback` で修正
15. **month ビュー DnD 前処理**: PR #33（Issue #30、ブランチ `feature/before-dnd-reflect/30`・現行 HEAD）。`shouldBlockMonthDnd`（month × 単日時間イベントのみブロック、`isSameDay` 条件で日跨ぎ伸長は操作可）新設。無機能だった旧 `eventPropGetter` を削除し `draggableAccessor` / `resizableAccessor`（`useCallback` + `currentView` closure）で DnD 可否を制御。フルデイ色 `#00695c`、EW アンカー幅拡大。`globalStyle` に `:global()` を付けない注意点（リテラル `:global(...)` が出力されルール全体が破棄される）を commit `03b68a9` で記録

## 今後必要なコード修正タスク（順次実施）

※ 当初リスト（1〜6・8）は完了済みのため廃止。現状の残タスク・方針のみ記載する。

1. **コンポーネントリファクタリング**: `molecules/` → `templates/` の順序等、提案ベースで決定（継続）
2. **機能追加**: 各 `requirement-*.md` で別途定義（requirement-02 は現状未作成。01・03 が存在）
3. **既知バグ対応**: タイムテーブル「allDay が期待する箇所で 12:00 AM に追加される」・「DB 保存時刻が日本時間ではない（E-3・保留）」は要確認（→ `.qwen/rules/KNOWN_ISSUES.md` 参照）

## 備考

- インストール段階で削除した旧依存パッケージの一覧はプロジェクトメモリー参照
- 各コード修正タスクは `tasks/` ディレクトリ配下に計画を保存する
- **ESLint フラット設定**（`.eslintrc.cjs` → `eslint.config.js`）・**Mantine 移行**（Chakra / Radix → Mantine v7）・**date-fns 統一**（moment / dayjs 排除）・**v3 import 修正**（`react-calendar-timeline-v3` → `react-calendar-timeline`）・**useRef 引数なし修正**は、いずれも現状の `src/` に残存なし（grep で確認、2026-09-24）