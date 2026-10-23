# PR #45 レビュー

- PR: https://github.com/gensukeSpp/time-table-to-line/pull/45
- タイトル: fix #261022: Issue #44 3 点の変更
- 状態: DRAFT / author: gensukeSpp
- head: fix/three-repairments/44 @ cc66c8c（レビュー時点の PR head と一致）
- base: main（比較: origin/main。ローカルに main と origin/main が存在）
- 規模: 15 files, +915 / -11（ソース 7 / テスト 2 / docs・tasks・specs 6）
- 実施内容: gh pr view 45 / gh issue view 44 / git diff origin/main...HEAD / review(action=context, base=origin/main) / bun run testrun / bun run lint / light_token_server の pytest tests/test_timetable.py
- 未実施: 実ブラウザ確認（PR 本文では「ユーザー実施予定」）

## 参照資料

確認できたもの:
- Issue #44（OPEN）: 問題点 2 件・目的・仕様変更 1 件・受け入れ要件 3 件
- tasks/issue-44/: README.md, overview.md, architecture.md, tasks.md, test-plan.md（PR に含む）
- specs/2026-10-22-spec.md（PR に含む。D1〜D5 を記録）
- バックエンド: ../light_token_server の app/routers/timetable.py（update_event_item 205-208 行）, tests/test_timetable.py（progress null 1 件追加、pytest 20 passed）

存在しない／確認不可:
- docs/architecture/2026-10-22 系: 本 PR に無し。AGENTS.md の運用どおり実装後に別 docs PR で作成されるため欠陥扱いしない。
- 本 PR のフロントは light_token_server の progress null 対応（バックエンド側の変更）に依存する。デプロイ順序の確認が必要。

## 総評

Issue #44 の 3 受け入れ要件（マイルストーン作成フォームの再オープン時リセット、進捗の null 復帰、同グループメンバーの閲覧緩和）に対応する変更で、要求と実装はおおむね一致している。
品質ゲートは再実行で確認済み（testrun 166 passed / 1 skipped、lint 0 error / 0 warning、backend pytest 20 passed）。
指摘は主に「旧データ（英字トークン）の表示」「閲覧緩和に伴う権限の多層防御の不足（既存のバックエンド仕様）」「仕様書の数値ドリフト」の 3 系統。マージを止めるほどの欠陥は見当たらないが、指摘 1 と 2 は対応を推奨する。

## 良い点

- 進捗の未定化を「状態 = undefined / 送信時 = null」に分離し、`progress: undefined` が JSON から消えて解除されない罠を `?? null` で明示的に塞いでいる（EventUpdateButton.tsx:22-23）。
- バックエンドの判定を `model_fields_set` に統一し、既存の milestone_id と同じパターンで一貫している（timetable.py:207）。
- 進捗セレクトの value を日本語ラベルに統一し、保存・表示の round-trip を成立させている（InputItem.tsx:128-129）。
- 閲覧緩和は `readOnly` 契約を維持し、編集ボタンは isOwnEvent でのみ出る（InputItem.tsx:140-144 付近）。未使用になった authId を削除して lint を保っている。
- テストは「null 送信の検証」を `toBeNull()` で行い、undefined と null の混同を防いでいる。

## 指摘事項

### [High] 指摘 1: 旧データ（英字トークン）が編集フォーム・詳細表示で壊れる
- 場所: src/components/organisms/InputItem.tsx:120（`value={eventItem.progress ?? ''}`）、InputItem.tsx:91 と閲覧モード（readOnly）の `<Text>{selectedEvent.progress ?? ''}</Text>`
- 問題: 既存データの progress には英字トークン（`almost` 等）が入っている。セレクトの選択肢は今や日本語ラベルのみのため、`almost` は選択肢に一致せず、編集フォームはプレースホルダー表示になる。閲覧モードは `almost` をそのまま表示する。
- 影響: 「旧データ互換」は配色（progressToColor）とグルーピング（normalizeProgressGroup）だけで担保されており、表示と編集は互換されていない。編集フォームで何も変えずに保存すると、表示上は「未定」なのに DB の `almost` が送られる（実際は値が残る）ため、ユーザーの認識とズレる。
- 補足: この問題は PR 前から存在していた（旧コードも value='almost' を選択肢と照合できなかった）。ただし PR は「保存値を日本語に統一した」と説明しており、旧データの扱いが未整理のまま残る点は指摘に値する。テストは fixture を `もうすぐ` に書き換えており、英字トークンの表示は検証されていない。
- 修正方針: 表示・編集の両方で `progress` を英字トークンから日本語ラベルへ正規化してから使う（milestoneEvents.ts の TOKEN_TO_GROUP / progressColor.ts の PROGRESS_TOKEN_TO_LABEL と同じ変換を共通関数に集約して再利用）。加えて英字 fixture（`almost`）での表示・編集テストを 1 件追加する。

