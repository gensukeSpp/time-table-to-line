# PR #33 Review

## 参照資料

### 確認済み
- PR: `gh pr view 33`
  - Issue #30 対応。month ビューで単日時間イベントの DnD を無効化し、フルデイ／日跨ぎイベントの操作、色分け、EW ハンドル拡大を行う変更。
- Issue: `gh issue view 30`
  - 受け入れ要件は、month の時間イベントを移動・伸縮不可にすること、week の DnD を壊さないこと。
- タスク: `tasks/issue-30/{overview,architecture,tasks,test-plan}.md`
- 仕様: `specs/2026-09-18-spec.md`
- アーキテクチャ: `docs/architecture/2026-09-18-architecture.md`
- 比較対象: `origin/main`（`main` は比較に使用せず）。
- Knowledge graph: `review(action=context, base=origin/main)` は実行済み。TypeScript の changed nodes は未インデックスで、構造的な影響範囲は取得できなかった。`query(action=impact)` も 0 nodes だったため、ソースと git diff を用いて周辺ロジックを確認した。

### 不一致・不足
- `docs/architecture/2026-09-18-architecture.md` は `slot.ts (関数削除)`、`CalendarView.spec.tsx (テスト削除)` と記載しているが、実際の PR は `shouldBlockMonthDnd` とテストを追加している。実装の正誤には直結しないが、記録が現状と一致していない。
- `tasks/issue-30/overview.md` の Done チェックボックスは未更新。PR 本文ではブラウザ確認済みとされているため、完了記録として整合させる必要がある。

## 総評

PR #33 は Issue #30 の主目的に沿っており、`draggableAccessor` / `resizableAccessor` による month ビューの単日時間イベント制限、フルデイ色分け、EW ハンドル拡大を実装している。`shouldBlockMonthDnd` を純関数化し、month/week・フルデイ・日跨ぎのテストを追加している点は良い。`bun run testrun`、`bun run lint`、`bun run build` は実行上成功した。

ただし、EW アンカーを左右両方 20px に拡大して同じ `z-index` を与えているため、隣接イベントのアンカー同士が重なり、境界付近で「意図したイベントのハンドルではなく隣のイベントのハンドルを掴む」可能性がある。Issue の対策 3 の中心機能に関わるため、ブラウザで境界操作を確認するまでマージは保留を推奨する。

## 良い点

- `src/lib/slot.ts` の判定を `shouldBlockMonthDnd` に切り出し、既存の `isFullDayEvent` を再利用して判定ロジックを一元化している。
- `currentView` を `useCallback` の依存に含めており、month/week の切り替え後に accessor が古い view を参照し続けない。
- 日跨ぎイベントを `isSameDay` で単日時間イベントから除外しており、month でフルデイを伸長した後も継続して操作できるようにしている。これは PR 本文に記載された実ブラウザ検証結果とも一致する。
- `eventPropGetter` の自他判定は、現状 `state` がログインユーザーのイベントだけに絞られているため実効性がなく、DnD 制御を専用 accessor に移した整理は妥当。
- 自動テストでは month/week、時間イベント、フルデイ、日跨ぎの組み合わせを確認しており、単純な month のみのテストより回帰条件が明確になっている。
- 生成 CSS を確認した結果、`.rbc-event.rbc-event-allday` と EW アンカーのルールはビルド成果物に出力されている。Vanilla Extract の `globalStyle` の使い方も現状は正しい。

## 指摘事項

### [P1] 隣接イベントの EW ハンドルが相互に重なる可能性がある

- **場所**: `src/components/pages/CalendarView.css.ts:28-32`
- **内容**: `.rbc-addons-dnd-resize-ew-anchor` の左右アンカーに一律 `width: 20px; z-index: 2` を設定している。RBC のアンカーはイベントの左右端に `position: absolute` で配置されるため、隣接するイベントでは各アンカーの 20px のヒット領域が同じ境界をまたいで重なる。両方が同じ z-index なので、DOM 順により片方がもう片方を覆い、先行イベントの右端を操作したつもりが後続イベントの左端を操作する、または先行イベントのハンドルに到達できない状態になり得る。
- **影響**: Issue #30 の対策 3（隣セルにイベントがある場合の正しい EW リサイズ）が、イベント配置・DOM 順によって不安定になる。さらにアンカーがイベント内部 20px を覆うため、端付近の通常クリックによるイベント選択も阻害する可能性がある。
- **対応**: 実ブラウザで、連続する2イベントについて「左イベントの右端」「右イベントの左端」をそれぞれ数ピクセルずつクリックして、どちらのイベントがリサイズされるかを確認すること。必要であれば幅を最小限に戻す、左右アンカーを境界の外側中心に配置する／内側への侵入幅を半分にする、またはイベントごとの重なり順を制御して、両方向の操作領域が衝突しない CSS にすること。`width/z-index` の存在だけでなく、対象イベントが正しく選ばれることを自動テストまたは手動確認で受け入れ条件に追加したい。

## 改善提案

1. `src/components/pages/CalendarView.css.ts` の EW アンカーは、左右で同一の 20px 領域を作るのではなく、隣接イベントとの共有境界で領域が衝突しない寸法・配置を検証して決定する。特に `:first-child` / `:last-child` と `left` / `right` の関係を踏まえ、右端と左端のどちらも操作できることを確認する。
2. `src/tests/CalendarView.spec.tsx` は accessor の戻り値のみを検証しているため、実 DOM のアンカー生成や隣接イベントの選択順までは保証しない。RBC の実コンポーネントを使った描画テスト、または少なくともブラウザ受け入れテストに「隣接イベントの左右両方を個別にリサイズできる」を追加する。
3. `docs/architecture/2026-09-18-architecture.md` の変更ファイル表を実際の差分（`slot.ts` とテストの追加）に修正し、`tasks/issue-30/overview.md` の Done 状態も PR の検証結果と一致させる。

## 検証結果

- `git diff --check origin/main...HEAD`: 成功
- `bun run testrun`: 18 files passed、110 passed、1 skipped（合計 111 tests）
- `bun run lint`: 成功、warning なし
- `bun run build`: 成功（TypeScript/Vite build）
- 実ブラウザ確認: PR 本文の記録は参照したが、このレビュー環境ではログイン済み画面を再操作していない。そのため、上記 P1 の隣接イベント境界操作は未確認。

## 判定

P1 の境界操作を実ブラウザで確認し、問題があればアンカー領域の衝突を修正してからマージすることを推奨する。その他の Issue #30 対応ロジックと自動検証は概ね目的に合致している。

---

レビュー保存先: `.github/reports/pr-33-review.md`
アプリケーションコードは変更していない。

[2026-09-18] 初回レビュー

## 追加レビュー

PR #33 の現行差分・Issue #30・task/spec/architecture の対応を再確認した。追加のコード上の重大な不具合は確認できなかった。上記 P1 は、実装が必ず誤動作するという断定ではなく、隣接アンカーを同時に 20px 化したことによる相互干渉リスクであり、受け入れ条件上の実ブラウザ確認が必要な事項である。

[2026-09-18] 追加確認
