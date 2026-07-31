# PR #3 レビュー: コード清掃一段落: これから動作不具合に向かう

## 1) 推奨結果（短い要約）
- 推奨: Request changes（修正を要求）
  - 理由: ビルド/型エラーにつながる致命的な構文エラー（src/components/templates/AxiosClientProvider.tsx）と、動作に影響するロジックの不整合が複数見つかったため。

---

## 2) 変更の全体説明（何が変わったか、PR説明との整合性）
- PRタイトル/本文: 「コード清掃一段落」とあり、不要ファイル削除・コメント削除・リファクタの意図が書かれています。差分は大部分が"掃除"（App.tsx/App.css削除、storybookのbuildアセット削除、ドキュメント追加）で、説明とおおむね整合します。
- 主要な変更箇所（例）:
  - 削除: src/App.tsx, src/App.css, 多数の storybook static ファイル
  - 追加/変更: docs/architecture/* の追加、eslint.config.js の更新
  - 主要コード: src/resources/{fetch,queries}.ts, src/hooks/*, src/lib/* (timeline周り)、src/components/* の修正
- コメント: "掃除"に伴い動作に影響しない小さな改修が多いものの、認証周りのインターセプト実装（Axios の interceptor）に未完成/マスキングされた箇所が残っており、これが実行時に致命的なエラーを発生させます（下記参照）。

---

## 3) 重大な指摘（Blockers / High severity）
以下は PR をマージする前に修正が必須と考えます。

1. 致命的: Axios リクエスト/レスポンスインターセプタの構文エラー
   - ファイル: src/components/templates/AxiosClientProvider.tsx
   - 位置: 行 18-21, 35 (行番号はローカルブランチでの行番号)
     - 18: if (config.headers["Authorization"] !== `****** {
     - 19:   config.headers["Authorization"] = `******;
     - 35: prevRequest!.headers["Authorization"] = await `******;
   - 問題点: `` を使ったプレースホルダのままになっており、テンプレートリテラルが閉じられていない・文法的に無効。TypeScript/JS のパース時に構文エラーになりビルドが失敗します。
   - 影響: アプリ全体のコンパイル/起動不可（AuthAxios が Routes のトップレベルで使われているため）。
   - 対処案：
     - プレースホルダをそのままにせず、実際のトークン取得ロジックに置き換える。例: tokenContext または useRefreshQuery の結果を使って `Authorization: `Bearer ${token}` を設定する。
     - レスポンス側（403時）のハンドリングは、refresh の refetch を呼んで新トークンを取得し、prevRequest にヘッダをセットして再実行する実装にする。
     - 実装例（案）はこのレビューの最後の「小さな差分提案」に記載。

2. High: getItems の誤った存在チェックで単一要素が無視されるロジック
   - ファイル: src/lib/TmelineData.ts
   - 位置: 行 19-23
     - code: const contextState = eventContextQueries.length > 1 ? eventContextQueries.map(...) : exEvents;
   - 問題点: eventContextQueries.length > 1 としているため、要素が1件のときに exEvents（サンプル）にフォールバックしてしまう。
   - 影響: 実データが 1 件しかないケースで意図しないサンプルデータに差し替わり、画面に誤った/不要なイベントが表示される。
   - 対処案: length > 0（もしくは eventContextQueries && eventContextQueries.length）に変更。map の際にオブジェクトを破壊的に mutate せず新しいオブジェクトを返すことも推奨。

3. High: useUserEventsQuery の map で元のオブジェクトを破壊的に上書きしている
   - ファイル: src/resources/queries.ts
   - 位置: 行 79-83
     - code: start: item.start = new Date(...), end: item.end = new Date(...)
   - 問題点: オブジェクトのプロパティに代入しつつ値を返す書き方で副作用がある（元データを mutate している）。またエラーが発生すると data が不正な状態で残る可能性。
   - 影響: 想定外の副作用（参照されている他箇所への影響）、可読性低下。テスト/デバッグが困難に。
   - 対処案: 代入ではなく純関数的に new Date(...) を返す形にする。

---

## 4) マイナー指摘 / 改善提案（Medium/Low）
- src/lib/AuthInfo.ts
  - 行 6: headers の Content-Type 値が `"application/json; charset=utf-8'"` のように末尾に余分なシングルクォートがあります。
  - 修正案: `"application/json; charset=utf-8"`
  - 重要度: Medium（致命的ではないが不適切なヘッダ値）

- ファイル名のtypo: src/lib/TmelineData.ts
  - 修正案: ファイル名/参照を `TimelineData.ts` に揃えると可読性向上。
  - 重要度: Low（動作に支障がなければ後回しでも可）

- EventsParent (src/components/templates/EventsParent.tsx)
  - 行: state を組み立てる箇所で `data!` を使っているため、data が undefined のときに runtime error になる可能性がある。
  - 修正案: `const state: TimelineEventPropsList = [initialData].concat(data ?? []);`
  - 重要度: Medium

- useCallingForm.tsx の handleOuterFormBubbling のロジック
  - クリックイベントでボタン以外では setShowModal が動かない実装になっている（意図的なら可）。意図せぬ挙動であれば見直し。
  - 重要度: Low

- 一貫性:
  - 時刻フィールドの命名（start / start_time, end / end_time）がコンポーネント/クエリ間で混在しているため、どの API がどちらを返すかを明確にドキュメント化すると保守性が上がります。

---

## 5) セキュリティ / パフォーマンス / UX の懸念
- セキュリティ:
  - 現状の Axios インターセプタにトークン/プレースホルダがそのまま残っているため、誤って実トークンを埋め込んだままコミットしないよう注意。トークンは環境変数や安全なストレージから取得すること。
- パフォーマンス:
  - 大量の storybook static アセットを削除しているため PR が大きく見えるだけであれば問題ないが、ビルドアーティファクトをコミットしない方針があるなら今後は .gitignore を整備した方が良い。
- UX:
  - getItems のバグ（length の判定）やタイムラインのズーム周りの修正は UX に直接関わります。特に "要素が 1 件のときにサンプルが表示される" 問題はユーザー混乱を招くため早めに修正すべき。

---

## 6) テスト手順（ローカルでの検証手順）
> 前提: Node.js とパッケージがインストール済み（package.json の依存関係をプロジェクトにインストールする必要あり）

1. PR ブランチを取得・チェックアウト
   - gh CLI を使える場合: `gh pr checkout 3`
   - git のみ: `git fetch origin refs/pull/3/head:pr-3 && git checkout pr-3`

2. 依存関係（必要に応じて）
   - 推奨: `npm ci`（CI 環境向け）または `npm install`

3. 静的解析 / 型チェック / ビルド
   - Lint: `npm run lint`
   - テスト（Vitest）: `npm run testrun` または `npm run test`（対話式）
   - ビルド: `npm run build`

4. ローカル起動（動作確認）
   - 開発サーバ: `npm run dev` でブラウザから `/calendar` と `/timeline` を確認

5. 期待される失敗点の確認
   - 現状、`src/components/templates/AxiosClientProvider.tsx` の構文エラーを修正するまで `npm run build` / `npm run dev` は失敗するはずです。まずはそこでエラーが消えることを確認してください。

- CI の確認: 今回の実行環境では `npm run lint` / `npm run testrun` を実行できませんでした（詳細は次節）。CI の結果（Pipeline）があれば必ず確認してください。

---

## 7) CI / 実行環境について（本レビューでの実行結果）
- 今回のレビューではリポジトリをローカルでチェックアウトしてコードを静的に確認しました。
- 期待されるスクリプト（`npm run lint`, `npm run testrun`, `npm run build`）を実行しようとしましたが、実行環境でのコマンド実行が拒否/制限され (`npm run lint` の実行が拒否される応答が返りました)、実際の lint/test/build の実行ログは取得できませんでした。
  - そのためテストの成否は未実行です。ローカルもしくは CI 上で上記コマンドを実行して結果を確認してください。

---

## 8) 推奨レビュワー / フォローアップタスク
- 推奨レビュワー:
  - 認証周り/Axios を担当する方（例: @frontend-auth）
  - タイムライン周りのロジック担当（例: @frontend-timeline）
  - CI/ビルド担当（例: @devops）

- フォローアップタスク（優先度順）:
  1. AxiosClientProvider.tsx の構文・トークンロジック修正（必須）
  2. src/lib/TmelineData.ts の length 判定修正（高）
  3. src/resources/queries.ts の map の副作用修正（高）
  4. AuthInfo.ts の Content-Type 文字列修正（中）
  5. EventsParent の data の null 合体演算子対応（中）
  6. ファイル名 typo の整理（低）

---

## 9) 小さな差分提案（diff 形式・適用はしない）
### A) AxiosClientProvider.tsx（致命的な構文エラーの修正例）
```diff
*** 修正前: src/components/templates/AxiosClientProvider.tsx
@@
-    const requestIntercept = basicAxios.interceptors.request.use(
-      (config) => {
-        if (config.headers["Authorization"] !== `****** {
-          config.headers["Authorization"] = `******;
-        } else {
-          config.headers["Authorization"] = `******;
-        }
-        return config;
-      },
-      (error: AxiosError) => Promise.reject(error)
-      );
+    const requestIntercept = basicAxios.interceptors.request.use(
+      (config) => {
+        // 例: tokenContext または useRefreshQuery の結果を参照して Authorization ヘッダを付与
+        const token = tokenContext ?? newAccessToken.data?.data ?? (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined);
+        if (token) {
+          config.headers = {
+            ...config.headers,
+            Authorization: `Bearer ${token}`,
+          };
+        }
+        return config;
+      },
+      (error: AxiosError) => Promise.reject(error)
+    );
@@
-      async (error: AxiosError) => {
-        const prevRequest = error.config;
-        // 403認証エラー(headerにaccess_tokenがない。もしくはaccess_tokenが無効)
-        if (error?.response?.status === 403) {
-          prevRequest!.headers["Authorization"] = await `******;
-          // 再度実行する
-          return basicAxios(prevRequest!);
-        }
-        return Promise.reject(error);
-      }
+      async (error: AxiosError) => {
+        const prevRequest = error.config;
+        if (error?.response?.status === 403 && prevRequest) {
+          // refresh を呼んでトークンを取得し、再試行
+          try {
+            const refreshed = await newAccessToken.refetch?.();
+            const newToken = refreshed?.data?.data ?? newAccessToken.data?.data;
+            if (newToken) {
+              prevRequest.headers = {
+                ...prevRequest.headers,
+                Authorization: `Bearer ${newToken}`,
+              };
+              return basicAxios(prevRequest);
+            }
+          } catch (e) {
+            // refresh 失敗 -> reject
+          }
+        }
+        return Promise.reject(error);
+      }
     );
```

- 注意: 上記は一案です。`useRefreshQuery` が返すデータ形状（`refetch` の戻りと `data` の structure）に合わせて調整してください。トークンは `Bearer <token>` 形式に揃えることを推奨します。

### B) TmelineData.ts（length 判定の修正）
```diff
*** 修正前: src/lib/TmelineData.ts
@@
-export const getItems = (eventContextQueries: TimelineEventPropsList) => {
-  const contextState = eventContextQueries.length > 1 ? eventContextQueries.map((eventContextData: TimelineEventProps) => {
-    eventContextData.group = eventContextData.staff_id;
-    return eventContextData
-  }) : exEvents;
-  return contextState;
-}
+export const getItems = (eventContextQueries: TimelineEventPropsList) => {
+  const contextState = eventContextQueries && eventContextQueries.length > 0
+    ? eventContextQueries.map((eventContextData: TimelineEventProps) => ({
+        ...eventContextData,
+        group: eventContextData.staff_id,
+      }))
+    : exEvents;
+  return contextState;
+}
```

### C) queries.ts（副作用のない日時変換）
```diff
*** 修正前: src/resources/queries.ts
@@
-    data: useMemo(() => data?.map(item => ({
-      ...item,
-      start: item.start = new Date(item.start ?? new Date()),
-      end: item.end = new Date(item.end ?? new Date()),
-    })), [data])
+    data: useMemo(() => Array.isArray(data) ? data.map(item => ({
+      ...item,
+      start: new Date(item.start ?? new Date()),
+      end: new Date(item.end ?? new Date()),
+    })) : [], [data])
```

---

## 最後に（結論）
- 本 PR は不要ファイル削除やドキュメント追加など有益な整理を含んでいますが、現在は "動作に致命的な影響を与える箇所"（特に Axios の interceptor 部分）を含んでいるため、マージ前に修正が必要です。
- 提案した差分は最小限の修正案です。実装方針（アクセストークンの取得方法、refresh API の返す形）に応じて細部は調整してください。

---

レビュー担当: 自動レビューエージェント
- 注意: このレビューはローカルでの静的コード読取に基づいています。PR の CI（lint/test/build）の出力を必ず確認してください。

Confidence: High for syntax/logic issues reported; Medium for runtime behavior (未実行のため)。


---

## 追記（2026-07-30）: 適用済みパッチの記録
- 小さな修正パッチを適用し、fix/pr-3-patches ブランチとして origin に push しました（コミット: d139742）。
- 適用した主なファイル:
  - src/components/templates/AxiosClientProvider.tsx (interceptor の構文エラー修正・トークン自動補完とリフレッシュ再試行)
  - src/lib/AuthInfo.ts (Content-Type の余分なクォート削除)
  - src/resources/queries.ts (日付変換の非破壊化・useRefreshQuery に enabled 追加)
  - src/lib/TmelineData.ts (getItems の判定修正と非破壊マッピング)
  - src/components/templates/EventsParent.tsx (data の安全な結合: data ?? [])
- ブランチの確認/チェックアウト:
  - git fetch origin && git checkout fix/pr-3-patches
- 参考リンク:
  - ブランチ作成通知: https://github.com/gensukeSpp/time-table-to-line/pull/new/fix/pr-3-patches
  - 本レビューに対するコメント（PR #3）を投稿済み: https://github.com/gensukeSpp/time-table-to-line/pull/3#issuecomment-5128548243

（注）この追記は適用済みパッチの記録です。CI やローカルで lint/test/build を実行して問題が解消していることを確認してください。
