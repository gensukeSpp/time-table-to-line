# PR #22 レビュー

## 参照資料

- `.github/agents/pr-review.md`
- PR #22 の本文、変更ファイル、コミット履歴（`gh pr view 22`）
- Issue #20（PR本文に明示的なIssueリンクはないが、タスク資料と実装コメントから関連要求として特定）
- `specs/2026-09-03-spec.md`
- `docs/architecture/2026-09-03-architecture.md`

PR本文上の明示的なIssueリンク、および上記より新しいspec／architecture文書は確認できなかった。

Issue #20 は管理者によるメンバーイベントの閲覧を要求している。一方、最新specとtask docsでは「本人のイベントも閲覧専用で表示」「外側クリック／Escapeで閉じる」まで拡張されており、実装は主に最新spec側の内容に沿っている。

## 総評

管理者がグループタイムライン上のイベント詳細を閲覧できるようにする目的、`admin` の認証情報伝播、閲覧専用UIの追加は概ね整合している。

ただし、現状のままでは、オーバーレイの配置不整合、本番用API URLの変更、lintエラーがあるため、マージは推奨できない。

## 良い点

- `authPayload.ts` → `useAuthGuard.ts` → `AuthInfoProp` へ `admin` を一貫して伝播している。
- `readOnly` をoptionalにしており、Calendar側の既存呼び出しとの互換性を維持している。
- 管理者または本人のイベントだけを開く制御が `TimelinePage.tsx` に集約されている。
- 外側クリック、Escape、閉じるボタンによる閉じ操作を実装している。
- `bun run build` は成功している。
- `bun run testrun` は 36 passed / 1 skipped で完了している。

## 指摘事項

### [高] オーバーレイの位置計算とDOM配置が不整合

**対象:** `src/components/pages/TimelinePage.tsx:17-30, 144-187`、`src/components/organisms/EventDetailOverlay.css.ts:4`

`computeOverlayPos()` は `containerRef` を基準にした相対座標を返している。一方、`EventDetailOverlay` はそのコンテナの外側に兄弟要素として描画されている。

`EventDetailOverlay` は `position: absolute` だが、`position: relative` が設定されたタイムラインコンテナの子要素ではない。そのため、`top`／`left` がコンテナ基準ではなく別の包含ブロック基準で解釈される可能性がある。

**影響:**

- イベント付近ではなく、ページ上部や別位置に表示される。
- タブ内やスクロール時に位置がずれる。
- 「タイムラインに重ねて表示」という主要要件を満たせない。

**対応案:** オーバーレイを `position: relative` のコンテナ内部に移動する。または、portalで描画する場合は `getBoundingClientRect()` のviewport座標を使い、`position: fixed` で配置する。

### [高] 本番用APIエンドポイントがローカルURLに変更されている

**対象:** `src/lib/AuthInfo.ts:6`

```ts
const BASE_URL = import.meta.env.VITE_TOKEN_SERVER_LOCAL;
```

`release` 側では `VITE_SERVER_ON_RENDER` を使用していたが、PRでローカル用の `VITE_TOKEN_SERVER_LOCAL` に変更されている。リポジトリの `.env` ではこの値が `http://127.0.0.1:8000` になっている。

**影響:**

- 本番ビルドのAPIリクエストが `127.0.0.1:8000` に送信される。
- 本番環境に変数が設定されていなければ、APIのベースURLが未定義または相対URLになる。
- 認証、イベント取得、メンバー取得が本番で動作しない。

PR本文にも本番環境変数設定が未完了と記載されているが、`release` ベースのPRにこの変更を含めると、現状の設定では本番動作を壊す。

**対応案:** `import.meta.env.DEV` 等で開発／本番のURLを切り替える。または本番用変数を使用する実装に戻し、デプロイ環境の変数設定を完了してからマージする。

### [高] `bun run lint` が失敗している

**対象:** `vite.config.ts:6,10-12`

`cloudflare` をimportしたまま、プラグイン登録だけがコメントアウトされている。

```ts
import { cloudflare } from '@cloudflare/vite-plugin';

// plugins: [vanillaExtractPlugin(), react(), cloudflare()],
plugins: [vanillaExtractPlugin(), react()],
```

`vite.config.ts` で `cloudflare` が未使用となり、lintが失敗する。task-11の完了条件ではlint成功が要求されているため、CIでlintを実行している場合は品質ゲートを通過できない。

**対応案:** ローカル専用設定なら `cloudflare` のimportも削除する。本番用設定を維持するなら、環境に応じたplugin切り替えを実装するか、開発用・本番用のVite設定を分離する。

### [中] `AddChildForm` が閲覧専用でない場合にもメンバー一覧クエリを実行する

**対象:** `src/components/organisms/InputItem.tsx:52-55`

`readOnly` の値に関係なく、常に `useGroupUsersQuery()` を呼び出している。Calendar側の従来の編集フォームでも、メンバー名表示に不要な `/group/users` リクエストが発生する。

実際に `bun run testrun` では、バックエンド未起動時に `127.0.0.1:8000` への接続エラーがstderrへ出力された。

**影響:** 不要なネットワーク負荷が発生し、バックエンド未接続時のエラー出力も増える。

**対応案:** 閲覧専用部分を別コンポーネントへ分離し、readOnly時だけメンバー一覧クエリを利用する。または `useGroupUsersQuery` に `enabled` オプションを追加し、必要な場合のみ有効化する。

## 改善提案

- `TimelinePage` の権限制御を、管理者・本人・他メンバーそれぞれで検証するテストを追加する。
- `computeOverlayPos` の位置計算を、コンテナ内配置またはviewport固定配置のどちらかに統一する。
- `normalizeAuthPayload` について、`admin: false`、`admin: true`、文字列値などのテストを追加する。
- 本番API URLとCloudflare pluginの扱いを、PR本文の「未完了事項」ではなく、マージ前に明確な設定として整理する。
