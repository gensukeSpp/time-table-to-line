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

---

## 既知のバグ

### 解消済み（ストライクスルーで記載）

- ~~**タイムテーブル**: PM 11:00 にイベント追加不可（allDay 扱いになる）~~ — **task-08 / E-1**: `resolveSlotEnd` で end を endOfDay に丸め
- ~~**タイムライン**: イベントの重なり表示ができない~~ — **task-09 / E-2**: `stackItems` + `toTimelineStackItems()` の Date→ms 変換
- ~~**認証**: `/event/all`・`/refresh` への GET が繰り返し 401~~ — **task-10**: フロントのトークン未送信。`Authorization: Bearer` を付与して解消
- ~~**タイムテーブル**: 新規イベントの時刻が「時・分・秒」欠落（DB 保存が `00:00:00.000Z`）~~ — **Issue #11 Issue 1**: backend `/event/add` の受信解釈と照合し送信形式を確定
- ~~**タイムライン**: 表示が壊れる（行 `rct-hl-*` が 3000px 超え）~~ — **Issue #11 Issue 2**: `TimelinePage.tsx` を ResizeObserver + `resizeDetector` 方式に変更

### 未対応（保留中）

- **タイムテーブル**: DB 保存時刻が日本時間ではない（UTC の可能性）— **E-3** 調査済み・通常は正しく動作するため保留
