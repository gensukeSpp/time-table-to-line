# PR #42 レビュー記録

- 対象: PR #42 `feat #260928: Issue #40 'open'/'waiting' マイルストーンのイベント参照`
- ブランチ: `feature/events-from-milestone/39-` → `main`（PR head: 33a6476）
- 比較対象: `origin/main`（ローカルに `main` が存在しないため。`origin/main` = 9b6d1b5）
- 差分規模: gh 集計 22 ファイル / +1544 -11（`git diff origin/main...FETCH_HEAD` と一致）
- 対応 Issue: #40（`gh issue view 40` で本文・受け入れ条件を確認）
- コード変更はしていない。本ファイルのみ作成。

## 0. 参照資料の確認状況

確認できたもの
- PR 本文 / commit 履歴（gh pr view 42）
- Issue #40 本文（gh issue view 40）
- tasks/issue-40/ : README.md, overview.md, architecture.md, tasks.md, test-plan.md
- specs/2026-10-15-spec.md（フロント仕様）、specs/README.md
- backend: light_token_server/specs/2026-10-15-milestone-events-group-name-auth-spec.md（現行契約の正本。2026-10-13 版は冒頭でこの文書を正本として参照）
- backend 実装: light_token_server の app/routers/timetable.py、tests/test_milestone.py（ローカル main 上の ab5127f 系列）

存在しなかった / 対象外のもの
- docs/architecture/ の Issue #40 対応版: 存在しない。AGENTS.md 方針どおり実装後に別 docs PR で書く想定のため欠落は指摘対象外。tasks/issue-40/architecture.md が設計の代替として存在。
- backend 側 PR（gensukeSpp/light_token_server）: 本 PR のリポジトリ外。差分は未確認で、ローカル light_token_server の該当コミットとテスト結果で代替確認。

不整合の有無
- spec / tasks / PR 本文 / Issue の記述は、機能・API 契約・権限方針（D1: group_name をバックエンド委譲、D2: open/waiting は require_token のみ）で一致。
- 軽微: PR 本文の pytest 72 件は suite 全体の数。test_milestone.py 単体は本調査で 46 passed。矛盾ではない。

## 1. 総評

Issue #40 の要求（'...' ボタン → 右 Drawer → progress 別アコーディオン → タイトル → スタッフID / グループ名 / 開始日時、1 行三点リーダー ↔ 2 行展開、null は「指定なし」）はほぼ過不足なく実装されている。フロントは純粋ヘルパ・Query hook・Drawer・配線が責務分離され、既存パターン（milestoneKeys, enabled ゲート）に沿っている。

主要リスクは「admin gate 撤去に伴い、非 admin に全グループのイベント情報が返る」点。仕様上は許容済みだが、レスポンスが to_dict() 全体（summary を含む）をそのまま返すため、表示していない項目まで露出する。

## 2. 良い点

- Issue の受け入れ条件（表示順、null→指定なし、2 段階クランプ、group_name 委譲）を実装・テストの両方でカバー。
- `useMilestoneEventsQuery` は `enabled` で Drawer 表示時のみ fetch（不要な負荷を避ける）。
- backend `_get_milestone_events` で Team を一括取得し N+1 を回避。closed 系は admin のまま据え置き。
- 仕様・タスク・テスト計画の間で契約（キー名、権限、表示順）が一致。
- 検証: `bun run lint` エラーなし、`bun run testrun` 21 files / 146 passed / 1 skipped（再現確認済み）。backend test_milestone.py 46 passed（再現確認済み）。

## 3. 指摘事項（優先度順）

### [中-1] 非 admin に他グループのイベント summary まで露出
- 場所: backend light_token_server app/routers/timetable.py:297-329（`_get_milestone_events` → `ev.to_dict()`）
- 事象: `/milestone/{id}/events` は `require_token` のみになり、一般ユーザーが全グループ分の `to_dict()` を取得できる。仕様例（specs/2026-10-15-spec.md §2-1）には `summary` も含まれる。フロントは title / staff_id / group_name / start しか表示しないため、表示されない summary や group 情報まで API から取得可能になる。
- 影響: 権限緩和の範囲が仕様（「タイトル閲覧」）より広い。
- 修正方向: open/waiting 用は表示に必要なキーだけを返す（id, staff_id, group, group_name, start, end, title, progress, milestone_id, completed）。summary を返す必要があるなら仕様に明記する。テストは response keys テスト（test_milestone_events_response_keys_and_format）を実態に合わせて更新。

