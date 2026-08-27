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
| **UI ライブラリ** | Mantine v7（Chakra UI / Radix UI から移行済み） |
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
                      │                   └── /timeline → GroupHorizonTimeline
                      │                        ├── MilestoneList / MilestoneAddButton (admin)
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
│   │   ├── MilestoneAddButton.tsx          # マイルストーン作成ボタン（admin のみ）
│   │   ├── MilestoneCreateDialog.tsx       # マイルストーン作成モーダル
│   │   └── MilestoneList.tsx               # open マイルストーン一覧
│   ├── pages/           # ページコンポーネント
│   │   ├── CalendarComponent.tsx / CalendarWrapperComponent.tsx
│   │   ├── TimelinePage.tsx                # GroupHorizonTimeline
│   │   └── AuthLeaveComponent.tsx
│   └── templates/       # レイアウト/プロバイダー
│       ├── ViewComponents.tsx       # ルーティング
│       ├── AuthParent.tsx           # 認証 Context Provider
│       ├── EventsParent.tsx         # イベント Context Provider
│       └── AxiosClientProvider.tsx  # Axios インターセプター
├── hooks/               # カスタムフック
│   ├── useContextFamily.ts          # Context 定義
│   ├── useAuthGuard.ts              # 認証情報取得（admin 含む）
│   ├── useEventMutation.ts          # イベント CRUD mutation
│   ├── useMilestoneMutation.ts      # マイルストーン mutation（useAddMilestoneMutation）
│   ├── useMouseHandle.ts            # カレンダー DnD ハンドル
│   ├── useTimelineDragZoom.ts       # タイムラインズーム
│   ├── useCallingForm.tsx           # 編集フォーム制御
│   └── useDialog.tsx                # ダイアログ制御
├── lib/                 # 型とユーティリティ
│   ├── TimelineType.ts              # 中心的な型定義（MilestoneProps 含む）
│   ├── AuthInfo.ts                  # Axios インスタンス
│   ├── authPayload.ts               # /timetable/inquiry の admin 正規化
│   ├── Localization.ts              # date-fns ローカライザー
│   ├── SampleState.ts               # モックデータ
│   ├── TmelineData.ts               # タイムラインデータ変換
│   ├── timelineZoomUtils.ts         # ズーム計算
├── resources/           # データフェッチ & キャッシュ
│   ├── fetch.ts                     # API 呼び出し（fetchMilestones 含む）
│   ├── queries.ts                   # TanStack Query フック（useMilestonesQuery 含む）
│   └── cache.ts                     # クエリーキー & キャッシュ操作（milestoneKeys 含む）
├── stories/             # Storybook ストーリー
│   ├── Calendar.stories.tsx
│   └── Timeline.stories.tsx
└── tests/               # Vitest テスト
    ├── Calendar.spec.tsx
    ├── Timeline.spec.tsx
    └── timelineZoomUtils.spec.ts
```

### データフロー
1. **認証**: URL クエリパラメータ `?token=xxx` でトークンを受け取り → `AuthProvider` が Context に保存 → `AuthAxios` が Axios インターセプターで全リクエストに Authorization ヘッダーを付与 → トークン期限切れ時は自動リフレッシュ。管理者判定は `/timetable/inquiry` の `admin` を `useAuthInfo().admin` で参照
2. **イベント取得**: `EventsContextProvider` が `useEventsQueryForTL` (TanStack Query) で全イベントを取得 → Context に保存 → 各コンポーネントが `useEventsState()` で参照
3. **イベント操作**: カレンダー上で DnD → `useMouseHandle` が新旧時刻を `eventList` に蓄積 → `TimesUpdateButton` が一括更新 (`useUpdateDateListMutation`)
4. **新規作成**: カレンダーのスロットをクリック → `DialogOnSlot` がモーダル表示 → `InputTitleDialog` でタイトル入力 → `useCreateMutation` で POST
5. **マイルストーン**: `useMilestonesQuery` で一覧取得 → `MilestoneList` が open 一覧表示。`MilestoneAddButton`（admin のみ）→ `MilestoneCreateDialog` → `useAddMilestoneMutation` で POST `/milestone/add`

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
| `/timetable/inquiry` | POST | 認証情報照会（admin 含む） |
| `/refresh` | POST | トークンリフレッシュ |
| `/group-names` | POST | グループ名一覧 |
| `/group/users` | POST | グループメンバー一覧 |
| `/milestone/all` | GET | マイルストーン一覧取得 |
| `/milestone/add` | POST | マイルストーン追加 |
| `/milestone/update/:id` | POST | マイルストーン更新（backend 実装済み・フロント未実装） |
| `/milestone/remove/:id` | DELETE | マイルストーン削除（backend 実装済み・フロント未実装） |

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

## 詳細ドキュメント（.qwen/rules/）

更新頻度の高い詳細は `.qwen/rules/` 配下に分離している。

- **既知の問題点** → [`KNOWN_ISSUES.md`](./.qwen/rules/KNOWN_ISSUES.md)
- **リファクタリングロードマップ** → [`REFACTORING_ROADMAP.md`](./.qwen/rules/REFACTORING_ROADMAP.md)
- **アーキテクチャスナップショット** → [`ARCHITECTURE_SNAPSHOT.md`](./.qwen/rules/ARCHITECTURE_SNAPSHOT.md)
- **機能要件（マイルストーン）** → [`MILESTONE.md`](./.qwen/rules/MILESTONE.md)

## 参考リンク

- [react-big-calendar](https://github.com/bigcalendar/react-big-calendar)
- [react-calendar-timeline](https://github.com/namespace-ee/react-calendar-timeline)
- [Mantine](https://mantine.dev/)
- [Vanilla Extract](https://vanilla-extract.style/)
- [TanStack Query v5](https://tanstack.com/query/v5)