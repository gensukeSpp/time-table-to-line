# Issue 1: イベントの編集・削除ができない

> **問題文:** イベントの追加はできるが、編集・削除ができない（ドラッグ・アンド・ドロップによる伸縮・移動はできる）
> **深刻度:** 大
> **関連:** 「編集フォーム」の「閉じる」ボタンが fixed (深刻度: 小)

## 現状分析

### 事象
- イベントをクリックすると編集フォームが表示される
- 「更新」「削除」ボタンが現れない
- URL が `.../calendar?userID=undefined` になっている（`authId` が入るべき）

### 根本原因

`InputItem.tsx` の `AddChildForm` コンポーネント（67行目）で、更新/削除ボタンの表示条件に `useSearchQuery('userID')` を使用している:

```tsx
// InputItem.tsx:42
const { data: infoContext } = useSearchQuery('userID');

// InputItem.tsx:67
{infoContext === selectedStaff ? <EventUpdateButtons ... /> : <Box></Box>}
```

`useSearchQuery('userID')` は **URL のクエリパラメータ `?userID=...` を読み取る**。URL が `?userID=undefined` の場合、`infoContext` は文字列 `"undefined"` となり、`selectedStaff`（実際の staff_id の文字列）と一致しないため、ボタンが表示されない。

### 呼び出し関係

```
CalendarPage.tsx
  └── CalendarWrapper
        └── MyCalendar (CalendarView.tsx)
              └── AddChildForm (InputItem.tsx)
                    └── EventUpdateButtons (EventUpdateButton.tsx)
                          ├── useUpdateEventMutation(id)
                          └── useDeleteMutation(id)
```

- `EventUpdateButtons.tsx` 自体は mutation 関数を持っており、呼び出せれば正しく動作する
- `useAuthInfo()` (useAuthGuard.ts) は正しい `authId` を返す（API から取得）

### なぜ URL に userID=undefined がセットされるのか

- `AuthParent.tsx` または `AuthPage.tsx` で、トークン検証後に `userID` クエリパラメータを設定している箇所がある
- そのロジックで `authId` の代わりに `undefined` が渡されている可能性が高い

## 修正計画

### 修正 1: 認証情報の取得元を URL から Auth Context に変更

**ファイル:** `src/components/organisms/InputItem.tsx`

**変更内容:**
- `useSearchQuery('userID')` の代わりに `useAuthInfo()` または `useAuthContext()` を使用して `authId` を取得する
- 比較対象を `selectedStaff` から `authId`（数値）に変更する

**Before:**
```tsx
const { data: infoContext } = useSearchQuery('userID');
// ...
{infoContext === selectedStaff ? <EventUpdateButtons ... /> : <Box></Box>}
```

**After:**
```tsx
const { authId } = useAuthInfo();
// ...
{authId === selectedEvent.staff_id ? <EventUpdateButtons ... /> : <Box></Box>}
```

### 修正 2（任意）: URL の userID パラメータ設定箇所を調査・修正

**調査対象ファイル:**
- `src/components/templates/AuthParent.tsx`
- `src/components/pages/AuthPage.tsx`
- その他、URL クエリパラメータを操作している箇所

**変更内容:**
- `?userID=undefined` にならないよう、未定義値が渡された場合のガードを追加する
- または userID パラメータ自体を不要にし、Auth Context に統一する

### 修正 3（小）: 「閉じる」ボタンの fixed スタイル問題

**調査対象:**
- `InputItem.tsx` 49行目の `closeClick` ボタン
- `EventUpdateButtons` のボタンも同様のスタイル問題がないか確認

**変更内容:**
- ボタンの CSS クラス `buttonPosition` が `fixed` でないか確認
- `position: 'relative'` または適切なレイアウトに変更

## 影響範囲

| ファイル | 変更内容 | リスク |
|---------|---------|-------|
| `src/components/organisms/InputItem.tsx` | useSearchQuery → useAuthInfo | 低（既存のフックを置き換えるのみ） |
| `src/components/templates/AuthParent.tsx` （調査） | userID クエリ設定ロジック | 中（URL パラメータの変更は他に影響する可能性） |
| `src/components/pages/AuthPage.tsx` （調査） | 同上 | 中 |

## タスク一覧

- [x] `InputItem.tsx` の `useSearchQuery('userID')` を `useAuthInfo()` に置き換え
- [x] `authId` と `selectedEvent.staff_id` の比較に修正
- [x] URL の userID パラメータ設定箇所を調査（`AuthParent.tsx`, `AuthPage.tsx`）
- [x] 認証後も `token` を URL / localStorage に保持（遷移でトークン消失しないように）
- [x] inquiry レスポンス正規化（`normalizeAuthPayload`）と失敗時の画面表示
- [ ] 「閉じる」ボタンの fixed スタイル問題を確認・修正
- [ ] `bun run lint` で警告ゼロ確認（AxiosClientProvider の既存エラーあり）
- [x] `bun run testrun` でテスト成功確認
- [ ] 実際にブラウザで編集・削除が動作することを確認

## 2026-07-31 追記: auth 画面で固まる問題

### 原因
1. `AuthPage` で `staff_id != null` ガードを入れた結果、inquiry 失敗や不正レスポンス時に **遷移しなくなった**（以前は `userID=undefined` でカレンダーへ進んでいた）
2. `/calendar?userID=...` へ遷移する際に **token を落としていた**（Auth Context / Axios ヘッダが切れる）
3. `useSearchQuery` の queryKey に URL が含まれておらず、トークン取得がキャッシュで壊れることがあった
4. `BASE_URL` を Vite proxy (`''`) に変えると、backend の 302/Cookie 扱いで inquiry が HTML になることがある

### 修正
- `normalizeAuthPayload` でレスポンスを正規化
- 遷移先を `/calendar?userID=...&token=...` に変更 + localStorage にも保存
- `useAuthQuery` に `enabled: !!authToken`
- `AuthInfo` の BASE_URL を `VITE_LOCAL` に戻す
- 更新/削除ボタン判定は `useAuthInfo().authId`（URL の userID に依存しない）
