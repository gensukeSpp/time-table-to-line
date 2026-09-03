# テスト計画 — タイムライン詳細モーダル

## 1. 静的品質ゲート（必須・毎回）

```bash
bun run testrun   # 全テスト PASS
bun run lint      # --max-warnings 0（console.log 禁止含む）
bun run build     # tsc + vite build 0 errors
```

- 新規コンポーネント / フックに `console.log` を残さない（AGENTS.md 方針）。lint がゲート。
- `AddChildForm` 拡張後、まず `bun run testrun` / `bun run build` で既存 Calendar 側の回帰が起きていないかを確認する。

## 2. 単体テスト（Vitest + Testing Library）

### 新規テスト

| テスト | 対象 | 内容 |
|-------|------|------|
| `src/tests/InputItem.spec.tsx`（新規） | `AddChildForm` | ① 管理者が他メンバーのイベントを `readOnly` で見ると更新 / 削除ボタンが出ない ② メンバー名（`family_kana` + `last_kana`）が表示される ③ 警告ダイアログが出ない ④ 自分のイベントは `readOnly` 指定でも編集可（更新 / 削除が出る） |
| `src/tests/Timeline.spec.tsx`（拡張） | `GroupHorizonTimeline` | ⑤ `onItemClick` 相当のクリックでオーバーレイが開く ⑥ 非 admin が他メンバーのイベントをクリックしても開かない |

- サーバー状態は TanStack Query が担うため、`QueryClientProvider` + `QueryClient` でラップし、`useAuthQuery` / `useGroupUsersQuery` を react-query キャッシュへモック投入する（`Timeline.stories.tsx:16-59` の手法を踏襲）。
- 認証モックは `{ type: 'auth', authId: ..., admin: true, group: ..., code: ... }`（admin ケース）と `{ type: 'auth', authId: ..., admin: false, ... }`（一般ユーザーケース）の両方を用意する。

> `react-calendar-timeline` の `onItemClick` は内部クリック処理経由のため、単体テストでの発火は story の `play` 内で相当イベントをトリガする（Task 4 Step 2）。実装困難な場合は `AddChildForm` の読取専用テストを主とし、open 条件は `test-plan.md` §4 の実ブラウザ確認で担保する。

## 3. バックエンド契約の確認（依存確認）

本 Issue はバックエンド変更なし。既存契約のみ利用するため、追加確認は不要。

- `/timetable/inquiry` が JWT クレーム由来の `admin` を返すこと（既存実装で確認済み）。
- `/group/users` が `staff_id, family_kana, last_kana` を返すこと（既存実装で確認済み）。

## 4. 実ブラウザ確認（受け入れ要件マッピング）

**前提:** バックエンド（port 8000）とフロント Vite（port 5173）を起動しておく。管理者で `/timeline` を開く。

| # | 操作 | 期待 | 受け入れ要件 |
|---|------|------|-------------|
| 1 | 管理者が**他メンバーのイベントをクリック** | 詳細モーダルが開く。更新 / 削除ボタンが**表示されない**。メンバー名・タイトル・内容・進捗が読取専用で表示される | 1 |
| 2 | 管理者が**自分のイベントをクリック** | 従来どおり更新 / 削除ボタンが表示される（編集可） | 2 |
| 3 | モーダルの位置を確認 | クリックしたイベント付近に重ねて表示される（縦スクロール不要） | 3 |
| 4 | 一般ユーザーで `/timeline` を開き、**他メンバーのイベントをクリック** | 詳細モーダルが開かない | — |
| 5 | 一般ユーザーで**自分のイベントをクリック** | 従来どおり編集できる | 2 |

## 5. 回帰確認

- Calendar（個人）画面のイベント編集フォーム（`AddChildForm`）が、`readOnly` 拡張後も従来どおり動くこと。更新 / 削除 / 警告ダイアログの動作不変。
- タイムライン表示（`GroupHorizonTimeline`）が、`onItemClick` 追加後も壊れないこと（臨時 / Issue #11 の「DevTools で修復される」症状が出ない）。
- 既存のマイルストーン一覧 / 作成、イベント移動 / リサイズ（`canMove={false} canResize={false}` のまま）に影響がないこと。

## 6. リスク対応チェック

- オーバーレイ位置: `e.currentTarget` が React 19 で `null` になる場合、フォールバック位置（タイムライン上部右寄り）へ倒れる。実ブラウザで位置が不自然なら `computeOverlayPos` のクランプ / フォールバックを調整（`architecture.md` §5）。
- 非 admin の他メンバー漏れ: `onItemClick` が `isAdmin || 自分のイベント` 以外では `return` することを確認（`{admin & ...}`）。
- オーバーレイがタイムライン / 別イベントを覆いすぎないか: `zIndex: 100` と `maxWidth` で軽量に留め、必要なら閉じるボタンで即 close（`AddChildForm` の「閉じる」ボタン利用）。