### [低-2] 未知の progress 値で Object.prototype のキーが誤判定され、イベントが非表示になる
- 場所: src/lib/milestoneEvents.ts:4-14（`TOKEN_TO_GROUP[progress] ?? '指定なし'`）
- 事象: `progress` が `constructor` / `toString` などの場合、プロトタイプのメソッド（関数）が返り、`PROGRESS_GROUP_ORDER` のどのキーにも一致せず、`groupMilestoneEventsByProgress` でイベントが黙って消える。再現: node で同ロジックを実行し、progress='toString' / 'constructor' のイベントが結果から欠落、null のみ「指定なし」に残ることを確認。
- 仕様違反: 「未知値は指定なし」（spec §2-5）。
- 同種の箇所: src/lib/progressColor.ts の `PROGRESS_TOKEN_TO_LABEL[progress]` / `PROGRESS_COLORS[key]` も同パターン（色は偶然デフォルトに落ちるが同じ構造）。
- 修正方向: `Object.hasOwn(TOKEN_TO_GROUP, progress) ? TOKEN_TO_GROUP[progress] : '指定なし'`、もしくは Map を使う。テストに 'constructor' ケースを追加（tests: src/tests/milestoneEvents.spec.ts）。

### [低-3] イベント title の展開がキーボード操作不可
- 場所: src/components/organisms/MilestoneEventsDrawer.tsx:17-22（`Text onClick` で展開）
- 事象: クリックのみで開閉でき、フォーカス・Enter/Space で操作できない。Accordion 自体はキーボード対応のため一貫性を欠く。
- 修正方向: `UnstyledButton` 化、または `role="button"` / `tabIndex={0}` / onKeyDown を付与。

### [低-4] イベント変更時に milestone events キャッシュが無効化されない
- 場所: src/resources/cache.ts（`milestoneKeys.events` は invalidate されない）、src/hooks/useEventMutation.ts
- 事象: イベントの milestone 所属変更後、一覧キャッシュは古いまま残る。Drawer は閉じると unmount され、次回オープン時に default の refetchOnMount で再取得されるため、実害は「再表示直後の一瞬の古い表示」に限られる。
- 修正方向: event 作成・更新・削除の成功時に `milestoneKeys.events` も invalidate する（または staleTime: 0 を明示）。

### [情報-5] 履歴に無関係の chore コミットが含まれる
- 対象: 33a6476 `chore #261015: ローカル起動のための、環境変数入れ替え`（.gitignore, src/lib/AuthInfo.ts, vite.config.ts）
- 事象: `origin/main...FETCH_HEAD` の純差分にはこの 3 ファイルは含まれない（確認済み）。ただし履歴上は含まれ、vite.config.ts では本番用 cloudflare プラグインがコメントアウトされている（「削除しないでね」注記あり）。マージ方式によっては反映されるリスクがある。
- 修正方向: 本 PR から除外（rebase で drop）するか、ローカル用変更であることを PR で明示する。

### [低-6] backend: `ev.to_dict()` の二重呼び出し（nit）
- 場所: light_token_server app/routers/timetable.py:310 と 313 付近
- 事象: 同一イベントに対し to_dict を 2 回生成している。機能影響なし。
- 修正方向: 1 回だけ生成して再利用。

## 4. Issue #40 との整合チェック

| 受け入れ要件 | 実装 | 判定 |
|---|---|---|
| マイルストーンタイトル右に '...' ボタン | MilestoneListTitle.tsx（ActionIcon, aria-label 付き） | OK |
| 右からスライドする Drawer | MilestoneEventsDrawer.tsx（position="right"） | OK |
| progress 別の開閉アコーディオン | Accordion、固定順 これから/まだ/もうすぐ/完了/指定なし | OK |
| progress null は「指定なし」 | normalizeProgressGroup（ただし [低-2] の例外あり） | 概ね OK |
| 開示後にタイトル一覧 → スタッフID / グループ名 / 開始日時 | MilestoneEventRow | OK |
| タイトル 1 行三点リーダー ↔ クリックで 2 行 | clamp1 / clamp2（-webkit-line-clamp） | OK（[低-3] 操作性は要改善） |
| group_name はバックエンド委譲 | timetable.py の group_name 付与 | OK |
| API は open/waiting のみ | MILESTONE_OPEN / MILESTONE_WAITING | OK |
| closed は対象外 | closed 用エンドポイントは admin のまま | OK |

