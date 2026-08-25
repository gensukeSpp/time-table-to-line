# 概要 — マイルストーン追加処理と表示（Issue #16）

## 目的

バックエンドに実装済みのマイルストーン API（`/milestone/add`, `/milestone/all`）をフロントエンドから叩き、**管理者による「追加」** と **「読み込み（表示）」まで** を実装する。close / 削除 / イベント側の所属セレクトは本 Issue の対象外。

## ユーザーストーリー

1. **管理者** がタイムライン画面右上の「マイルストーン作成」ボタンをクリックする
2. タイトル・説明・目安日付を入力し「決定」をクリックする
3. タイムライン上部（追加ボタンの左）に「マイルストーンタイトル: 色のバー」として一覧に追加される
4. **一般ユーザー** には追加ボタンが表示されない（一覧は閲覧できる）
5. どのグループに属していても、同じマイルストーン一覧が表示される

## スコープ

### スコープ内
- `TimelineEventProps` への `milestone_id` / `completed` 属性追加と、`MilestoneProps` 型定義
- 追加ボタン / 追加モーダル（タイトル・説明・目安日付）/ open 一覧コンポーネントの新規実装
- `/milestone/add`, `/milestone/all` を叩く TanStack Query 配線
- 上記コンポーネントのタイムライン画面への配置（追加ボタン右・一覧左）

### スコープ外（次 Issue 以降の対象）
- close: `accomplished_date` 設定 + 子イベント `completed` 一括 True
- 削除: `milestone_id` -> None
- `InputItem.tsx`（イベント内容・進捗入力モーダル）への所属マイルストーンセレクト追加
- Calendar 側へのマイルストーン反映

## 前提・依存

- **バックエンドは実装済み**。`light_token_server/app/routers/timetable.py:242-312` に `/milestone/add`, `/milestone/all`, `/milestone/update/{id}`, `/milestone/remove/{id}` が存在し、`test_milestone.py` でテスト済み。フロントは API 契約（`architecture.md` §2）に従い実装するだけ。
- 認証は `AuthAxios` のインターセプターが全リクエストに `Authorization: Bearer` を付与済み。追加の認証配線は不要。
- タイムラインは `GroupHorizonTimeline`（`src/components/pages/TimelinePage.tsx`）。Mantine Tabs の `keepMounted` による非表示マウント問題（Issue #11）が既に対処済みのため、配置変更時も ResizeObserver 前提を壊さないこと。

## リスク・注意

| リスク | 対処 |
|--------|------|
| `TimelineEventProps` 追加で既存ビルドが壊れる | タスク 1 で属性追加直後に `bun run build` を通し、型不整合を一括洗い出し（Issue #16 実装詳細 1 の要件） |
| 非 admin の 403 | フロントは `admin` でボタンを非表示化 + バックエンド 403 の二重防御。インターセプターの 403 リトライ（`AxiosClientProvider.tsx:71`）が誤発火しないよう、403 は UI でのみ扱う（mutation エラー処理でハンドリング） |
| グループ横断一覧が同じになる性質 | `/milestone/all` にグループフィルタを**付けない**。フロントでも絞り込みしない |
| 日付形式 | 目安日付は `format(date, 'yyyy-MM-dd')` で文字列化。バックエンドの `MilestoneCreate.guidline_end_date: date` と一致させる |
| タイムライン幅測定 | 上部操作エリアをタイムライン本体の外に置き、`containerRef` / ResizeObserver の幅測定を妨げない |

## 完了条件（Done）

- [ ] `bun run build` が 0 error（型追加を含む）
- [ ] `bun run lint` が 0 error / 0 warning
- [ ] `bun run testrun` が全 PASS
- [ ] 管理者 UI でマイルストーン追加 → 一覧に「タイトル + 色バー」が表示される（受け入れ 1〜3）
- [ ] 非管理者には追加ボタンが表示されない（受け入れ 4）
- [ ] 別グループでも同じ一覧が表示される（受け入れ 5）
- [ ] 詳細は [`test-plan.md`](./test-plan.md) を参照