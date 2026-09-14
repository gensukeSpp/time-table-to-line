# PR #26 レビュー

## 参照資料

- PR: `gh pr view 26`（目的、変更ファイル、コミット、テスト方法）
- 比較対象: `origin/main...611d391c25fc573afed5281f9be0640cd0c477cc`
- 対応タスク: `tasks/task-11/{overview.md,architecture.md,tasks.md,test-plan.md}`、`tasks/task-12/{README.md,overview.md,architecture.md,tasks.md,test-plan.md}`
- 関連仕様・設計: `specs/2026-09-08-spec.md`、`docs/architecture/2026-09-08-architecture.md`
- 補足: PR本文に GitHub Issue 番号はなく、コミット中の `#260908` / `#260911` は GitHub Issue として解決できなかった（`gh issue view` は not found）。したがって Issue の受入条件との対応は確認不能。タスク文書と差分の対応を基準にレビューした。
- 存在しない／未確認の資料: PR本文が参照するバックエンド `light_token_server/tasks/task-11/` はこのフロントリポジトリ内に存在せず、サーバー側の実際の猶予日数・スケジューラ設定は確認できなかった。

## 総評

PRの主目的である「マイルストーン一覧の定期再取得」と「タイムライン上の所属イベント色の復元」に対応する実装は、対象ファイルを限定して行われています。`useMilestonesQuery` のポーリング追加、`itemRenderer` の選択状態に応じた `!important` の明示適用、関連ドキュメントの追加は目的に沿っています。

ただし、今回の差分にはタスク11/12の主目的と直接関係しない `MILESTONE_CLOSE_GRACE_DAYS` の 2 日から 5 日への変更が含まれ、既存テストを壊しています。実行結果は `bun run testrun` が **1ファイル失敗、2テスト失敗、71 passed / 1 skipped** であり、PR本文の「テスト Pass」と一致しません。現状のままではマージ不可です。

## 良い点

- `src/resources/queries.ts:119-126` で既存の query key/query function や全体の QueryClient 設定を変更せず、マイルストーン一覧だけに `refetchInterval` を追加している。
- `src/resources/queries.spec.tsx:78-111` に fake timer を使った定期再取得テストを追加し、初回取得・間隔途中・間隔経過を確認している。
- `src/components/pages/TimelinePage.tsx:170-180` でマイルストーン所属イベントに対して `background-color` を `!important` 付きで設定し、選択中は `#ffc107`、非選択時はマイルストーン色を適用する方針は、タスク12の再現事象に対応している。
- ライブラリの `ref` を関数／オブジェクト両方に対応させてから独自処理を行っており、既存の ref を単純に捨てていない。
- `bun run lint` と `bun run build` は成功した。

## 指摘事項

### [P1] 既存テストを壊す猶予日数の変更を差分から除去するか、仕様・テストを同時に更新する

- **場所:** `src/lib/milestone.ts:3-5`、`src/lib/milestone.spec.ts:13,31`
- `MILESTONE_CLOSE_GRACE_DAYS` を 2 から 5 に変更していますが、同じPRのテスト期待値は `2026-08-22`（2日後）のままです。その結果、`bun run testrun` が実際に失敗しました（`2026-08-25` を返すため2テスト失敗）。
- PRの目的はフロントのポーリングとタイムライン色修正であり、タスク11/12の計画にも猶予日数を5日に変更する記載はありません。一方、差分内の `tasks/task-11/test-plan.md` は `MILESTONE_CLOSE_GRACE_DAYS=0` を前提にしており、サーバー設定との関係もこのPRだけでは確認できません。
- **影響:** CI が失敗し、既存の closed 日付表示ロジックの仕様も意図せず変更されます。
- **対応:** このPRのスコープ外であれば `src/lib/milestone.ts` の変更を取り除いて2日のままにしてください。5日が正式仕様なら、対応する仕様・タスク・バックエンド設定・`src/lib/milestone.spec.ts` の期待値を同一変更として更新し、なぜPR #26で変更するのかをPR本文に明記してください。

### [P1] `bun run testrun` が失敗している状態で「テスト Pass」としている

