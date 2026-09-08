# Task-12 overview — マイルストーン所属イベントの色が選択解除後にデフォルトへ戻る

## 目的

タイムライン上で一度クリック（選択）したマイルストーン所属イベントが、別イベントのクリックで選択が移った際に**自身のマイルストーン色を失ってデフォルト `#2196f3` に戻ってしまう**バグを修正する。

## 報告・再現

ユーザー報告（要約）:
1. マイルストーン所属イベントをクリック → `rgb(255, 193, 7)`（#ffc107）。
2. 他のイベントをクリック → そのイベントが `#ffc107` になる一方、**先の所属イベントは `rgb(33, 150, 243)`（#2196f3）に戻ってしまう**。

### 実ブラウザで再現確認（Playwright / dedicated Chrome, 社員番号 201 でログイン）

登録データ（PostgreSQL）:
- イベント 19「止めたレビューで出費」= milestone 1（**waiting**, 色 `#9c27b0`, opacity 0.7）
- イベント 14「ジャンプチームの手伝い」= milestone 2（**open**, 色 `#009688`）
- その他イベント = 未所属（デフォルト色）

確認した挙動（修正前）:

| 操作 | 止めたレビューで出費(waiting) | ジャンプチームの手伝い(open) | 未所属 |
|---|---|---|---|
| 初回表示 | `#9c27b0` + op0.7 ✓ | `#009688` ✓ | `#2196f3` ✓ |
| それをクリック | `#ffc107`（選択色） | — | — |
| 別イベントをクリック | **`#2196f3` に戻る（op0.7 は残る）✗** | — | `#ffc107` |
| （別シナリオで）open を選択後に解除 | — | **`#2196f3` に戻る ✗** | — |

つまり「未所属イベントの選択/解除」は正しく `#ffc107` / `#2196f3` を往復するが、**一度選択されたマイルストーン所属イベントは選択解除後に自分の色を失う**。

さらに重要な観察:
- **マイルストーン所属イベントを一度も選択していない状態**で未所属イベントだけ選択しても、マイルストーンイベントの色は維持される。→ 「選択`relaunch`のリレンダーが色を壊す」のではなく、「**そのマイルストーンイベント自身が選択された後**に色を失う」。

## 根本原因

react-calendar-timeline（vendored, 0.30.0-beta.4）は**アイテム要素を `ref` 経由で imperatively にスタイリング**する（`left/top/width/height` などのレイアウトに加えて `background` も直接 DOM へ書き込む）。このため:

- React の `style` prop を通じて `getItemProps({ style: decor })` で渡した `backgroundColor` は、**選択状態の切り替え（selected の on/off）を契機にライブラリが実行する imperative なスタイル書き込みで上書きされる**。
- 結果、`#9c27b0` / `#009688` などのマイルストーン色がデフォルト `#2196f3`（`getItemStyle` の基準色）にリセットされる。`opacity`（waiting の 0.7）だけは残るため、waiting イベントで「色だけ落ちて半透明のまま」の印象になる。

裏付け:
- `node_modules/react-calendar-timeline/dist/react-calendar-timeline.es.js` の `getItemStyle(i)`（約 3767 行目）で `Object.assign({}, Qh, ed(選択時), …, i.style, u)`。`i.style` は decor を乗せるが、ライブラリの imperative 書き込みがこれに競り勝つ。
- ライブラリは Item の位置等を `this.itemRef.current` へ直接設定する設計のため、React の宣言的 `style` では決定性が得られない。

## 解決方針（決定事項）

**`getItemProps` には decor を渡さない**（`style: {}`。ライブラリの既定背景を素直に使わせる）。そして**マイルストーン色は `itemRenderer` の自作 ref コールバックで `!important` 付き `background-color` を imperative に適用**する。`!important` を付けることで、ライブラリの imperative 書き込み（通常優先度）に確実に勝てる。

- 対象は `itemContext.selected` が `false`（非選択）のときのみ適用 → 選択中はライブラリの選択色 `#ffc107` を保持できる。
- `selected === true` のときは自作の `!important` 指定だけを `removeProperty('background-color')` で剥がし、ライブラリ選択色を見せる。
- 未所属イベント（`decor.backgroundColor` が無い）は一切触らない。
- `opacity`（waiting）も ref コールバックで `node.style.opacity` に設定する。

決定ポイント（利用者に確認済みの前提）:
- クリック直後の選択色は従来どおり **`#ffc107`** を維持する（マイルストーンイベントをクリックしても `#ffc107` が一瞬見える / 選択中は `#ffc107`）。
- 選択解除後は**自身のマイルストーン色**に戻る（デフォルト色にならない）。仕様の「デフォルトイベント色 `#2196f3` に近い色を避ける」の対象は**未所属イベントのデフォルト色**であり、所属イベントの配色とは別。

## スコープ外

- バックエンド（`light_token_server`）変更なし。
- Calendar ビュー / イベントフォーム変更なし。
- MilestoneList の表示ロジック変更なし。
- 選択色自体・配色パレットの変更なし。

## 成果物

- `src/components/pages/TimelinePage.tsx` の `itemRenderer` を上記方針に修正。
- `ItemContext` の `selected` を型（`Pick<ItemContext, ... 'selected'>`）に追加。
- レグレッション確認：lint / build / 単体テスト / 実ブラウザ手動確認。
- 本プラン（README / overview / architecture / tasks / test-plan）。

## リスク・注意

- ライブラリの imperative 書き込みと ref コールバックの適用順は実ブラウザで確認済み（`!important` が優先される）。
- `ref` の合成（ライブラリの ref 維持 + 自前 ref）を正しく行う必要がある（`itemRef`）。
- 未所属イベントの背景を誤って消さないこと（`decor.backgroundColor` が無い場合は早期 return）。初期バージョンで `removeProperty` を全アイテムに実行して透明化する回帰を踏んだため、ガード必須。