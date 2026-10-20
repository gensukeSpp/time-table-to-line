# PR #43 レビュー

- PR: https://github.com/gensukeSpp/time-table-to-line/pull/43
- タイトル: feat #261020: Issue #41 'closed' マイルストーンからのイベント抽出
- 状態: DRAFT / author: gensukeSpp
- head: feature/milestone-events/41 @ c9a57a9 （ローカル HEAD e24679c とは別物。レビューは PR head を基準に実施）
- 比較対象: origin/main（ローカルに main 無し）
- 規模: 28 files（ソース 23 / docs・tasks 等 5）, +2265 / -26
- 実施: gh pr view / gh issue view 41 / git show（PR head） / review(action=context)
- 未実施: テスト・lint・build の再実行（PR 本文の結果は未検証）

## 参照資料

確認できたもの:
- Issue #41（OPEN）: 目的・ユーザーストーリー・受け入れ要件
- tasks/issue-41/ : README.md, overview.md, architecture.md, tasks.md, test-plan.md（PR head に含む）
- specs/2026-10-19-spec.md（PR head に含む。決定 D1〜D7 を記録）
- バックエンド: ../light_token_server の app/routers/timetable.py（GET /milestone/closed, 331 行付近）、tests/test_milestone.py（closed 系 4 件）。ローカルの light_token_server は c4f43f5（PR #18 マージ済み）

存在しない／確認不可:
- docs/architecture/2026-10-19 系: 本 PR に無し。架空の欠落ではなく、AGENTS.md の運用どおり実装後に別 docs PR で作成されるため、欠陥扱いしない。

注意: 本 PR のフロントは light_token_server の PR #18（closed 一覧 API）に依存する。デプロイ順序の確認が必要。

## 総評

閉じたマイルストーンを管理者向けに右 Drawer で一覧し、達成日降順・完了イベントのみ・3 段の開閉で確認できる機能。仕様（spec D1〜D7）と Issue の受け入れ要件はおおむね一致している。権限は UI（admin ゲート）とバックエンド（403）の二重防御。新規 API の並び順（達成日 NULL 末尾）、完了判定の既存ヘルパ再利用、clamp スタイルの共有化も方針どおり。大きな欠陥は見当たらない。指摘は主にキャッシュ無効化の抜けと、共有スタイル変更の副作用確認。

## 良い点

- 権限: MilestoneClosedButton は admin のみ描画、backend の /milestone/closed と /milestone/closed/{id}/events は claims admin を検証（403）。
- 並び順: `order_by(accomplished_date.is_(None), accomplished_date.desc())` で達成日 NULL（削除由来）を末尾に固定。
- 取得の遅延: useClosedMilestonesQuery は Drawer マウント時のみ、useClosedMilestoneEventsQuery は行を開いた時のみ（enabled ゲート）。N+1 的な全件取得を避けている。
- 完了判定: filterCompletedEvents が既存の normalizeProgressGroup を再利用し、英字トークン complete も拾う。
- queryKey 設計: closed() が closedEvents(id) のプレフィックスになっており、closed 一覧の invalidate で closed イベントも連動。
- 共有スタイル: clampText.css.ts に抽出し Issue #40 と共有（コピペ回避）。
- テスト: queries.spec.tsx / milestone.spec.ts / milestoneEvents.spec.ts / ClosedMilestoneDrawer.test.tsx / MilestoneClosedButton.test.tsx を追加。Collapse の DOM 残存を踏まえ aria 属性ベースで検証している点は妥当。
- 仕様書・計画書（tasks/issue-41, specs/2026-10-19）と実装の対応が詳細で、バックエンド/フロントの依存関係も明記されている。

## 指摘事項

優先度は 高 / 中 / 低 / 情報。タスク番号は後で付与できるよう連番にしている。

