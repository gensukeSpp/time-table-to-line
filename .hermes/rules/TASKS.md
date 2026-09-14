# Tasks — Refactoring Plan & Bug History

プロジェクトのタスク計画および既知バグの履歴。AGENTS.md には概要のみ記載し、詳細はここを参照する。

---

## リファクタリング前の前提作業（完了済み）

- [x] パッケージ管理: yarn → **bun** 移行
- [x] 全ライブラリを現時点の最新版に更新
- [x] 未使用ファイル削除: `src/DnDApp.tsx`, `src/lib/ClickOrDouble.js`
- [x] `vite.config.ts` 整理

---

## 今後必要なコード修正タスク（順次実施）

1. ESLint フラット設定: `.eslintrc.cjs` → `eslint.config.js` 移行
2. TypeScript 型エラー修正（`Theme.ts` 削除, `console.log` 一掃）
3. React 19 互換性修正: useRef の引数なし呼び出し等
4. `react-calendar-timeline` import 修正: `react-calendar-timeline-v3` → `react-calendar-timeline`
5. UI ライブラリ統一: Chakra UI / Radix UI → **Mantine v7** に置き換え
6. 日付ライブラリ統一: moment / dayjs → **date-fns** に書き換え
7. コンポーネントリファクタリング（molecules / organisms / pages / templates 再配置）
   - **Phase A** — コードベースクレンジング（未使用ファイル・型・コメントアウト一掃）
   - **Phase B** — ESLint 安全性回復（no-console / no-unused-vars / exhaustive-deps 段階的有効化）
   - **Phase C** — クエリ層重複排除（useEventsQuery 統合）
   - **Phase D** — 型安全性向上（ESLint error 化 / fetch ヘッダー共通化）
   - **Phase E** — バグ調査（11PM / 重なり / タイムゾーン）
   - **Phase F** — 品質ゲート（lint / build / test 最終確認）
   - 詳細は [`tasks/task-07/README.md`](../tasks/task-07/README.md) を参照

---

## 完了したタスク / バグ修正

| # | 内容 | ステータス | 参照 |
|---|------|-----------|------|
| 8 | バグ修正（E-1: 11PM 問題, E-2: タイムライン重なり） | **完了** | `tasks/task-08/README.md`, `tasks/task-09/README.md` |
| 9 | 機能追加 — RBAC 土台の型追加（`TimelineEventProps` に `admin: boolean`） | **完了** | PR #9 / commit `71a9ae1` |
| 10 | 認証 401 調査 | **完了** | `tasks/task-10/README.md`。原因はフロントのトークン未送信。backend 側の実装は仕様どおり正常 |
| 11 | バグ修正（Issue #11）Issue 1: 時・分・秒欠落, Issue 2: タイムライン表示破綻 | **完了** | `tasks/issue-11/README.md` |
| 11b | 機能追加（task-11）マイルストーンの自動 closed（猶予期間 `MILESTONE_CLOSE_GRACE_DAYS` 経過で waiting→closed） — **backend（`light_token_server`）**。APScheduler `BackgroundScheduler` を FastAPI lifespan で起動し定期実行。ジョブ本体は純粋関数 `close_expired_waiting_milestones(db, today) -> int`（`app/jobs/close_milestones.py`）に分離、`app/scheduler.py` + `app/main.py` lifespan で start/stop。境界は `accomplished_date + GRACE_DAYS <= today`（`<=` 採用・当日に確定）。決定事項: 実行方式は lifespan + APScheduler、子イベント `completed` は自動 closed では変更しない、間隔 `MILESTONE_CLOSE_INTERVAL_MINUTES`（既定 60 分）/ `ENABLE_MILESTONE_SCHEDULER`（既定 true）で env 制御。フロント対応（`useMilestonesQuery` の `refetchInterval` 追加）は**未実装（今後の実装対象）**。プランは `time-table-to-line/tasks/task-11/`（バックエンド完了後に実装）。→ **フロント対応実装済み (2026-09-11, task-11-FE)**: `src/lib/env.ts` の `MILESTONE_REFRESH_INTERVAL_MS`（`VITE_MILESTONE_REFRESH_INTERVAL_MS`、未設定時 60 分）を `useMilestonesQuery` に `refetchInterval` として追加。テストは `src/resources/queries.spec.tsx`。**PR #26 レビュー対応 (2026-09-14)**: ① 猶予日数を写経ではなく `.env` から読む仕様へ変更。`src/lib/env.ts` に `parseEnvPositiveInt()`（不正値=空文字・非数値・0・負数は既定値へフォールバック）を実装し、再取得間隔 `VITE_MILESTONE_REFRESH_INTERVAL_MS`(既定 60 分) に加えて猶予日数 `VITE_MILESTONE_CLOSE_GRACE_DAYS`(既定 5 日, 2026-09-08 正式採用) を環境変数化。② `src/lib/milestone.ts` の猶予日数を固定値→env 参照に変更し、自己矛盾した TODO コメント（「仮の 2 日」と「5 日後に決定」が並存）を整理。③ `src/lib/milestone.spec.ts` の期待値を `MILESTONE_CLOSE_GRACE_DAYS` から導出する方式に修正（設定変更に追従し、レビュー指摘の「テストだけ 2 日のまま」を構造的に解消）。④ `src/resources/queries.spec.tsx` のポーリング時間経過テストを `act()` で包み `act` 警告を解消。⑤ `.env.example` を新規追加（2 変数を既定値コメント付きで記載）。テスト: `src/lib/env.spec.ts` 新規 | **完了** | `light_token_server/tasks/task-11/`, `specs/2026-09-08-spec.md`, `time-table-to-line/tasks/task-11/`, `specs/2026-09-11-spec.md` |
| 16 | 機能追加（Issue #16）マイルストーンの追加処理と表示 | **完了** | `tasks/issue-16/README.md` |
| 18 | 機能追加（Issue #18）マイルストーン内容の更新と削除（タイトルクリック詳細モーダル・waiting/re-open 契約・`guideline_end_date` スペル統一） | **完了** | `tasks/issue-18/README.md` |
| 20 | 機能追加（Issue #20 / PR #21）タイムライン詳細モーダル — `AddChildForm` に `readOnly` プロップ追加（管理者 + 他人のイベントで読取専用: 更新/削除ボタン・警告ダイアログ非表示, メンバー名表示）、`EventDetailOverlay` 新規（絶対配置オーバーレイ、外部クリック + Escape で close）、`TimelinePage.tsx` の `onItemClick` 配線（管理者 OR 自分のイベントのみ開く、`computeOverlayPos` で位置計算）。**契約: `readOnly` は無条件読取専用**とし、権限由来の条件は親側で伝播（PR #21 レビューで確定。条件付き編集が必要なら `adminReadOnly` / `allowEdit` 等の責務名を使用）。テスト: `src/tests/InputItem.spec.tsx` 新規 | **完了** | PR #21 (MERGED), `src/components/organisms/EventDetailOverlay.tsx`, `src/tests/InputItem.spec.tsx` |
| 23 | 機能追加（Issue #23 / PR #24）イベントのマイルストーン所属と配色 — Calendar の `AddChildForm`（`InputItem.tsx`）に **open 状態のみ** を列挙するマイルストーンセレクト追加（「所属なし」→ `milestone_id: null`）、Timeline（`TimelinePage.tsx`）で `itemRenderer` 経由に所属マイルストーン色で配色 ＋ waiting 時に `opacity: 0.7` 網掛け、readOnly 詳細に所属マイルストーン名表示。純粋ヘルパ `src/lib/milestoneLookup.ts` 新規（`buildMilestoneColorMap` / `buildMilestoneStatusMap` / `computeItemDecorations`）。**決定:** ①所属解除（null）はバックエンド `model_fields_set` 対応（`light_token_server` で完了）により成立、②closed 所属イベントはデフォルト色 `#2196f3` のまま（`/milestone/all` に closed 含まず / YAGNI）、③waiting はインライン `opacity:0.7`（`completed` は boolean 維持）。`tasks/issue-23/` の計画（5 ファイル構造）に準拠、Task 3 と Task 4-6 をサブエージェント並列実装。テスト: `src/tests/milestoneLookup.spec.ts` 新規 + `src/tests/InputItem.spec.tsx` 追記 | **完了** | PR #24, `tasks/issue-23/`, `src/lib/milestoneLookup.ts` |