- **場所:** PR本文のテスト方法、`src/resources/queries.spec.tsx:87-109`
- 実行結果では `src/resources/queries.spec.tsx` の新規テスト自体は通りましたが、全体テストは上記の milestone テスト失敗で終了コード1です。また新規テストでは React の `act(...)` 警告も出ています。
- **影響:** PR本文の検証結果と実際のリポジトリ状態が不一致で、CI・レビュー判断を誤らせます。`act` 警告は定期 refetch による更新をユーザーが見る状態遷移として十分に検証できていない可能性があります。
- **対応:** まずP1の仕様不整合を解消したうえで `bun run testrun` を再実行し、実結果をPR本文へ更新してください。ポーリングの時間経過テストは `act`（または Testing Library の `act` を内包する適切な待機）でタイマー進行と状態更新を包んで警告を解消してください。

### [P2] 環境変数の不正値を検証せず `refetchInterval` に渡している

- **場所:** `src/lib/env.ts:1-3`
- `Number(import.meta.env.VITE_MILESTONE_REFRESH_INTERVAL_MS ?? 60 * 60 * 1000)` は、空文字なら `0`、非数値文字列なら `NaN`、負数なら負値になります。`.env` の入力ミスで、過剰な再取得・無効なタイマー設定・TanStack Query の実行時エラーまたは意図しない挙動につながり得ます。
- タスク11は `.env` で運用値を調整可能にする設計なので、実運用入力の検証が必要です。
- **対応:** `Number.isFinite`、正数チェック、必要なら最小間隔チェックを行い、不正値は既定の `3_600_000` にフォールバックしてください。空文字を未設定扱いにするかも明示し、正常値／不正値のテストを追加してください。

### [P2] `.env.example` を追加する計画に対して実ファイルが追加されていない

- **場所:** `tasks/task-11/tasks.md` の Task 1、`tasks/task-11/architecture.md` のファイル構成、差分全体
- 計画では `.env` / `.env.example` に `VITE_MILESTONE_REFRESH_INTERVAL_MS=3600000` を追加することになっていますが、PR差分は `src/lib/env.ts` のみで、リポジトリ内にも `.env.example` は確認できませんでした。`.env` は `.gitignore` 対象です。
- **影響:** 開発者が利用可能な設定名・単位（ms）を知る手掛かりがなく、バックエンドとの間隔調整を行いにくくなります。実装と計画の対応も不完全です。
- **対応:** 設定を利用者が変更できる契約であれば `.env.example` を追加して変数名と既定値を記載してください。意図的に追加しないなら、タスク文書の成果物・ファイル構成を実装に合わせて更新してください。

## 改善提案

1. まず `src/lib/milestone.ts` の5日変更をこのPRから分離するか、仕様とテストを整合させる。
2. `src/lib/env.ts` に安全なパース処理を追加し、未設定・空文字・非数値・0・負数・正常値のテストを加える。
3. `queries.spec.tsx` のタイマー進行を `act` で包み、実際の再レンダーまで検証できるテストにする。加えて、複数コンポーネント（`TimelinePage` と `MilestoneList` 等）が同一 query を購読した場合に、ポーリングが重複リクエストにならないことを確認すると、周辺ロジックへの影響をより確実に担保できる。
4. 変更目的ごとにコミット／PRを分ける（Task-11のポーリング、Task-12の色修正、猶予日数変更）。今回のような無関係な仕様変更の混入と、既存テスト未更新を防げます。
5. バックエンド側の `MILESTONE_CLOSE_INTERVAL_MINUTES` とクライアント側の既定60分が本当に合意済みか、バックエンドリポジトリの設定・テストを参照できるリンクとともにPR本文へ記載してください。

## 検証結果

- `bun run testrun`: **失敗**（1ファイル失敗、2テスト失敗、71 passed / 1 skipped）
- `bun run lint`: **成功**
- `bun run build`: **成功**
- GitHub Actions checks: `gh pr checks 26` では報告なし

## 判定

**Changes requested（P1の修正後に再レビュー）**
