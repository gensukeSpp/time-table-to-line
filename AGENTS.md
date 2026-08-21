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

詳細は [`TASKS.md`](./.hermes/rules/TASKS.md) を参照。

- リファクタリング前の前提作業（完了済み）
- 今後必要なコード修正タスク（順次実施）
- 完了したタスク / バグ修正の履歴
- 既知のバグ（解消済み / 未対応）

### コード品質上の問題
- セキュリティリスクになる `console.log` の残存 → 削除
- コメントアウトされた不要コード → 削除
- 未使用の型・モジュール（`Theme.ts` 等）→ 整理
- 3 つの日付ライブラリ混在（moment / date-fns / dayjs）→ date-fns 統一
- 2 つの UI ライブラリ混在（Chakra UI / Radix UI）→ Mantine 統一
- backend `light_token_server/tokens.py` に `print(...)` 残存（26, 57, 64, 80, 86, 90, 93, 96 行目）。一部はトークン先頭 10 文字（64）／シークレット先頭 5 文字（26）を出力しており console.log 削除方針と同様のセキュリティ観点あり（task-10 備考・動作には影響なし、backend 整理時の作業候補）

---

## 機能要件

### requirement-03: マイルストーン機能

グループ共通の長スパンタスクとして「マイルストーン」を設置する。Github Issues の milestone + label に近い概念。

- **概念**: 1 つのマイルストーンに複数のイベントが属する（属さないイベントもある）。グループを跨いで共有されるため Timeline での操作とする。Calendar は個人用、Timeline はグループ用。
- **権限**: マイルストーンの作成・close は**グループ管理者のみ**。イベントからの所属選択は一般ユーザーも可能。
- **色**: 10 固定パターン `#9c27b0 #009688 #795548 #607d8b #e91e63 #3f51b5 #00bcd4 #ff5722 #8bc34a #ff9800`。重複時はサイクル。デフォルトイベント色 `#2196f3` / クリック後色 `#ffc107` に近い色は避ける。
- **状態**: open / closed。closed は `accomplished_date` を入力して確定。1 度 closed なら再 open 不可。`completed` は closed に連動して自動 True。

**テーブル定義**
- `M_MILESTONE`: id, staff_id(FK), title(100), description(256), color(10), status(bool), created_at, guidline_end_date(Date?), accomplished_date(Date?)
- `T_TIMELINE_EVENT` に追加: `milestone_id`(FK, nullable), `completed`(bool, auto)

**UI 操作（Timeline 画面）**
1. 管理者右上「マイルストーン作成」→ タイトル + 目安日付入力
2. タイムライン左上にカラーバー付きタイトル一覧表示
3. タイトルクリック → 詳細モーダル（作成者名, 説明(50文字折畳), 作成日, グループ名, 達成日）
4. 達成日入力・決定 → closed 表示。削除ボタンも追加（作成ミス用）

**実装範囲**
| カテゴリ | やること |
|---|---|
| バックエンド | `app/models.py`, `app/schemas.py`, `app/routers/timetable.py` に `/milestone/*` CRUD 追加。既存スキーマに `milestone_id` optional 追加 |
| フロント共通 | `TimelineType.ts` に Milestone 型定義 + `TimelineEventProps` 変更。TanStack Query: `/milestone/add`, `/milestone/all`, `/milestone/update`, `/milestone/remove` |
| フロント Calendar | イベント追加フォームに open なマイルストーン選択セレクト追加 |
| フロント Timeline | マイルストーン作成ボタン/フォーム、所属イベントの色指定、open 一覧配置、詳細モーダル |

→ 詳細は [`requirement-03.md`](./requirement-03.md) を参照

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