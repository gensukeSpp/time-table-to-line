# Time Table & Timeline (v4) — Refactoring Project

## プロジェクトの文脈と目的

### 概要
イベントを**タイムテーブル（カレンダー）** と **タイムライン（横軸ガントチャート風）** の 2 つのビューで管理する SPA。
認証済みユーザーがイベントの CRUD、ドラッグ&ドロップによる日時移動・リサイズを行う。

元は `Manabu-Aihara/time-table4` のリファクタリング + 機能追加プロジェクト。

### 最優先目標
1. **リファクタリング最優先** — 煩雑で問題の多い既存コードを段階的に整理する
2. パフォーマンス低下や余分な負荷を生まないよう注意する
3. コンポーネント単位で細かくタスクを分割し、順序立ててゆっくり確実に進める

### リファクタリング前の前提作業（完了済み）
- パッケージ管理: yarn → **bun** 移行（完了）
- 全ライブラリを現時点の最新版に更新（完了）
- 未使用ファイル削除: `src/DnDApp.tsx`, `src/lib/ClickOrDouble.js`（完了）
- `vite.config.ts` 整理（完了）

### 今後必要なコード修正タスク（順次実施）
1. ESLint フラット設定: `.eslintrc.cjs` → `eslint.config.js` 移行
2. UI ライブラリ統一: Chakra UI / Radix UI → **Mantine v7** に置き換え
3. 日付ライブラリ統一: moment / dayjs → **date-fns** に書き換え
4. `react-calendar-timeline` import 修正: `react-calendar-timeline-v3` → `react-calendar-timeline`
5. React 19 互換性修正: useRef の引数なし呼び出し等
6. TypeScript 型エラー修正（`Theme.ts` 削除, `console.log` 一掃）
7. コンポーネントリファクタリング（molecules / organisms / pages / templates 再配置）
   - **Phase A** — コードベースクレンジング（未使用ファイル・型・コメントアウト一掃）
   - **Phase B** — ESLint 安全性回復（no-console / no-unused-vars / exhaustive-deps 段階的有効化）
   - **Phase C** — クエリ層重複排除（useEventsQuery 統合）
   - **Phase D** — 型安全性向上（ESLint error 化 / fetch ヘッダー共通化）
   - **Phase E** — バグ調査（11PM / 重なり / タイムゾーン）
   - **Phase F** — 品質ゲート（lint / build / test 最終確認）
   - 詳細は [`tasks/task-07/README.md`](./tasks/task-07/README.md) を参照
8. バグ修正 → **完了**（E-1 11PM 問題: task-08 / E-2 タイムライン重なり: task-09）。E-3 タイムゾーンは調査済みで通常は正しく動作するため保留
9. 機能追加（requirement-02.md で別途定義）— **RBAC 土台の型追加は完了済み**（PR #9 / commit `71a9ae1`: `TimelineEventProps` に `admin: boolean` を追加、型定義・コンポーネント・モック・Stories・テストに波及）。より細かなロール（'viewer' / 'editor' 等）が必要になったら enum / union 型へのリファクタを検討
10. 認証 401 調査 → **完了**（task-10）。原因はフロントのトークン未送信であり、backend 側の実装は仕様どおり正常
11. バグ修正（Issue #11）→ **完了**。Issue 1（時・分・秒欠落）は backend `/event/add` の受信解釈と照合し送信形式を確定して解決。Issue 2（タイムライン表示破綻）は `TimelinePage.tsx` を **ResizeObserver + ライブラリ `resizeDetector`** 方式に変更し、非表示マウント（Mantine Tabs `keepMounted`）時の幅を表示時に確実に再測定するよう修正、`toTimelineStackItems` に NaN/Infinity 除外の防御を追加。調査用 console.log 削除も含む。詳細は [`tasks/issue-11/README.md`](./tasks/issue-11/README.md)

### 既知のバグ
- ~~**タイムテーブル**: PM 11:00 にイベント追加不可（allDay 扱いになる）~~ → **解消済み**（task-08 / E-1: `resolveSlotEnd` で end を endOfDay に丸め）
- **タイムテーブル**: DB 保存時刻が日本時間ではない（UTC の可能性）※未対応（E-3 調査済み・通常は正しく動作）
- ~~**タイムライン**: イベントの重なり表示ができない~~ → **解消済み**（task-09 / E-2: `stackItems` + `toTimelineStackItems()` の Date→ms 変換）
- ~~**認証**: `/event/all`・`/refresh` への GET が繰り返し 401 → **解消済み**（task-10: 原因はフロントのトークン未送信。リクエスト共通処理に `Authorization: Bearer *** を付与して両方解消）~~
- ~~**タイムテーブル**: 新規イベントの時刻が「時・分・秒」欠落（DB 保存が `00:00:00.000Z` になる）~~ → **解消済み**（Issue #11 Issue 1: backend `/event/add` の受信解釈と照合し送信形式を確定）
- ~~**タイムライン**: 表示が壊れる（行 `rct-hl-*` が 3000px 超え。DevTools 開閉で修復、タブ再切替で再発）~~ → **解消済み**（Issue #11 Issue 2: 実因は非表示マウント時の幅未再測定。`TimelinePage.tsx` を ResizeObserver + `resizeDetector` 方式に変更し表示時に再測定。`toTimelineStackItems` に NaN/Infinity 除外の防御も追加）

### コード品質上の問題
- セキュリティリスクになる `console.log` の残存 → 削除
- コメントアウトされた不要コード → 削除
- 未使用の型・モジュール（`Theme.ts` 等）→ 整理
- 3 つの日付ライブラリ混在（moment / date-fns / dayjs）→ date-fns 統一
- 2 つの UI ライブラリ混在（Chakra UI / Radix UI）→ Mantine 統一
- backend `light_token_server/tokens.py` に `print(...)` 残存（26, 57, 64, 80, 86, 90, 93, 96 行目）。一部はトークン先頭 10 文字（64）／シークレット先頭 5 文字（26）を出力しており console.log 削除方針と同様のセキュリティ観点あり（task-10 備考・動作には影響なし、backend 整理時の作業候補）

---

## 開発スタック

| カテゴリ | 技術 |
|---|---|
| **フレームワーク** | React 19 + TypeScript 5.7 |
| **ビルド** | Vite 6 |
| **パッケージ管理** | bun |
| **ルーティング** | react-router-dom 7 |
| **状態管理（サーバー）** | @tanstack/react-query 5 |
| **状態管理（クライアント）** | Context API |
| **カレンダー** | react-big-calendar (with dragAndDrop) |
| **タイムライン** | react-calendar-timeline 0.30.0-beta.4 |
| **UI ライブラリ** | Mantine v7（Chakra / Radix から移行済み） |
| **スタイリング** | Vanilla Extract（zero-runtime CSS-in-JS） |
| **HTTP クライアント** | Axios 1 |
| **日付操作** | date-fns（moment / dayjs から統一予定） |
| **テスト** | Vitest + jsdom + Testing Library |
| **Storybook** | 8 (react-vite) |
| **リンター** | ESLint 9 + Prettier 3 |
| **フォーマッター** | Prettier 3 |

## 実行コマンド

```bash
# 開発サーバー起動（HMR 有効）
bun run dev

