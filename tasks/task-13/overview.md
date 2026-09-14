# overview.md — マイルストーン詳細の全員閲覧化 + タイムライン詳細表示の余白

## 目的

マイルストーンは「グループ共通の長スパンタスク」であり、実際に取り組むのは一般メンバーも含む。
しかし現状のタイムラインでは、マイルストーン詳細モーダルを開けるのは**グループ管理者のみ**
（非管理者はタイトルがクリック不可、モーダルも非表示）。これでは「マイルストーンに取り組む
メンバーが、そのマイルストーンの説明・目安日・達成状況を把握できない」。

本タスクでは、**閲覧は誰でも可能**にしつつ、**変更（更新）は管理者のみ**という本来の権限モデル
（requirement-03: 「イベントからの所属選択は一般ユーザーも可能」・「マイルストーンの作成・close は
グループ管理者のみ」）に合わせて詳細モーダルを修正する。

副次対応として、タイムラインのイベント詳細表示（閲覧専用 `AddChildForm`）が周囲に余白なく
詰まっている見栄えを改善し、padding を追加する。

## ユーザーストーリー

- 一般メンバー「自分が取り組んでいるマイルストーンの詳細（説明・目安日・達成状況）を確認したい」
  → タイトルをクリックして詳細モーダルを開き、読取専用で確認できる。
- 管理者「マイルストーン情報の間違いを直したい」→ 従来どおり詳細モーダルで編集できる。

## 現状の問題（コード調査結果 / 変更前の挙動）

| # | 場所 | 現状 | 影響 |
|---|------|------|------|
| 1 | `src/components/organisms/MilestoneListTitle.tsx` | `handleOpen` が `if (!admin) return;` で弾き、`UnstyledButton` に `disabled={!admin}` / `aria-disabled` / `cursor:not-allowed` / `opacity:0.7` | 非管理者はタイトルをクリックしても何も起きない |
| 2 | `src/components/organisms/MilestoneList.tsx:35` | `const handleOpenDetail = isAdmin ? setSelected : () => undefined;` | 非管理者には詳細を開くハンドラすら渡らない |
| 3 | `src/components/organisms/MilestoneList.tsx:49` | `<MilestoneDetailDialog>` を `{selected && isAdmin && ...}` で表示 | 非管理者はモーダル自体がレンダリングされない |
| 4 | `src/components/organisms/MilestoneDetailDialog.tsx:59-72` | `!admin` のとき「作成者名・グループ名 + 『管理者のみ更新できます。』」のみ表示。タイトル/説明/日付は表示しない | たとえ開けても詳細が把握できない |

## スコープ

**スコープ内（フロントエンドのみ）**
- 1〜4 の admin ゲート撤廃（閲覧）
- `MilestoneDetailDialog` の非管理者向け読取専用詳細表示の追加（編集フォームは管理者のみのまま）
- `EventDetailOverlay.css.ts` の `overlay` への padding 追加

**スコープ外**
- バックエンド変更（`light_token_server`）なし
- マイルストーン作成 / close / 削除の権限ロジック変更なし

## 前提・依存

- 非管理者の判定: `useAuthInfo()` → `AuthInfoProp{type:'auth'}.admin`（`MilestoneList.tsx` の
  `isAdmin` をそのまま流用）。イベントの `admin` フラグは常に false なので使わない。
- `MilestoneDetailDialog` は既に `admin` prop を持ち、内部で編集 UI と読取 UI を分岐済み。
  編集可否を左右する `admin` prop はそのまま使う。
- マイルストーンの詳細表示に必要なフィールドは全て `MilestoneProps` に存在
  （`title` / `description` / `color` / `status` / `created_at` / `guideline_end_date` /
  `accomplished_date` / `staff_id`）。
- `EventDetailOverlay` は `TimelinePage.tsx:234` でのみ使用（タイムライン専用）。
  `AddChildForm` 自体は Calendar でも編集フォーム用途で使うため、余白は `EventDetailOverlay.css.ts`
  の `overlay` 側に付ける（`AddChildForm` の共有クラス `formParent` には手を入れない）。

## リスク

- MilestoneListTitle から `admin` prop を外すと、呼び出し側 `MilestoneList.tsx` の `admin={isAdmin}`
  も同時に外さないと lint（未使用）に抵触する。タスク同士を直列で行うこと。
- 詳細モーダルのテストは `useAuthInfo()`・TanStack Query・Mantine 依存のため、テストは
  `AuthStateContext.Provider` + `QueryClientProvider` + `MantineProvider` でラップが必要
  （`AuthProvider not found` 防止、既存の `EventDetailOverlay.spec.tsx` と同じ方針）。
- padding は CSS のみの変更で既存テストに影響しないが、実ブラウザで「閉じるボタンが
  余白に食い込まない」「イベント本文が切れない」ことを確認する。

## 完了条件

- 受け入れ要件 1〜7（README.md 参照）を満たす
- 親（このセッション）が `bun run lint` / `bun run build` / `bun run testrun` を最後にまとめて通す
