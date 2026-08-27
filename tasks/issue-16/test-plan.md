# テスト計画 — マイルストーン追加処理と表示

## 1. 静的品質ゲート（必須・毎回）

```bash
bun run testrun   # 全テスト PASS
bun run lint      # --max-warnings 0（console.log 禁止含む）
bun run build     # tsc + vite build 0 errors
```

- Task 1 の型追加後、まず `bun run build` を通して属性追加による型不整合を一括検出する。
- 新規コンポーネント / フックに `console.log` を残さない（AGENTS.md 方針）。lint がゲートになる。

## 2. 単体テスト（Vitest + Testing Library）

既存 `src/tests/` に以下を追加 / 拡張する。

| テスト | 対象 | 内容 |
|-------|------|------|
| `milestone.spec.ts`（新規） | 型 / 変換ユーティリティ | `MilestoneProps` の `created_at`/`guidline_end_date` が ISO 文字列 / null を扱えること。日付フォーマット（`format(v,'yyyy-MM-dd')`）が期待値を返すこと |
| `TimelineType.spec.ts`（新規・任意） | `TimelineEventProps` | `milestone_id` / `completed` が optional として欠落してもビルド / 型検査が通ること（省略時 `undefined` のまま） |
| `MilestoneList.spec.tsx`（新規・任意） | `MilestoneList` | mock クエリで open 一覧が「タイトル + 色バー」として描画されること。Loading 中の表示 |

> 補足: サーバー状態は TanStack Query が担うため、コンポーネントテストでは `QueryClientProvider` + `QueryClient` でラップし、`/milestone/all` をモックする。既存 `Calendar.spec.tsx` / `Timeline.spec.tsx` の書き方を踏襲する。

## 3. バックエンド契約確認（依存確認）

バックエンドは実装済みだが、フロント実装前に契約が正しいことを一度だけ確認する。

```bash
# light_token_server 側（既存テスト）
cd ../light_token_server && bun run test  # または該当テスト
```

- `test_milestone.py` で `/milestone/add`（admin / 非 admin=403）、`/milestone/all`（open のみ）が通ることを確認。
- レスポンスのキーが `architecture.md` §1-2 の `MilestoneProps` と一致することを突き合わせる（`id, staff_id, title, description, color, status, created_at, guidline_end_date, accomplished_date`）。

## 4. 実ブラウザ確認（受け入れ要件マッピング）

管理者 / 一般ユーザーそれぞれでログインし、タイムライン（`/timeline`）で確認する。バックエンド `light_token_server`（port 8000）とフロント Vite（port 5173）を起動しておく。

| # | 操作 | 期待 | 受け入れ要件 |
|---|------|------|-------------|
| 1 | 管理者で `/timeline` を開く | 右上に「マイルストーン作成」ボタンが表示される | 1 |
| 2 | ボタン → モーダルでタイトル入力 → 決定 | モーダルが閉じ、一覧に「タイトル + 色のバー」が追加される | 1・2・3 |
| 3 | 説明 / 目安日付を入力して追加 | 一覧に反映（色は 10 パレットのうち open 未使用色） | 1・2 |
| 4 | DB 確認（`SELECT * FROM M_MILESTONE;`） | 追加したレコードが存在する（`status=True`） | 2 |
| 5 | リロード / タブ再切替 | 一覧が再取得され、消えずに表示される | 3 |
| 6 | 一般ユーザーで `/timeline` を開く | 追加ボタンが表示されない。一覧は閲覧できる | 4 |
| 7 | 別グループのユーザーで開く | 同じ一覧が表示される（グループ横断共有） | 5 |

## 5. 回帰確認

- タイムラインの表示（`GroupHorizonTimeline`）が上部操作エリア追加後も壊れないこと（Issue #11 の「DevTools で修復される」症状が出ない。タブ往復で幅が正しく再測定される）。
- 既存イベントの作成 / 移動 / リサイズ、カレンダー（Calendar）画面に影響がないこと。

## 6. リスク対応チェック

- 非 admin の追加を強行した場合: バックエンドが 403 を返し、UI にエラーが出て一覧が更新されないこと（`AxiosClientProvider` の 403 リトライが誤って再送を繰り返さないか目視）。
- 目安日付の送信形式が `'yyyy-MM-dd'` になっているか（`yyyy-MM-dd'T'HH:mm:ss` 等になっていないか）。