# プロダクションビルド（tsc + vite build）
bun run build

# ビルド結果のプレビュー
bun run preview

# テスト（watch モード）
bun test

# テスト（CI モード / 1回実行）
bun run testrun

# リンター（--max-warnings 0）
bun run lint

# Storybook 起動（ポート 6006）
bun run storybook

# Storybook ビルド
bun run build-storybook

# 依存関係インストール
bun install

# パッケージ追加
bun add <package>

# 開発依存追加
bun add -d <package>

# パッケージ削除
bun remove <package>
```

---

## コーディングルール

### ファイル命名規則
- コンポーネント: PascalCase（例: `CalendarComponent.tsx`）
- フック: camelCase（例: `useMouseHandle.ts`）
- 型・ユーティリティ: camelCase（例: `TimelineType.ts`）
- スタイル: `ComponentName.css.ts`（コンポーネントと同ディレクトリに配置）
- テスト: `*.spec.tsx` または `*.spec.ts`
- 拡張子: コンポーネントは `.tsx`、型・ロジックは `.ts`

### コンポーネント構成（Atomic Design ベース）
```
src/components/
├── molecules/    # 小さな再利用コンポーネント（ボタン、ラッパー等）
├── organisms/    # 複合コンポーネント（モーダル、フォーム等）
├── pages/        # ページレベルコンポーネント
└── templates/    # レイアウト・プロバイダー
```

### その他ディレクトリ
```
src/
├── hooks/        # カスタムフック
├── lib/          # 型定義とユーティリティ
├── resources/    # データフェッチ & TanStack Query
├── stories/      # Storybook ストーリー
└── tests/        # Vitest テスト
```

### 状態管理のルール
- **サーバー状態**: 必ず TanStack Query で管理（クエリーキーは `resources/cache.ts` で一元管理）
- **クライアント状態**: Context API（認証情報、イベントリスト）
- **コンポーネントローカル**: `useState` / `useReducer`

### スタイリング
- すべて Vanilla Extract（`.css.ts`）で記述
- `ComponentName.css.ts` はコンポーネントファイルと同じディレクトリに配置
- CSS Modules（`.module.css`）は既存のもののみ許容、新規には使わない

### テスト
- フレームワーク: **Vitest**（Jest は使用しない）
- 配置: `src/tests/` またはコンポーネント横置きの `*.spec.tsx`
- コンポーネントテストは Testing Library で行う
- Storybook の Playwright 連携で包括可能なら Storybook を優先

### リンター / フォーマッター
- ESLint は `--max-warnings 0`（警告ゼロ必須）
- コード修正後は必ず `bun run lint` を通す
- フォーマットは Prettier 3

### 禁止事項
- `console.log` の残存（セキュリティリスク）→ 削除必須
- コメントアウトされた不要コード → 削除
- 未使用の import / 変数 / 型 → 削除
- クラスコンポーネントの新規作成（`App.tsx` に残存するもののみ許容）
- 新たな UI ライブラリの追加（Mantine で統一）
- 新たな日付ライブラリの追加（date-fns で統一）

### 命名規則
- 型: 接尾辞 `Props`（例: `TimelineEventProps`）
- Context: `XxxStateContext` / `XxxDispatchContext`
- イベント関連の型は `src/lib/TimelineType.ts` の `TimelineEventProps` を中心とする

### セキュリティ
- トークンは URL クエリパラメータ `?token=xxx` で受け取り、Context に保存
- Axios インターセプターで全リクエストに Authorization ヘッダーを付与
- トークン期限切れ時は自動リフレッシュ
- backend のトークン探索は **Bearer ヘッダー → Cookie** の順（`tokens.py`）。別オリジンからの呼び出しでは httpOnly Cookie フォールバック（同一オリジンかつ `credentials` 込みの fetch 時のみ有効）が効かないため、**`Authorization: Bearer {token}` を明示的に送る**のが正しい契約（task-10 の裏付け）

### 作業の進め方
- タスクは `tasks/` ディレクトリに計画を保存してから開始する
- コンポーネント単位で動作確認をこまめに行う
- 変更の影響範囲を確認してから修正する（パフォーマンス低下に注意）
- 参照: `requirement-01.md`（要件定義）、`QWEN.md`（詳細アーキテクチャ）