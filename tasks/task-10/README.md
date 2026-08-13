# Task 10: /event/all・/refresh の 401 — 原因調査（フロント側のトークン未送信）

> **種別:** 調査タスク（backend のコード修正は不要）
> **対象範囲:** backend `light_token_server` の認可検証ロジックの動作確認と、401 の原因切り分け。
> **結論:** 原因はフロント（呼び出し側）で、backend 側の実装は仕様どおり正常に動作している。

## 目的（Goal）

`/event/all` への GET が繰り返し 401 になっていた件について、backend 側のコードが正しく、原因がフロント側にあることを実コードで確定して記録する。

## ログの流れ（事実）

- `/event/all` への GET が 401 になっていたとき、backend の `tokens.py` は「Bearer ヘッダーなし → Cookie もなし → missing token で 401」を返している。これは想定どおりの動作。
- `/event/all` は `timetable.py:105-108` で `Depends(require_token)` を要求。
  - `require_token` → `get_token_claims(request, "access")` が **ヘッダー → Cookie の順** でトークンを探す（`tokens.py:68-97`）。
  - どちらにも無ければ 401（`tokens.py:85-87`）。
- フロントで `Authorization: Bearer {token}` を付けた結果、同じ `/event/all` が通るようになった = **backend の Bearer 検証は正しく動いており、以前は「トークンが渡っていなかった」だけ**、というのがログの一致する解釈。

## /refresh のエラーも同時に消えた理由

- フロントでリクエストラッパー／fetch の共通処理にヘッダーをまとめて追加したため、`/event/all` だけでなく `/refresh` にも同じ `Authorization` ヘッダーが付くようになったため。
- `/refresh` は `timetable.py:68` で `get_token_claims(request, {"access", "refresh"})` と **access / refresh 両方を受け付ける** ため、Bearer が付いた時点で正常に通る。
- つまりヘッダー追加が両方の症状をまとめて解決した、という因果関係に合致する。

## Cookie フォールバックの制約（補足）

- Cookie フォールバック（`tokens.py:78-84`）は、リクエストに httpOnly Cookie が乗る ＝ 同一オリジンかつ fetch が `credentials` 込みの場合にしか効かない。
- `time-table-to-line` が別オリジンから叩いている場合、Cookie は自動で付かず **Bearer ヘッダーを明示的に送るしかない**。
- 今回のフロント側の対応（Bearer 付与）は正しい契約の使い方。

## コード上の裏取り（引用箇所）

| 説明 | 実箇所 |
|---|---|
| `/event/all` が `require_token` を要求 | `timetable.py:105-108` |
| `/refresh` が access/refresh 両方を受ける | `timetable.py:68` |
| Bearer 優先 → Cookie フォールバックの順 | `tokens.py:68-97`（`_bearer_token` は 53-65） |
| Cookie フォールバック | `tokens.py:78-84` |
| トークン欠如で 401 | `tokens.py:85-87` |

## 完了条件（Done）— 全て確認済み

- [x] `/event/all` の 401 が「フロントがトークンを送っていなかった」ことによるものであると確定
- [x] backend の Bearer 検証が仕様どおり動作していることを確認
- [x] /refresh の症状が同じヘッダー追加で解消した因果関係を説明
- [x] backend 側のコード修正は不要と判断

## 備考（backend 側の将来整理候補・動作には影響なし）

- `tokens.py` に複数の `print(...)` が残存（26, 57, 64, 80, 86, 90, 93, 96 行目）。
  - 一部はトークン先頭 10 文字（64 行目）、シークレット先頭 5 文字（26 行目）をログ出力しており、AGENTS.md の「console.log 削除」方針に類するセキュリティ観点がある。
  - 動作には影響しないため、本タスクでは対象外。backend を整理する際の作業候補として記録。