結論: Issue #40 の要求に沿った実装。ただし [中-1] の権限緩和に伴うレスポンス過多は仕様の意図（タイトル閲覧）を超える可能性があるため、マージ前の対応を推奨。

## 5. 改善提案

1. [中-1] open/waiting 用レスポンスをホワイトリスト化し、response keys テストを更新する（マージ前推奨）。
2. [低-2] `Object.hasOwn` ベースの正規化に変更し、'constructor' 等のテストを追加。progressColor.ts にも同じ修正を適用するか検討。
3. [低-3] 展開トリガーを UnstyledButton 化してキーボード操作を可能にする。
4. [低-4] event mutation 成功時に `milestoneKeys.events` を invalidate する。
5. [情報-5] PR から chore コミット 33a6476 を除外する（rebase）。
6. [低-6] backend の to_dict 二重呼び出しを解消。

## 6. 検証の記録

| 項目 | コマンド | 結果 |
|---|---|---|
| フロント lint | `bun run lint`（作業ツリー = PR head と src 同一を確認） | エラー・警告なし |
| フロントテスト | `bun run testrun` | 21 files passed / 146 tests passed / 1 skipped |
| backend テスト（milestone） | `uv run pytest tests/test_milestone.py -q`（light_token_server） | 46 passed |
| フロント build | 未実行 | PR 記載の「0 errors」は未再現 |
| 挙動再現 | node で normalize/group ロジックを複製し progress='toString' / 'constructor' を入力 | 該当イベントが欠落することを確認（[低-2]） |
| backend PR 本体 | 未確認（リポジトリ外） | ローカル light_token_server の該当コミットで代替 |

作業ツリーの注意: 現在のローカル HEAD には PR 外のコミット c133ede（docs: レビューエージェント機能更新）が追加されている。未コミット変更（docs/architecture/README.md）と untracked（docs/architecture/2026-10-16-architecture.md, timeline_diff.txt）は本レビュー対象外。

## 7. 対応ラベル（後でタスク番号を付与する用）

- P1（マージ前）: [中-1]
- P2（次の修正で対応）: [低-2], [低-3], [低-4]
- P3（整理）: [情報-5], [低-6]

## 8. 追補: docs/architecture/2026-10-16-architecture.md（未追跡ファイル）の確認

ステータス: 未コミットの untracked ファイル。PR #42 には含まれない。AGENTS.md の方針どおり実装後の docs 作業として扱い、欠落は指摘しない。内容の誤りと実装とのドリフトのみ確認。

- 「アルファベット順」の記述は誤り（ドリフト）。 実装（src/lib/milestoneEvents.ts の PROGRESS_GROUP_ORDER = ['これから','まだ','もうすぐ','完了','指定なし']）は固定の日本語順。Issue #40 本文も「これから」「まだ」「もうすぐ」「完了」「指定なし」の順で列挙しており、tasks/issue-40/architecture.md D3 と specs/2026-10-15-spec.md §2-5 も同じ固定順。アルファベット順のソートは実装されていない（sort / localeCompare なし）。
- 修正方向: 文書の「進捗（progress）別のアルファベット順」を「進捗（progress）別の固定順（これから→まだ→もうすぐ→完了→指定なし）」に変更。
- 「Mantien」は「Mantine」の誤記（Overview 1 項目目）。
- 「バックエンドおよびフロントエンドで…admin gate 撤去」: 本リポジトリ（フロント）の diff に admin gate は存在しない（フロントは MilestoneEventsDrawer / useMilestoneEventsQuery で権限分岐なし）。権限緩和の実体は light_token_server の app/routers/timetable.py のみ。文書は「フロントは権限分岐なし、バックエンド側で admin gate 撤去」と分けて書くべき。
- 「Commits List」は PR #42 の 1 行のみで、個別コミットを列挙していない。Changed Files は概ね正しい（.gitignore / vite.config.ts / AuthInfo.ts は PR の純差分外で、履歴の chore コミット 33a6476 由来であり本文書には正しく含まれていない）。
- 「遅延読み込み」「純粋関数によるグループ化」「organisms 配置」は実装と一致。
- 文書が「PR #42」を参照しているため、マージ後の docs PR で commit SHA / 最終 PR 番号を確認すること（現時点では PR head 33a6476 基準）。

結論: 文書の主要な記述（機能・遅延読み込み・権限緩和の方向性）は実装と合うが、「アルファベット順」は実装・Issue・仕様と食い違う誤りで、要修正。