[#1 中] キャッシュ無効化の抜け: closed イベントが古いまま残る可能性
- 場所: src/hooks/useEventMutation.ts（useCreateMutation / useDeleteMutation / 他 2 件, 各 onSuccess / onSettled）
- 内容: イベント作成・更新・削除時に invalidate されるのは eventKeys と milestoneKeys.all() のみ。milestoneKeys.closed() / closedEvents(id) は対象外。
- 影響: closed マイルストーン配下のイベントを編集（progress を「完了」に変更、タイトル変更、end 変更）しても、Drawer 再オープン時に staleTime（既定 0 もしくは設定値）の範囲で古い値が見える可能性。closed 一覧側の invalidateMilestoneList は closed() を含むので、マイルストーン操作では問題なし。
- 改善案: useEventMutation の各 onSuccess/onSettled で `queryClient.invalidateQueries({ queryKey: milestoneKeys.closed() })` を併せて呼ぶ（closedEvents は prefix で連動）。もしくは「イベント編集は closed 配下にも影響する」ことを spec に明記して許容する。

[#2 低〜中] 共有 clamp スタイルの副作用（Issue #40 側への影響）
- 場所: src/components/molecules/clampText.css.ts:12-13（flex: 1 / minWidth: 0 を追加）
- 内容: 旧 MilestoneEventsDrawer.css.ts の clampLine には無かった `flex: 1; minWidth: 0` が共有スタイルに入った。Issue #40 の MilestoneEventsDrawer では UnstyledButton が block の eventRow 直下にあり、flex は効かないが、今後の DOM 変更で挙動が変わる。
- 影響: 機能不全は想定しにくいが、Issue #40 の見た目（1 行三点リーダー）は実ブラウザ確認が必要。spec では「クラス名を変えず import 先のみ変更」の方針だったため、スタイル内容の変更は方針と微妙に異なる。
- 改善案: Issue #40 用と Issue #41 用の追加プロパティを分ける、または変更理由をコメントに残し、#40 の表示を確認したことを PR に記録する。

[#3 低] 達成日の日付解釈（タイムゾーン）
- 場所: src/lib/milestone.ts:19-21 formatAccomplishedDate
- 内容: `new Date('2026-08-20')` は UTC 0 時として解釈され、ローカル表示では UTC より西のタイムゾーンで前日になる。既存の getMilestoneClosedAt も同じ方式で、本 PR 固有の不具合ではない。
- 影響: JST 運用では問題なし。
- 改善案: 日付のみの文字列は `parseISO` などでローカル日付として扱うか、既存と合わせて現状維持を明記する。

[#4 低] アクセシビリティ: 開閉の関連付けが不完全
- 場所: src/components/organisms/ClosedMilestoneDrawer.tsx:55-61（段 3 のタイトル）, :108-113（段 1）
- 内容: UnstyledButton に aria-controls が無い。また段 3 はチェブロン ActionIcon（aria-label あり）とタイトルの 2 つが同じ開閉を行い、どちらも同じ状態を見る。
- 改善案: 開閉対象の id を付けて aria-controls を指定する。タイトル側のボタンに役割の説明（aria-label か title）を付けるか、どちらか一方に統一する。

[#5 低] テスト・ドキュメントの軽微な不整合
- 場所: tasks/issue-41/overview.md の完了条件、specs/2026-10-19-spec.md の品質ゲート
- 内容: 「bun run testrun 159 passed」「pytest 78 passed」などの数値は PR 本文と spec に記載されているが、今回のレビューでは再実行していない（未検証）。
- 改善案: マージ前に CI またはローカルで再確認する。

[情報] 本レビューの graph 結果の扱い
- review(action=context) は作業ツリーとローカル HEAD（e24679c, origin/main から 12 コミット先行）を基準に生成された。そのため変更ファイル一覧に AGENTS.md / .gemini/skills / docs/architecture/README.md 等の PR 外ファイルが含まれ、「9 関数が未テスト」（formatAccomplishedDate 等）という結果も PR head の実装（src/tests/milestone.spec.ts, milestoneEvents.spec.ts に該当テストあり）と食い違う。
- 結論: graph の「未テスト」判定は PR head に対しては不正確。影響範囲（88 nodes / 79 files）も PR 外の変更を含むため、本 PR の実際の影響範囲は数値ほど大きくない。最終判断は PR head のソースと git diff に基づく。

[情報] PR の状態
- DRAFT。依存する light_token_server PR #18 のマージ状況は未確認。
- PR に含まれる specs/ と tasks/ は本レビューの「欠陥」扱いの対象外（AGENTS.md の方針どおり）。ただし spec の決定 D7 と実装（closed の invalidate 範囲）には前述 #1 の差がある。

## 改善提案（優先順）

1. [#1] useEventMutation の全 mutation に closed() の invalidate を追加。併せてテストを 1 件追加（closed 配下イベントの更新で closed キーが無効化されること）。
2. [#2] clampText.css.ts の変更内容を #40 側の確認項目として PR 本文に追記。可能なら #40 の見た目を実ブラウザで再確認。
3. [#4] aria-controls の付与と、段 3 のボタン構成の整理。
4. [#3] 日付解釈は既存と統一するか、ローカル日付として扱うかを決め、spec に 1 行で記録する。
5. [#5] PR マージ前に bun run testrun / lint / build と light_token_server の pytest を再実行し、結果を記録する。
6. PR #18（light_token_server）のマージ順を PR 本文に明記する。

## 指摘の一覧（タスク割当用）

| # | 優先度 | 対象 | 種別 |
|---|---|---|---|
| 1 | 中 | src/hooks/useEventMutation.ts | キャッシュ無効化の抜け |
| 2 | 低〜中 | src/components/molecules/clampText.css.ts | 共有スタイルの副作用（#40 影響） |
| 3 | 低 | src/lib/milestone.ts | 日付のタイムゾーン解釈 |
| 4 | 低 | ClosedMilestoneDrawer.tsx | アクセシビリティ（aria-controls・二重トグル） |
| 5 | 低 | tasks/specs | 品質ゲート数値の未検証 |

## 7. 追補: docs/architecture/2026-10-20-architecture.md（未追跡ファイル）の確認

ステータス: 未コミットの untracked ファイル。PR #43 には含まれない。AGENTS.md の方針どおり実装後の docs 作業として扱い、欠落そのものは指摘しない。内容の誤りと実装とのドリフトのみ確認。

誤り・ドリフト:
- 段 3 の説明（Overview）が不正確。段 3 は chevron の開閉ボタン（ActionIcon）とタイトルで開閉し、Mantine Collapse の中に staff_id / グループ名 / 終了日時を表示する。この点が未記載。
- Testing の記述に MilestoneClosedButton.test.tsx の検証内容（admin のみ表示・クリックで Drawer が開く）が無く、テスト範囲が読み取れない。

不足:
- 権限モデル: GET /milestone/closed と GET /milestone/closed/{id}/events は admin 限定（403）、UI も admin ゲート。spec D6 の二重防御を記載すべき。
- バックエンド変更: light_token_server の app/routers/timetable.py に GET /milestone/closed を追加。並び順は accomplished_date IS NULL → accomplished_date DESC（削除由来の closed は末尾）。
- キャッシュ無効化: invalidateMilestoneList が closed() も無効化すること、closed() が closedEvents(id) のプレフィックスであることは設計要点。ただし useEventMutation.ts は closed を無効化していないため（指摘 #1）、その抜けを併記すべき。
- 遅延取得: useClosedMilestonesQuery は Drawer マウント時、useClosedMilestoneEventsQuery は行を開いた時のみ（enabled ゲート）。
- 完了イベントの絞り込みはフロント（filterCompletedEvents）で行う。バックエンドは全イベントを返す。
- Changed Files の不足（PR head で変更されているが未記載）:
  - src/components/organisms/MilestoneAddButton.css.ts（余白 0 に変更）
  - src/components/organisms/MilestoneEventsDrawer.tsx / .css.ts（clamp 抽出に伴う import 変更）
  - src/components/pages/TimelinePage.css.ts（adminBar 追加）
  - src/resources/cache.ts（closed / closedEvents キー、invalidate 拡張）
  - src/resources/fetch.ts（fetchClosedMilestones / fetchClosedMilestoneEvents）
  - src/resources/queries.spec.tsx、src/tests/milestone.spec.ts、src/tests/milestoneEvents.spec.ts
  - なお src/resources/queries.ts は「Added」ではなく既存ファイルへの追記（M）。
- adminBar と MilestoneAddButton.css.ts の余白調整（marginBottom 1rem → 0）の関係が未記載。
- 関連資料が未記載: specs/2026-10-19-spec.md、tasks/issue-41/、Issue #41、PR #42（Issue #40 の Drawer）、light_token_server PR #18。
- clamp 共有の影響（#40 の見た目が変わり得る点, 指摘 #2）が未記載。
- 既知の課題が未記載: mutation の closed 無効化漏れ（指摘 #1）、aria-controls 未付与（指摘 #4）、formatAccomplishedDate の日付解釈（指摘 #3）。
- 達成日の表記（yyyy/MM/dd、null は「達成日なし」）が Purpose / Overview で統一されていない。

修正方向: 前回スナップショット（2026-10-16）と同じ章立て（Purpose / Overview / 権限 / 変更ファイル / 既知の課題 / 関連資料）に揃え、上記を反映する。

結論: 文書の主要な機能説明（Drawer の 3 段構成、遅延取得、clamp 共有）は実装と概ね合うが、権限・キャッシュ無効化・変更ファイルの記述が不完全で、段 3 の説明にも不正確さがある。既知の課題も併記が必要。文書の修正は未実施（ユーザー承認待ち）。
