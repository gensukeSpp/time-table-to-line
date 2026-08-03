総評:
このPRは「編集/削除の復活」「カレンダービュー切替」「タイムラインのズーム改善」「認証をペイロードで扱う案」を実装することを目的としています。単体テストは通っていますが、Axios/認証周りの実装（src/lib/AuthInfo.ts と src/resources/fetch.ts）に重大な不整合とセキュリティ上の懸念があり、CI（lint）でもエラーが発生しているためマージ前の修正を推奨します。

変更ファイル（トップレベル）：
- package.json
- vite.config.ts
- src/lib/authPayload.ts (追加)
- src/lib/AuthInfo.ts
- src/resources/fetch.ts
- src/resources/queries.ts
- src/resources/queries.spec.tsx (追加)
- src/hooks/useAuthGuard.ts
- src/hooks/useTimelineDragZoom.ts
- src/components/pages/AuthPage.tsx
- src/components/templates/AuthParent.tsx
- src/components/molecules/EventUpdateButton.tsx
- src/components/organisms/InputItem.tsx
- その他：テスト/タスクドキュメントなど

重要な所見（分類付き）:

Blockers（必須対応）
1) src/lib/AuthInfo.ts の postHeaders 実装（致命的）
   - 証拠: ファイル全体（/src/lib/AuthInfo.ts）
     - 現状の実装は headers オブジェクトとして不正な値を返しており、`'Authorization': `******\n    'credentials': 'include' // ここを追加。` のような不完全な文字列が含まれています。
     - withCredentials を axios インスタンスで true にしている一方で、fetch 側では postHeaders をそのまま axios の config 引数に渡しているため、実際に Authorization ヘッダにトークンが乗りません（意図した認証が機能しない／壊れている可能性が高い）。
   - なぜ問題か: 認証フローが正しく機能しない、又は誤ったヘッダで通信することでバックエンドがエラーを返す。さらに 'Access-Control-Allow-Origin' をリクエストヘッダに含めている点は誤り（これはレスポンス側ヘッダ）。
   - 影響: 認証関連 API が失敗し、ログイン/ユーザー特定ができなくなる。潜在的にセキュリティやプライバシーに関わる情報の誤送信リスク。
   - 推奨修正（パッチ例）:
     - /src/lib/AuthInfo.ts の postHeaders を次のように置き換える（line 範囲: ファイル全体の postHeaders 部分）:

       export const postHeaders = async (postToken: string) => ({
         headers: {
           'Content-Type': 'application/json; charset=utf-8',
           'Authorization': `Bearer ${postToken}`,
         },
         withCredentials: true,
       });

     - もしくはバックエンド仕様が "payload に token を入れる" であれば、axios.post の第2引数（body）に token を渡し、第3引数に { headers: { 'Content-Type': 'text/plain' } } のように渡す形に統一してください。

Major（強く修正推奨）
2) src/resources/fetch.ts の axios 呼び出しと console.log
   - 証拠: fetchAuthResponse で basicAxios.post('/timetable/inquiry', postToken, await postHeaders(postToken)); を使用
   - なぜ問題か: postHeaders を修正しないと config が不正、あるいは headers が設定されない。加えて console.log が残っている（lint エラーの原因）。
   - 影響: 実際の API 呼び出しが仕様通り行われない。テスト実行時に外部接続のログ（ECONNREFUSED）が出るなど副作用がある。
   - 推奨修正:
     - postHeaders を上記修正した上で、fetchAuthResponse は基本的に問題ありませんが console.log を削除してください。
     - 具体例（fetch.ts の該当箇所）:
       const authResponse = await basicAxios.post<AuthInfoProp>('/timetable/inquiry', postToken, await postHeaders(postToken));
       // → console.log を削除