### [Medium] 指摘 2: 閲覧緩和に伴い、バックエンドの更新・削除に所有者チェックが無い
- 場所: light_token_server/app/routers/timetable.py `update_event_item`（218-245 行付近）、`remove_event_item`（246-257 行付近）
- 問題: `/event/update/{id}` と `/event/remove/{id}` は `require_token` のみで、staff_id の所有者チェックが無い。一方、`/date/update` は所有者チェック（timetable.py 233-238 行）を持つ。つまり更新・削除の権限制御は UI（isOwnEvent）にしか無い。
- 影響: 本 PR は「閲覧のみ緩和」と説明しているが、閲覧 UI の緩和により他メンバーのイベント ID を見られるようになった。API を直接叩けば、認証済みの任意ユーザーが他人のイベントを更新・削除できる。これは PR の変更で新たに生じたリスクではなく既存の欠陥だが、受入 3 が「権限」に関わるため、本 PR で無視すべきではない。
- 修正方針: 別 Issue として、更新・削除に `target.staff_id != claims["user_id"]` の 403 チェックを追加する（admin を例外にするかは要件確認）。少なくとも PR 説明で「閲覧のみ緩和。更新・削除はバックエンド未保護」と明記する。
- 注意: 本 PR のフロント側で権限を変えたものではないため、マージ可否の判断材料として扱う。

### [Low] 指摘 3: マイルストーン作成フォームで、再オープン直後に前回の値が一瞬見える
- 場所: src/components/organisms/MilestoneCreateDialog.tsx:24-31（`useEffect([opened])`）
- 問題: リセットは描画後の useEffect で行われるため、開いた直後の 1 フレームに前回の値が残る可能性がある。
- 影響: 目視で気付きにくいが、初期値の確定はレンダー時に行う方が確実。
- 修正方針: 閉じる時（onClose 直前）にリセットする、または Modal に key を振って再マウントする。現行の effect でも機能要件は満たすため、優先度は低い。

### [Low] 指摘 4: 仕様書の数値とテスト結果が一致しない
- 場所: specs/2026-10-22-spec.md の品質ゲート表（「165 passed / 1 skipped」）、PR 本文（166 passed）
- 問題: 再実行結果は 166 passed / 1 skipped。spec の数値が古い。
- 影響: 文書の正確さのみ。機能への影響はない。
- 修正方針: 実行結果に合わせて spec を更新する（docs 修正は同一 PR 内で可）。

### [Low] 指摘 5: 閲覧モードの空 progress が「---進捗を選んでください---」相当の空表示
- 場所: InputItem.tsx:91
- 問題: progress が null の場合は空文字を表示する。閲覧専用の詳細では「未定」と表示した方が、ユーザーに意味が伝わる。
- 修正方針: `selectedEvent.progress ?? '未定'` へ変更するか、現状維持を spec に明記する（要件次第）。

## 改善提案

1. 指摘 1 の対応として、progress の表示用正規化（英字 → 日本語ラベル、null → 未定）を 1 関数に集約し、InputItem（編集・閲覧）・progressColor・milestoneEvents の 3 箇所から参照する。英字 fixture のテストを追加する。
2. 指摘 2 は別 Issue を立て、`/event/update` と `/event/remove` に所有者チェックを入れる。その際、admin を例外にするかを Issue 本文で決める。
3. PR 本文と spec の数値を最新の品質ゲート結果に揃える（165 → 166）。
4. 実ブラウザ確認（受入 1〜3）の結果を PR に追記する。特に一般ユーザーでの他メンバーイベントのクリック挙動と、英字トークンの旧データを確認する。
5. デプロイ順序: フロント（この PR）はバックエンドの `model_fields_set` 変更に依存するため、バックエンドを先にデプロイする。

## 周辺ロジックへの影響（確認結果）

- EventUpdateButtons: `...indicateEvent` を送るため、progress を含めた全フィールドが毎回送られる。`?? null` により、この経路では progress が常に明示送信される。既存の値が in-memory に無い（list から欠落）場合は解除されるリスクがあるが、/event/all は to_dict で progress を常に返すため現状は問題ない。
- CalendarView: resolveEventColor は progress null を既定色へ委譲しており、受入 2 の配色復帰は成立する（progressColor.ts:35-40 と 57-65）。
- useUpdateEventMutation の onMutate: setQueryData で `progress: undefined` のまま楽観更新するため、キャッシュ上は一時的に undefined となり、サーバー応答後に null へ戻る。表示上の問題はない。
- TimelinePage: canMove/canResize は false のため、閲覧緩和による DnD 経由の誤編集は発生しない（TimelinePage.tsx:220-221）。
- milestoneEvents / progressColor: 英字トークンと日本語ラベルの両方を正規化しているため、保存値の変更による集計・配色の回帰は確認できなかった。
- review(action="context") の影響範囲は 79 ファイル / 91 ノードと広いが、大半は共有 import 経由の推移的依存であり、本 PR の変更点は上記の範囲に収まると判断した。
