# PR #32 Review

## 参照資料

### 確認済み
- PR #32: `'month' ビューからのイベント追加`
  - 目的: month ビューのクリックで 0:00–23:59 のフルデイイベントを作成し、week ビューでは `.rbc-row` / `.rbc-event-allday` として表示する。
  - 関連 Issue: #29
- Issue #29: `[Feature]'month' ビューでの、イベントの追加`
  - 受け入れ要件: month/week で作成時刻を区別すること、month 由来イベントを week の `.rbc-row` に表示すること。
- `tasks/issue-29/README.md`
- `tasks/issue-29/overview.md`
- `tasks/issue-29/architecture.md`
- `tasks/issue-29/tasks.md`
- `tasks/issue-29/test-plan.md`
- `specs/2026-09-17-spec.md`
- `docs/architecture/2026-09-17-architecture.md`
- `tasks/task-08/` の 11PM 問題に関する前提
- 比較対象: `origin/main`

### 不一致・未確認
- PR 本文では実ブラウザ確認済みと記載されていますが、今回のレビュー環境ではバックエンドが起動しておらず、ブラウザ上の DOM 配置（`.rbc-row` / `.rbc-event-allday`）は再確認できませんでした。
- knowledge graph は本リポジトリの TypeScript ノードを検出できず、依存関係・テスト網羅性の補助情報は取得できませんでした。ソースと実行結果を優先して確認しています。

## 総評
Issue #29 の目的に沿って、month ビューのクリック情報を `CalendarView → CalendarPage → DialogOnSlot → TitleInput` と伝播し、month だけ `endOfDay` を使用する実装になっています。`allDayAccessor` もフルデイ判定に限定されており、week の通常イベントおよび既存の 11PM 丸め処理を維持する設計は妥当です。純関数テストと TitleInput のペイロードテストも追加されています。

一方、ビュー変更を検知するために `currentView` を `onSlotInfo` の effect 依存に追加した結果、過去のスロット選択を再送信する状態遷移が発生します。ダイアログのクローズ状態が親の `slotInfo` に反映されない既存構造と組み合わさると、ビュー切替時に古いイベント追加ダイアログが再表示される可能性があり、マージ前に確認・修正すべきです。

## 良い点
- Issue #29 の実装範囲に対応する `tasks/issue-29/` の計画・アーキテクチャ・テスト計画が追加され、PR の目的と変更対象が追跡可能です。
- `resolveEventEnd` によって month と week の終了時刻分岐を純関数へ集約し、既存の `resolveSlotEnd` の 23:00 挙動を維持しています。
- `isFullDayEvent` を `allDayAccessor` に渡し、0:00–当日 endOfDay のイベントだけを all-day として扱う意図が明確です。date-only（0:00–0:00）や通常の時間イベントを誤って同じ判定にしないテストもあります。
- `onSlotInfo` のコールバックを `useCallback` で安定化したことで、親の state 更新と子の effect 依存による無限再実行を防いでいます。
- `bun run testrun`: 16 files passed、91 tests passed（1 skipped）、`bun run lint`、`bun run build` は実行環境で成功しました。

## 指摘事項

### [P2] ビュー切替時に過去の slotInfo を再通知する不要な状態更新

- 対象: `src/components/pages/CalendarView.tsx:106-108`
- 問題: `useEffect` が `[onSelectSlot, slotInfoState, onSlotInfo, currentView]` に依存しているため、`currentView` が week/month に変わるたびに、最後に選択した `slotInfoState`（または初回の `undefined`）を再度 `onSlotInfo` へ渡します。これは「スロットを選択した時に、その時点の view を伝える」という目的に対して過剰な通知です。
- 影響: `CalendarPage` は通知のたびに新しい `{ slotInfo, view }` オブジェクトを `setSlotPicker` するため、ビュー切替だけで親が不要に再レンダーします。また `DialogOnSlot` の close はローカル引数を変更するだけで親の `slotPicker` を消去しないため、将来 slot state の参照や effect 条件が変わると古い選択を再利用する温床になります（現状の `slotInfo` 参照が同一なら、必ずダイアログが再表示されるとは断定できません）。
- 改善方向: スロット選択時に `slotInfo` とその時点の view を同じ state に保存し、新しい選択があった場合だけ親へ通知してください。少なくとも `slotInfoState` が未定義のときは通知しないこと、通知済み選択の再送信を避けることをテストで固定してください。併せて DialogOnSlot の close を親 state に反映できる close callback を設けると、ダイアログのライフサイクルが明確になります。

### [P2] 実ブラウザ受け入れ要件を自動テストで検証できていない

- 対象: `src/components/pages/CalendarView.tsx:130-151`、`src/tests/Calendar.spec.tsx`
- 問題: 追加テストは `resolveEventEnd`、`isFullDayEvent`、TitleInput の mutation payload を検証していますが、`Calendar` に渡す `allDayAccessor` の結果や、month で取得した view が TitleInput まで伝播する経路はコンポーネント統合テストで検証していません。PR 本文の `.rbc-row` / `.rbc-event-allday` 確認は手動確認に依存しています。
- 影響: `allDayAccessor` の引数形式、view state の更新タイミング、RBC の描画条件が将来変更された場合に、Issue #29 の受け入れ要件をテストで検知できません。
- 改善方向: 少なくとも `MyCalendar` の Calendar mock で `allDayAccessor(fullDayEvent)` が true / 通常イベントが false になること、`onSelectSlot` 相当の操作で month の view が TitleInput の payload に到達することをテストしてください。RBC の実 DOM 配置は、可能なら Storybook/ブラウザテストで保持してください。

### [P2] `isFullDayEvent` の判定が「同一分」を許容する

- 対象: `src/lib/slot.ts:33-38`
- 問題: `isSameMinute(start, startOfDay(start))` と `isSameMinute(end, endOfDay(start))` は、秒・ミリ秒まで一致しなくても true になります。例えば start が 00:00:59、end が 23:59:00 のイベントも、同じ分ならフルデイ扱いになります。コメントおよび設計文書は「0:00」「23:59:59.999」の厳密な時刻パターンを前提にしています。
- 影響: API や DnD など別経路で作られた境界時刻のイベントが、意図せず all-day として週ビュー上部へ移動する可能性があります。
- 改善方向: 要件が厳密な endOfDay 判定なら `getTime() === startOfDay(...).getTime()` / `getTime() === endOfDay(...).getTime()` のように比較するか、少なくとも秒・ミリ秒を含む境界を明示したテストを追加してください。逆に同一分許容が意図なら、仕様・コメント・テストでその契約を明記してください。

## 改善提案
1. P1 を優先して、slot 選択通知のライフサイクルとダイアログ close の state ownership を整理する。
2. `MyCalendar` の統合テストで month/week の view 伝播と `allDayAccessor` を検証し、手動確認だけに依存しない受け入れテストを追加する。
3. `isFullDayEvent` の境界精度を仕様として確定し、実装・ドキュメント・テストを同じ粒度に揃える。
4. PR 本文の「全て緑（実ブラウザを含む）」という記載は、CI の自動品質ゲートと手動ブラウザ確認を分けて記載すると、再現可能な検証結果として読みやすくなります。

## 判定
P1 が残っているため、現時点ではマージ前に修正・再確認を推奨します。自動テスト、lint、build は成功しています。
