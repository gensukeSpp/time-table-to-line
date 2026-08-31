# PR #19 レビュー

## 確認した参照資料
- Issue #18: 「[Feature]マイルストーン内容の更新と削除」
- `requirement-03.md`
- `tasks/issue-18/README.md`
- `tasks/issue-18/architecture.md`
- `tasks/issue-18/overview.md`
- `tasks/issue-18/tasks.md`
- `tasks/issue-18/test-plan.md`
- PR #19 本文とローカル差分 (`git diff main...HEAD` 相当)

## 総評
PR #19 は、Issue #18 の主要要件をかなり満たしている。`status` を `open | waiting | closed` へ整理し、一覧の `closed` フィルタ、タイトルクリックによる詳細モーダル、`waiting` 表示、更新 API 連携、`waiting -> closed` 時の一覧非表示テストまでは対応されている。

ただし、Issue の前提である「管理者のみ更新可能」や「waiting の遷移が状態管理として担保される」点が弱く、現状は一般ユーザーが更新画面に到達できる可能性や、状態遷移が UI 依存になっているため、マージ前に整理した方が安全である。

## 良い点
- `src/lib/TimelineType.ts` に `MilestoneStatus` を導入し、Boolean 依存を排除した点は妥当。
- `MilestoneList.tsx` の `status !== 'closed'` フィルタと、`MilestoneListTitle.tsx` の `MM/dd close` 表示は、Issue のUX要件に沿っている。
- `MilestoneDetailDialog.tsx` は読取専用の「作成者名」「グループ名」と編集可能な「タイトル」「説明」「ガイドライン終了日」「達成日」を分離しており、仕様に沿っている。
- `useUpdateMilestoneMutation` が分離されており、API 契約が比較的わかりやすい。
- `waiting` 状態の表示テストと一覧非表示テストが追加されており、回帰チェックの土台はできている。

## 指摘事項

### [重要度: High] 管理者権限の判定が UI 側で未実装
- **箇所**: `src/components/organisms/MilestoneList.tsx`, `src/components/organisms/MilestoneListTitle.tsx`, `src/components/organisms/MilestoneDetailDialog.tsx`
- **問題**: Issue #18 では「マイルストーンの更新」は管理者前提であり、タイトルクリックで詳細モーダルを開く動作にも権限チェックが必要である。だが現状の実装では `admin` を使っていないため、一般ユーザーでもモーダルを開き、更新 mutation を呼べる可能性がある。
- **影響**: 権限逸脱、意図しない編集、アクセス制御の破壊につながる。Issue の「管理者のみ操作」の前提とズレるため、セキュリティ上の懸念がある。
- **望ましい対応**: `MilestoneList` / `MilestoneListTitle` に `admin` を持たせ、`admin !== true` のときはタイトルを非活性または `onClick` を無効化する。`MilestoneDetailDialog` 側でも更新ボタンやフォーム送信を `admin` 依存にする。

### [重要度: Medium] waiting → closed の遷移が UI 依存で、実状態遷移を保証していない
- **箇所**: `src/components/organisms/MilestoneList.tsx`, `src/lib/milestone.ts`, `src/hooks/useMilestoneMutation.ts`
- **問題**: 一覧表示は `m.status !== 'closed'` でフィルタしているが、`accomplished_date` から `MM/dd close` を算出するロジックは見た目計算に留まっている。実際に `status` を `closed` に切り替えるロジックや再取得フローが UI に実装されていない。
- **影響**: issue の期待どおり「accomplished_date を入れると waiting、数日後 closed になり一覧から消える」が、サーバー側が更新しない限り再現しない。waiting の行が UI に残り続ける可能性がある。
- **望ましい対応**: `effectiveStatus` の算出ロジックを UI とバックエンド契約の両面で明確にし、`closed` 判定が発生した時点で再取得またはキャッシュ invalidation を走らせる。`useUpdateMilestoneMutation` の成功後に `queryClient.invalidateQueries` を確実に実行するテストも追加したい。

### [重要度: Medium] 仕様文書と実装の型名・命名が混在している
- **箇所**: `requirement-03.md`, `src/lib/TimelineType.ts`, `src/components/organisms/MilestoneDetailDialog.tsx`
- **問題**: 一部の要件書では `guidline_end_date` が残っている一方、実装側は `guideline_end_date` に統一されている。Issue #18 の実装要件でも `guideline_end_date` を正規名称とする方針が示されているが、古い命名が残っている状態である。
- **影響**: API の補完、mock の作成、データ変換のレビュー時に誤りが混ざりやすくなり、別PRで古いキー名が再導入されるリスクがある。
- **望ましい対応**: 仕様書と型定義を `guideline_end_date` に固定し、旧名称の参照を削除する。必要なら migration の記録を残す。

## 改善提案
1. `MilestoneListTitle`・`MilestoneDetailDialog` に `admin` ガードを追加し、非管理者は更新モーダルを展開できないようにする。
2. waiting の表示ラベルと status 変更を分離し、`closed` 判定の実体を「query invalidation + refetch」パターンへ寄せる。
3. `guideline_end_date` を正規契約として統一し、古い `guidline_end_date` をコードとドキュメントから排除する。
4. waiting → closed のケースを、単なる visible text テストではなく、mutation 成功後のクエリ再取得シナリオで検証する。

## 結論
PR #19 は issue #18 の主たる実装をほぼ満たしており、レビュー対象としては「方向性は良いが、権限制御と状態遷移の整合性を直してからマージしたい」という評価である。特に管理者制限の欠落は早急に修正すべきであり、waiting → closed の契約も UI 表示だけでなく API/再取得の観点で揃えると、より安定した実装になる。
