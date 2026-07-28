# Time Table & Timeline (v4)

## プロジェクト概要

イベントを**タイムテーブル（カレンダー）** と **タイムライン（横軸ガントチャート風）** の 2 つのビューで管理する SPA。
認証済みユーザーがイベントの CRUD、ドラッグ&ドロップによる日時移動・リサイズを行う。

元は `Manabu-Aihara/time-table4` のリファクタリング+機能追加プロジェクト。
**リファクタリング最優先** で、段階的に進める。

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| **フレームワーク** | React 19 + TypeScript 5.7 |
| **ビルド** | Vite 6 |
| **パッケージ管理** | bun |
| **ルーティング** | react-router-dom 7 |
| **状態管理** | Context API + @tanstack/react-query 5 |
| **カレンダー** | react-big-calendar (with dragAndDrop) |
| **タイムライン** | react-calendar-timeline |
| **UI ライブラリ** | Mantine v7（Chakra UI / Radix UI から移行） |
| **スタイリング** | Vanilla Extract (CSS-in-JS, zero-runtime) |
| **HTTP クライアント** | Axios 1 |
| **日付操作** | date-fns（moment / dayjs から統一予定） |
| **テスト** | Vitest + jsdom + Testing Library（Storybook 併用） |
| **Storybook** | 8 (react-vite) |
| **リンター** | ESLint 9 + Prettier 3 |

## アーキテクチャ

### コンポーネント階層（Atomic Design ベース）

```
src/main.tsx
  └── BrowserRouter (TopRouter)
       └── <Index /> (src/components/index.tsx)
            └── QueryClientProvider
                 └── RoutesComponent
                      ├── AuthProvider
                      │    └── AuthAxios (Axios インターセプター)
                      │         └── EventsContextProvider
                      │              └── Routes
                      │                   ├── /auth → AuthLeavePage
                      │                   ├── /calendar → CalendarWrapper
                      │                   │    ├── MyCalendar (react-big-calendar + DnD)
                      │                   │    ├── TimesUpdateButton
                      │                   │    └── DialogOnSlot
                      │                   └── /timeline → MyHorizonTimeline
                      │                        └── react-calendar-timeline
```

### ディレクトリ構造

```
src/
├── components/
│   ├── molecules/       # 小さな再利用コンポーネント
│   │   ├── EventUpdateButtonComponent.tsx  # イベント更新/削除ボタン
│   │   ├── TimeUpdateButtonComponent.tsx   # 日時一括更新ボタン
│   │   └── WrapComponent.tsx               # カスタムイベントラッパー
│   ├── organisms/       # 複合コンポーネント
│   │   ├── Dialog.tsx / DialogOnSlotComponent.tsx  # <dialog> モーダル
│   │   ├── InputItem.tsx / InputTitleDialog.tsx     # イベント入力フォーム
│   │   └── DaysComponent.tsx
│   ├── pages/           # ページコンポーネント
│   │   ├── CalendarComponent.tsx / CalendarWrapperComponent.tsx
│   │   ├── TimelineComponent.tsx
│   │   └── AuthLeaveComponent.tsx
│   └── templates/       # レイアウト/プロバイダー
│       ├── ViewComponents.tsx       # ルーティング
│       ├── AuthParent.tsx           # 認証 Context Provider
│       ├── EventsParent.tsx         # イベント Context Provider
│       └── AxiosClientProvider.tsx  # Axios インターセプター
├── hooks/               # カスタムフック
│   ├── useContextFamily.ts          # Context 定義
│   ├── useAuthGuard.ts              # 認証情報取得
│   ├── useEventMutation.ts          # イベント CRUD mutation
│   ├── useMouseHandle.ts            # カレンダー DnD ハンドル
│   ├── useTimelineDragZoom.ts       # タイムラインズーム
│   ├── useCallingForm.tsx           # 編集フォーム制御
│   └── useDialog.tsx                # ダイアログ制御
├── lib/                 # 型とユーティリティ
│   ├── TimelineType.ts              # 中心的な型定義
│   ├── AuthInfo.ts                  # Axios インスタンス
│   ├── Localization.ts              # date-fns ローカライザー
│   ├── SampleState.ts               # モックデータ
│   ├── TmelineData.ts               # タイムラインデータ変換
│   ├── timelineZoomUtils.ts         # ズーム計算
│   └── Theme.ts                     # (未使用/古いコード)
├── resources/           # データフェッチ & キャッシュ
│   ├── fetch.ts                     # API 呼び出し
│   ├── queries.ts                   # TanStack Query フック
│   └── cache.ts                     # クエリーキー & キャッシュ操作
├── stories/             # Storybook ストーリー
│   ├── Calendar.stories.tsx
│   ├── Timeline.stories.tsx
│   └── Button.stories.ts / Header.stories.ts / Page.stories.ts (デフォルト)
└── tests/               # Vitest テスト
    ├── Calendar.spec.tsx
    ├── Timeline.spec.tsx
    ├── timelineZoomUtils.spec.ts
    └── vitest-setup.ts
```

### データフロー

1. **認証**: URL クエリパラメータ `?token=xxx` でトークンを受け取り → `AuthProvider` が Context に保存 → `AuthAxios` が Axios インターセプターで全リクエストに Authorization ヘッダーを付与 → トークン期限切れ時は自動リフレッシュ
2. **イベント取得**: `EventsContextProvider` が `useEventsQueryForTL` (TanStack Query) で全イベントを取得 → Context に保存 → 各コンポーネントが `useEventsState()` で参照
3. **イベント操作**: カレンダー上で DnD → `useMouseHandle` が新旧時刻を `eventList` に蓄積 → `TimesUpdateButton` が一括更新 (`useUpdateDateListMutation`)
4. **新規作成**: カレンダーのスロットをクリック → `DialogOnSlot` がモーダル表示 → `InputTitleDialog` でタイトル入力 → `useCreateMutation` で POST

