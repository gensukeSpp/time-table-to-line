# 概要 — タイムライン詳細モーダル（Issue #20）

## 目的

管理者がタイムライン上で、グループメンバーの作業の詳細・進捗を把握できるようにする。Calendar（個人）画面に既存の詳細フォーム（`AddChildForm`）を、タイムライン（グループ）画面でも管理者が**閲覧だけ**できる形で呼び出せるようにする。メンバーが多い場合も、クリックしたイベント付近に重ねて表示することで**下までスクロールさせずに済む**ようにする。

## ユーザーストーリー

1. 管理者がタイムライン上のメンバーのイベントをクリックする
2. クリックしたイベント付近に詳細モーダルが重ねて表示される（メンバー名・タイトル・内容・進捗）
3. 他メンバーのイベントでは**更新 / 削除ボタンが表示されない**（読取専用）
4. 自分（管理者自身）のイベントでは従来どおり編集できる（更新 / 削除ボタンあり）
5. 一般ユーザーが自分のイベントをクリックすると従来どおり編集できる
6. 一般ユーザーが他メンバーのイベントをクリックしても詳細モーダルは開かない（管理者限定機能）

## スコープ

### スコープ内
- `react-calendar-timeline` の `Timeline` に `onItemClick` を追加し、イベントクリックで詳細モーダルを開く
- `AddChildForm` に管理者の読取専用モード（`readOnly` プロップ）を追加し、他メンバーのイベントで更新 / 削除ボタンを出さない
- メンバー名を `useGroupUsersQuery` で解決し、`staff_id` 数値ではなく文字列で表示（読取専用時）
- クリックしたイベント付近に重ねて表示する絶対配置オーバーレイ
- 既存 Calendar 側の `AddChildForm` 挙動は変更しない（`readOnly` 未指定なら従来どおり）

### スコープ外（次 Issue / 別タスクの対象）
- Calendar（個人）画面の変更
- イベント更新 / 削除 API 自体の新規追加（既存 `useUpdateEventMutation` / `useDeleteMutation` を再利用）
- バックエンド変更

## 前提・依存

- **admin 判定:** `useAuthInfo()`（`/timetable/inquiry` の JWT クレーム由来）の `admin` を使う。イベント側の `admin` フラグは常に `false` なので使わない（既存 `TimelinePage.tsx:24-25` と同様）。
- **メンバー名:** `useGroupUsersQuery`（`/group/users` → `GroupUserProps[]`）で `staff_id` を引き、`family_kana` + `last_kana` から組む。参考: `src/lib/SampleState.ts:88-103`。
- **タイムラインは `canMove={false} canResize={false}`**（既存）のため、イベントクリックがドラッグと競合しない。`onItemClick` 用ハンドラで詳細モーダルのみ開く。
- **認証:** `AuthAxios` インターセプターが全リクエストに `Authorization` を付与済み（追加配線不要）。

## リスク・注意

| リスク | 対処 |
|--------|------|
| `onItemClick` の `e.currentTarget`（クリックされたイベント要素）が React 19 で `null` になり得る | オーバーレイ位置の取得は `currentTarget` を primary、失敗時はフォールバック位置（タイムライン上部右寄り）を使う（`architecture.md` §5）。実ブラウザ確認で位置を検証 |
| 既存 Calendar 側 `AddChildForm` を壊す | `readOnly` は optional プロップ。未指定時は従来挙動を完全維持し、`bun run build` / 単体テストで回帰確認 |
| 非 admin に他メンバー詳細が漏れる | タイムラインのクリックハンドラは `isAdmin || 自分のイベント` の場合のみモーダルを開く（`{admin & ...}`） |
| メンバー名が `family_kana` / `last_kana` の片方だけ | 欠けている側は `?? ''` で guard（`row ? ... : '不明'`） |
| オーバーレイがタイムライン外にはみ出す | コンテナ相対位置を計算し、幅・高さを超えたらクランプ（`architecture.md` §5） |

## 完了条件（Done）

- [ ] `bun run build` が 0 error
- [ ] `bun run lint` が 0 error / 0 warning
- [ ] `bun run testrun` が全 PASS
- [ ] 実ブラウザ: 管理者が他メンバーのイベントをクリック → 詳細モーダルが開き、更新 / 削除ボタンが**表示されない**（受け入れ 1）
- [ ] 実ブラウザ: 自分のイベントをクリック → 従来どおり更新 / 削除ボタンが表示される（受け入れ 2）
- [ ] 実ブラウザ: 詳細モーダルがクリックしたイベント付近に重ねて表示される（受け入れ 3）
- [ ] 詳細は [`test-plan.md`](./test-plan.md) を参照