3) Lint エラーが CI を止める（複数ファイル）
   - 証拠: npm run lint の出力（12 errors）
     - src/components/templates/AuthParent.tsx: 未使用の import（AuthInfoProp, useSearchQuery）
     - src/components/templates/AxiosClientProvider.tsx: any の多用、useEffect の依存警告
     - src/resources/fetch.ts: console.log
   - なぜ問題か: PR をマージすると CI/lint に失敗して main ブランチが壊れる可能性が高い
   - 影響: 自動チェック/デプロイがブロックされる
   - 推奨修正:
     - 未使用 import を削除または _プレフィックスを付ける
     - AxiosClientProvider の any を適切な型に修正（または TODO コメントで型付け方針を明記し、別PRで対応する合意を取る）
     - fetch.ts の console.log を削除

Minor（任意・改善提案）
4) 認証トークンの扱い（localStorage と URL）
   - 証拠: src/components/templates/AuthParent.tsx は token を URL パラメータから localStorage に保存
   - 問題点: localStorage にトークンを置くと XSS による漏洩リスクがある。PR は URL にトークンを残さない工夫をしているが、根本的には httpOnly cookie を検討すべきです。
   - 推奨修正: セキュリティ方針として、可能ならサーバ側で httpOnly セッションクッキーを発行する、難しければトークンの有効期限を短くする・DOM の直接書き込みを最小化する等を検討してください。

5) useTimelineDragZoom の DRAG_SENSITIVITY と calculateZoomedTimeRange の使い方
   - 証拠: src/hooks/useTimelineDragZoom.ts
   - コメント: 実装は改善されていますが、DRAG_SENSITIVITY が小さいと意図せずズームが発生するかもしれません。テストでのカバレッジがあると安心です。

6) テスト実行ログに外部接続の失敗が出る
   - 証拠: npm run testrun 出力に connect ECONNREFUSED 127.0.0.1:8000 ログ（ただしテストは通過）
   - 理由: 一部テストが外部 API に到達しようとしている（モック化不足またはネットワーク依存）。
   - 推奨修正: ネットワークアクセスを完全にモック化するか、テストが外部通信しないように修正。

Notes（参考情報）
- 新規追加の src/lib/authPayload.ts は正規化ロジックとして妥当に見えます。ただし backend の返す staff_id が数値でない場合（例: 'staff-1'）は Number() が NaN になり null を返すため、想定される backend の型に合わせるか、テストの期待を調整してください（現状テストは fetch 呼び出し回数を見ており、この関数の厳密な仕様に矛盾は起きていません）。
- 単体テスト: vitest のテストは実行済み。結果: 4 files / 14 tests passed (1 skipped)。ただし lint が失敗しているため CI 総合は通りません。

具体的な修正案（抜粋）:
1) /src/lib/AuthInfo.ts の修正（置換）
- 変更箇所: ファイル内の postHeaders 実装（ファイル全体を置き換えるのが確実）
- 例:
  export const postHeaders = async (postToken: string) => ({
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${postToken}`,
    },
    withCredentials: true,
  });

2) /src/resources/fetch.ts: console.log の削除
- 変更箇所: fetchAuthResponse 内の console.log 行（ファイル内行: ログ出力行）
- 例: 削除だけでOK

3) /src/components/templates/AuthParent.tsx: 未使用 import の削除
- 削除対象: AuthInfoProp, useSearchQuery の import（該当行）

4) Lint 対応: /src/components/templates/AxiosClientProvider.tsx の any を適切な型に置換、useEffect の依存配列確認

チェックリスト（著者向け）:
- [ - ] src/lib/AuthInfo.ts の postHeaders を正しい axios config 形式に修正している
- [ - ] src/resources/fetch.ts の console.log を削除している
- [ - ] lint を通す（npm run lint が通る）
- [ - ] テストがネットワークに依存していないことを確認（外部接続のエラーをログに残さない）
- [ ] 認証フロー（localStorage / URL token）のセキュリティ方針を README/PR に明記している

総合的な推奨（結論）:
- 推奨アクション: Request changes（修正を求めます）
  理由: 認証周りの実装不整合（動作しない/セキュリティ懸念）と lint エラーが CI をブロックするため。

必要なら修正パッチの草案をこちらで作成します（postHeaders と fetch の連携は特に安全に修正できます）。

---
レビュー者メモ: このレビューを .github/reports/issue-7-review.md に保存しました。必要に応じて追記します。