---

## 既知のバグ

### 解消済み（ストライクスルーで記載）

- ~~**タイムテーブル**: PM 11:00 にイベント追加不可（allDay 扱いになる）~~ — **task-08 / E-1**: `resolveSlotEnd` で end を endOfDay に丸め
- ~~**タイムライン**: イベントの重なり表示ができない~~ — **task-09 / E-2**: `stackItems` + `toTimelineStackItems()` の Date→ms 変換
- ~~**認証**: `/event/all`・`/refresh` への GET が繰り返し 401~~ — **task-10**: フロントのトークン未送信。`Authorization: Bearer` を付与して解消
- ~~**タイムテーブル**: 新規イベントの時刻が「時・分・秒」欠落（DB 保存が `00:00:00.000Z`）~~ — **Issue #11 Issue 1**: backend `/event/add` の受信解釈と照合し送信形式を確定
- ~~**タイムライン**: 表示が壊れる（行 `rct-hl-*` が 3000px 超え）~~ — **Issue #11 Issue 2**: `TimelinePage.tsx` を ResizeObserver + `resizeDetector` 方式に変更
- ~~**タイムライン**: マイルストーン所属イベントの色が選択解除後にデフォルト `#2196f3` へ戻る~~ — **task-12**: `TimelinePage.tsx` の `itemRenderer` を修正。`getItemProps` には decor を渡さず（`style: {}`）、自作 ref コールバックで `!important` 付き `background-color` を適用（`node.style.setProperty(bg, 'important')`）。`itemContext.selected` を型（`Pick<ItemContext, ...'selected'>`）に追加し、非選択時のみマイルストーン色を適用。詳細は `tasks/task-12/`
- ~~**タイムライン**: マイルストーン所属イベントをクリックすると選択背景が透明になる（`background` 属性欠落）~~ — **task-12 フォローアップ（同一セッションで解消）**: selected 分岐の `removeProperty('background-color')` がライブラリ選択色 `#ffc107` ごと消して透明化 → `selected ? '#ffc107' : decor.backgroundColor` を `!important` で**明示適用**する方式に変更（選択中 `rgb(255, 193, 7)` を保証、`removeProperty` は使わない）

### 未対応（保留中）

- **タイムテーブル**: DB 保存時刻が日本時間ではない（UTC の可能性）— **E-3** 調査済み・通常は正しく動作するため保留
