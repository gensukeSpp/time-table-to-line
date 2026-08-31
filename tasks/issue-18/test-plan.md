# テスト計画 — マイルストーン内容の更新と削除

## 1. 静的品質ゲート（必須・毎回）

```bash
bun run testrun   # 全テスト PASS
bun run lint      # --max-warnings 0（console.log 禁止含む）
bun run build     # tsc + vite build 0 errors
```

- Task 1 の `status` 型変更後、まず `bun run build` を通して文字列化による型不整合を一括検出する。
- 新規コンポーネント / フックに `console.log` を残さない（AGENTS.md 方針）。lint がゲート。

## 2. 単体テスト（Vitest + Testing Library）

### 既存テストの更新

| テスト | 対象 | 変更 |
|-------|------|------|
| `src/components/organisms/MilestoneList.test.tsx` | MilestoneList | mock の `status: true/false` → `'open'/'closed'`。フィルタは `status !== 'closed'` |

### 新規テスト

| テスト | 対象 | 内容 |
|-------|------|------|
| `MilestoneList.test.tsx`（拡張） | MilestoneList | ① waiting マイルストーンに「MM/dd close」が表示される ② closed は一覧から消える（`status !== 'closed'` フィルタ） ③ タイトルクリックで詳細モーダルが開く |
| `useMilestoneMutation.test.tsx`（拡張） | ミューテーション | `useUpdateMilestoneMutation` が `/milestone/update/{id}` に正しい payload で呼ばれる / `useRemoveMilestoneMutation` が `/milestone/remove/{id}` を DELETE する |
| `milestone.spec.ts`（新規） | `src/lib/milestone.ts` | `getMilestoneClosedAt` が `accomplished_date + MILESTONE_CLOSE_GRACE_DAYS` を返す。`formatClosedLabel` が `MM/dd` を返す。`accomplished_date` が null なら null |

> サーバー状態は TanStack Query が担うため、コンポーネントテストでは `QueryClientProvider` + `QueryClient` でラップし、`useMilestonesQuery` / `useGroupUsersQuery` をモックする（既存 `MilestoneList.test.tsx` の書き方を踏襲）。

## 3. バックエンド契約の確認（依存確認）

本 Issue はフロントエンドのみだが、実装前に**想定契約**（`architecture.md` §2）がバックエンドに反映されているかを一度だけ確認する。

```bash
# light_token_server 側
cd ../light_token_server && bun run test
```

- `test_milestone.py` が更新後も通ること。
- `/milestone/all` が `open` + `waiting` を返すこと、`/milestone/update/{id}` が `title` 等の編集を受け付け、`accomplished_date` 設定で `status: 'waiting'` になること。

> **乖離している場合（現状のまま）:** 実ブラウザ確認はスキップし、フロントの想定契約に基づくコード・単体テストのみで完了とする。不一致は issue / task として別途切り出し。

## 4. 実ブラウザ確認（受け入れ要件マッピング）

**前提:** バックエンドが `architecture.md` §2 の契約に揃っていること。バックエンド（port 8000）とフロント Vite（port 5173）を起動しておく。管理者で `/timeline` を開く。

| # | 操作 | 期待 | 受け入れ要件 |
|---|------|------|-------------|
| 1 | マイルストーン一覧の**タイトルをクリック** | 詳細モーダルが開く | — |
| 2 | モーダルの「作成者名」「グループ名」を確認 | 数値（staff_id / group）ではなく、名前・グループ名の文字列が表示される | 1 |
| 3 | タイトル / 説明 / ガイドライン終了日を編集し「更新」 | 一覧に反映される（API 反映） | 1 |
| 4 | 達成日を入力し「更新」 | `status` が `waiting` になり、一覧に「MM/dd close」が表示される | 2 |
| 5 | （任意）`/milestone/remove/{id}` を叩いて waiting -> closed | 一覧から該当マイルストーンが消える | 3 |

## 5. 回帰確認

- タイムライン表示（`GroupHorizonTimeline`）が、`MilestoneList` のタイトルクリック化後も壊れないこと（臨時 / Issue #11 の「DevTools で修復される」症状が出ない）。
- 既存のマイルストーン追加（`MilestoneCreateDialog`）・イベント作成 / 移動 / リサイズ、カレンダー（Calendar）画面に影響がないこと。

## 6. リスク対応チェック

- 非 admin が更新 / 削除を強行した場合: バックエンド 403。モーダルは admin のみ出しつつ、mutate エラーは UI に表示（`AxiosClientProvider` の 403 リトライ再送を目視）。
- 日付送信形式が `'yyyy-MM-dd'` になっているか（`accomplished_date` / `guidline_end_date`）。
- waiting の「MM/dd」表示が、年を跨ぐ場合も正しい実際の日付から計算されているか（`addDays` は年跨ぎも正しく処理）。
