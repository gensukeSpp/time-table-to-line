# 概要 — task-11: PR #21 の ts/tsx 限定部分的取り込み

## 目的

`release/merge-timeline-modal` ブランチ（`origin/release` から切った）に、PR #21（`[Feature]タイムライン詳細モーダル (Issue #20)`、マージ済み）の **`*.ts` / `*.tsx` ファイルに限り**、その内容を手動移植する。

PR #21 は `main` ベースでマイルストーン工程（PR #17 / #19）を経ている。本ブランチは release 系でマイルストーン工程を経ていないため、`TimelinePage.tsx` の構造・`AuthInfoProp` の型契約・テストの整備状況が異なる。そのため **マージ / cherry-pick ではなく、ファイル単位・関数単位の移植** とする。

## ユーザーストーリー（取り込み後の挙動）

1. 管理者がタイムライン上のメンバーのイベントをクリックする
2. クリックしたイベント付近に詳細オーバーレイが重ねて表示される（メンバー名・タイトル・内容・進捗）
3. 詳細モーダル（オーバーレイ内の `AddChildForm`）は **常に閲覧専用**（更新 / 削除ボタンを出さない。編集は Calendar 側で行う）
4. オーバーレイ外クリック / `Escape` キーでも閉じる（PR #21 レビュー指摘への対応込み）
5. 一般ユーザーが他メンバーのイベントをクリックしてもオーバーレイは開かない
6. Calendar（個人）側の `AddChildForm` 挙動は従来どおり（`readOnly` 未指定なら変化なし）

## スコープ

### スコープ内（ts/tsx のみ）

- `src/lib/authPayload.ts` — `InquiryStaff` に `admin: boolean` 追加、`normalizeAuthPayload` で `admin: Boolean(inner.admin ?? false)` を返す
- `src/hooks/useAuthGuard.ts` — auth 戻り値に `admin: payload.admin` 追加
- `src/lib/TimelineType.ts` — `AuthInfoProp` の auth 型に `admin: boolean` 追加
- `src/components/organisms/EventDetailOverlay.tsx` / `.css.ts` — 新規作成（main 版の最終形）
- `src/components/organisms/InputItem.tsx` — `readOnly` プロップ、`useGroupUsersQuery` によるメンバー名解決、読取専用分岐
- `src/components/pages/TimelinePage.tsx` — `computeOverlayPos`、`handleItemClick`、オーバーレイ描画
- `src/tests/InputItem.spec.tsx` / `src/tests/EventDetailOverlay.spec.tsx` — 新規作成（PR #21 最終形）

### スコープ外

- PR #21 の非 ts/tsx 成果物（`devtools/`、`.github/reports/`、`docs/architecture/`、`specs/`、`tasks/issue-20/`）
- Calendar 側の挙動変更
- バックエンド変更（`/timetable/inquiry` の `admin`、`/group/users` は既存契約をそのまま利用）
- マイルストーン機能そのものの取り込み（別タスク）

## 前提・依存

- **admin 判定:** `/timetable/inquiry` のレスポンス（JWT クレーム由来）の `admin` を `normalizeAuthPayload` → `useAuthInfo` → `AuthInfoProp` に伝播させる（バックエンドは既に `admin` を返している。本ブランチのフロント型だけが未対応）
- **メンバー名:** `useGroupUsersQuery`（`/group/users` → `GroupUserProps[]`）で `staff_id` を引き、`family_kana` + `last_kana` から組む（本ブランチにも既存）
- **タイムラインは `canMove={false} canResize={false}`**（本ブランチも同じ）のため、イベントクリックがドラッグと競合しない
- **TimelinePage の base 差:** 本ブランチ版は `<p>グループタイムライン</p>` 直下に `<Timeline>` を置くシンプル構成（Milestone toolbar なし）。`useAuthContext`/`useAuthQuery` を直接呼ぶ点が main 版と異なるが、`useAuthInfo()` を追加するだけで足りる（`useAuthQuery` 呼び出しは維持してよい。`useAuthInfo` 内部が同じ query を叩くためキャッシュで二重 fetch は発生しない）

## リスク・注意

| リスク | 対処 |
|--------|------|
| cherry-pick すると Milestone 関連（main にしかない）の競合・欠落が発生 | ファイル単位の手動移植にする（本計画の前提） |
| 本ブランチの `AuthInfoProp` は auth 型に `admin` がない | authPayload → useAuthGuard → TimelineType の 3 点セットを同時に変更（型契約は 1 ブランチ内で一貫させる） |
| `readOnly` の意味づけ（PR #21 レビュー指摘 Medium） | main 最終形に合わせ「無条件に編集不可」として移植（コメントも main 版の文言に統一） |
| オーバーレイ閉じ UX（レビュー指摘 Low） | main 最終形（外クリック + Escape）をそのまま移植し、`EventDetailOverlay.spec.tsx` で検証 |
| `e.currentTarget` が null（React 19） | `computeOverlayPos` のフォールバック（{top:12,left:12}）を移植 |
| 既存 Calendar 側 `AddChildForm` を壊す | `readOnly` は optional。未指定なら従来挙動。`bun run build` / `bun run testrun` で回帰確認 |
| 権限漏れ（一般ユーザーに他メンバー詳細が見える） | `handleItemClick` で `isAdmin || authId === event.staff_id` のみ開く |

## 完了条件（Done）

- [ ] 取り込み対象 ts/tsx 9 ファイルが main（PR #21 最終形）と論理的に一致（Milestone 関連・非 ts/tsx を除く）
- [ ] `bun run build` が 0 error
- [ ] `bun run lint` が 0 error / 0 warning
- [ ] `bun run testrun` が全 PASS（既存テストの回帰なし）
- [ ] 実ブラウザ: 管理者が他メンバーのイベントをクリック → 詳細モーダル（閲覧専用）が開く
- [ ] 実ブラウザ: 自分のイベントをクリック → 閲覧専用モーダル（更新/削除ボタンなし）
- [ ] 実ブラウザ: 一般ユーザーが他メンバーのイベントをクリック → 開かない
- [ ] 実ブラウザ: オーバーレイ外クリック / Escape で閉じる
- [ ] 詳細は [`test-plan.md`](./test-plan.md) を参照