### バックエンド API（推測）

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/event/all` | GET | 全イベント取得 |
| `/event/user` | GET | ユーザー自身のイベント取得 |
| `/event/add` | POST | イベント追加 |
| `/event/remove/:id` | DELETE | イベント削除 |
| `/event/update/:id` | POST | イベント更新（タイトル/進捗） |
| `/date/update` | POST | 日時一括更新 |
| `/date/update/:id` | POST | 個別日時更新 |
| `/timetable/inquiry` | POST | 認証情報照会 |
| `/refresh` | POST | トークンリフレッシュ |
| `/group-names` | POST | グループ名一覧 |
| `/group/users` | POST | グループメンバー一覧 |

## ビルド & 実行

```bash
# 開発サーバー起動
bun run dev

# ビルド
bun run build

# プレビュー（ビルド後）
bun run preview

# テスト（watch モード）
bun run test

# テスト（CI モード）
bun run testrun

# リンター
bun run lint

# Storybook 起動
bun run storybook

# Storybook ビルド
bun run build-storybook
```

## 開発規約

### コーディングスタイル
- コンポーネントは `tsx`、型・ユーティリティは `ts`
- スタイリングは Vanilla Extract (`*.css.ts`) と CSS Modules (`*.module.css`) を併用
- 関数コンポーネント + Hooks が基本（クラスコンポーネントは `App.tsx` に残存）
- ESLint は `--max-warnings 0`（警告ゼロ必須）

### 命名規則
- ファイル: PascalCase（コンポーネント）、camelCase（hooks/lib）
- 型: `Props` 接尾辞（例: `TimelineEventProps`）
- Context: `XxxStateContext` / `XxxDispatchContext`

### テスト
- テストフレームワーク: Vitest（Jest 非推奨）
- コンポーネントテストは Vitest + Testing Library で行う（Jest は使わない）
- Storybook の Playwright 連携で包括可能なら Storybook を優先
- テストファイル: `src/tests/` または `*.spec.tsx`（コンポーネント横置き）

### 状態管理
- サーバー状態: **TanStack Query**（キャッシュキーは `resources/cache.ts` で一元管理）
- クライアント状態: **Context API**（認証情報、イベントリスト）
- コンポーネントローカル: `useState` / `useReducer`

## 既知の問題点（requirement-01.md より）

### タイムテーブル（react-big-calendar）
1. **PM 11:00 にイベントが追加できない** → allDay 扱いになってしまう
2. **allDay が期待する箇所で 12:00 AM に追加される**
3. **DB 保存時刻が日本時間ではない**（UI 上は期待通りに見えるが、DB テーブルの値が UTC 等になっている可能性）

### タイムライン（react-calendar-timeline）
1. **イベントの「重なり」表示ができない**

### コード品質
- `console.log` の残存（セキュリティリスク）
- コメントアウトされた不要コード
- 未使用の型・モジュール（`Theme.ts` など）
- 3 つの日付ライブラリ（moment / date-fns / dayjs）が混在 → date-fns に統一予定
- 2 つの UI ライブラリ（Chakra UI / Radix UI）が混在 → Mantine v7 に統一予定

## リファクタリングロードマップ

リファクタリングは **コンポーネント単位で細かくタスク分割し、順序立てて進める**。

### 完了（2026-07-24）
1. **パッケージ管理**: yarn → bun 移行（完了）
2. **ライブラリ更新**: 全依存を最新に一括インストール（React 19, Vite 6, Mantine v7, TanStack Query 5, 等）
3. **不要コード削除**: `src/DnDApp.tsx`, `src/lib/ClickOrDouble.js` 削除、vite.config.ts 整理

### 今後必要なコード修正タスク（順次実施）
1. **ESLint フラット設定**: `.eslintrc.cjs` → `eslint.config.js` 移行（ESLint 9 対応）
2. **Mantine 移行**: Chakra UI / Radix UI → Mantine v7 コンポーネント置き換え（import 修正含む）
3. **date-fns 統一**: moment / dayjs → date-fns に書き換え（サブパス import の修正含む）
4. **react-calendar-timeline import 修正**: `react-calendar-timeline-v3` → `react-calendar-timeline`
5. **React 19 互換性修正**: `useRef` の引数なし呼び出し修正、他 API 変更対応
6. **TypeScript 型エラー修正**: 上記修正に伴う型エラーの解消
7. **コンポーネントリファクタリング**: `molecules/` → `templates/` の順序等、提案ベースで決定
8. **バグ修正**: 11PM 問題、タイムライン重なり表示
9. **機能追加**: requirement-02.md で別途定義

### 備考
- インストール段階で削除した旧依存パッケージの一覧はプロジェクトメモリー参照
- 各コード修正タスクは `tasks/` ディレクトリ配下に計画を保存する

## 参考リンク

- [react-big-calendar](https://github.com/bigcalendar/react-big-calendar)
- [react-calendar-timeline](https://github.com/namespace-ee/react-calendar-timeline)
- [Mantine](https://mantine.dev/)
- [Vanilla Extract](https://vanilla-extract.style/)
- [TanStack Query v5](https://tanstack.com/query/v5)