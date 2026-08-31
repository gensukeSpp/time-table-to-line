# 概要 — マイルストーン内容の更新と削除（Issue #18）

## 目的

バックエンドに実装済みのマイルストーン更新・削除(close)機能を、フロントエンドから機能させる。加えて、`status` が `'waiting'`（waiting for close / 再 open 猶予期間）のマイルストーンを一覧に表示し、「closed となる日付 + close」を gray 文字で出す。**本 Issue はフロントエンドのみ**で、バックエンドは別途対応済みとみなし、想定する API 契約を `architecture.md` §2 にドキュメント化する。

## ユーザーストーリー

1. タイムライン上部のマイルストーン一覧で、**タイトルをクリック**すると詳細(更新)モーダルが開く
2. モーダルに「作成者名」「グループ名」「タイトル」「説明」「ガイドライン終了日」「達成日」が表示される
3. タイトル / 説明 / ガイドライン終了日 / 達成日は編集でき、「更新」ボタンで API に反映される
4. 達成日に値が入ると `status: 'waiting'` となり、一覧では「色バー — MM/dd close — タイトル」の順に gray 文字で表示される
5. （猶予期間経過後は `status: 'closed'` になり一覧から消える — 本 Issue ではテストで確認）
6. 削除ボタンは**設置しない**（`/milestone/remove` は waiting → closed 遷移のテスト専用）

## スコープ

### スコープ内
- `MilestoneProps.status` の型変更（`boolean` → `'open' | 'waiting' | 'closed'`）と、それに伴う `MilestoneList` / テストのフィルタ修正
- タイトルのクリック可能化 + 詳細(更新)モーダルコンポーネントの新規実装
- `/milestone/update/{id}` / `/milestone/remove/{id}` を叩く TanStack Query 実装
- `status: 'waiting'` の「MM/dd close」gray 表示（色バーとタイトルの間）
- 既存テストの `status` を boolean → 文字列へ更新 + 新規テスト

### スコープ外（次 Issue / 別task の対象）
- 猶予期間の実日数（`closed` 化する日数）の確定 → フロントは仮定数で表現
- バックエンド修正（`/milestone/update` がタイトル等の編集・`waiting` 受け付け、`/milestone/all` が waiting を含めて返す等）
- Calendar 側の反映 / イベントフォームへのマイルストーンセレクト

## 前提・依存

- **フロントエンドは Issue #16 で実装済み**（`MilestoneList.tsx`, `MilestoneCreateDialog.tsx`, `MilestoneAddButton.tsx`, `useMilestoneMutation.ts`, `milestoneKeys`, `fetchMilestones`, `useMilestonesQuery`）。
- **想定 API 契約**（`architecture.md` §2 参照）に沿って実装する。**現状のバックエンドはこの契約と乖離している**ため、実ブラウザ確認は契約反映後に行う。
  - `/milestone/all` は `open` と `waiting` を返す（closed のみ除外）
  - `/milestone/update/{id}` は `title / description / guidline_end_date / accomplished_date` を受け付け、`accomplished_date` 設定で `status: 'waiting'` になる
  - `/milestone/remove/{id}` は `{"closed": id}` を返す
- 作成者名は `useGroupUsersQuery`（`/group/users` → `GroupUserProps[]`）で `staff_id` を引き、`family_kana` + `last_kana` から組む。グループ名は `useAuthInfo()` の `group`（`/timetable/inquiry` の JWT クレーム由来、`AuthInfoProp{type:'auth'}.group`）。
- 認証は `AuthAxios` インターセプターが全リクエストに `Authorization` を付与済み（追加配線不要）。

## リスク・注意

| リスク | 対処 |
|--------|------|
| `status` を文字列化すると既存フィルタ `m.status`（真偽判定）が壊れる | タスク 1 で `m.status === 'open'` 相当へ修正し、`bun run build` で型不整合を一括洗い出し |
| 現状バックエンドは waiting を返さない／update が編集を受け付けない | 本 Issue は frontend のみ、想定契約を文書化。実ブラウザ確認は契約反映後に実施（`test-plan.md` §5 の前提） |
| 猶予期間未定 | `MILESTONE_CLOSE_GRACE_DAYS` を仮定数で定義（TODO コメント付き）。テストも同定数で計算 |
| 作成者名が `family_kana` と `last_kana` のどちらかに欠ける | 欠けている場合は片方のみ表示（guard 関数で `?? ''`） |
| 非 admin の閲覧 | 更新・削除はバックエンド 403。フロントはボタン・モーダルを admin のみに制限しつつ、mutation エラーは UI で表示 |

## 完了条件（Done）

- [ ] `bun run build` が 0 error（status 型変更を含む）
- [ ] `bun run lint` が 0 error / 0 warning
- [ ] `bun run testrun` が全 PASS（waiting → closed テスト含む）
- [ ] 実ブラウザ（契約反映後）: タイトルクリック → 詳細モーダルに作成者名・グループ名が文字列で表示される（受け入れ 1）
- [ ] 実ブラウザ（契約反映後）: waiting マイルストーンに「MM/dd close」が表示される（受け入れ 2）
- [ ] 実装要件 6 のテストが Pass（受け入れ 3）
- [ ] 詳細は [`test-plan.md`](./test-plan.md) を参照
