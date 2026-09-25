# Issue #37 — 'week' 以外（day / agenda / work_week）への進捗色適用（実装計画）

## 紐付け元
- GitHub Issue: **[[Feature] 'week' 以外の day / agenda ビューにも進捗色を適用する](https://github.com/gensukeSpp/time-table-to-line/issues/37)**（`gensukeSpp` / OPEN）
- ブランチ: `feature/day-agenda-view/37`（`origin/main` ベース）
- 対象リポジトリ: `the-calendar-to-timeline/time-table-to-line`（**フロントエンドのみ**。バックエンド契約変更なし）

## 経緯（実ブラウザ確認の結果）
> 当初ユーザーから「`day` / `agenda` にイベントが表示されない」との報告があったため調査した（`overview.md` `architecture.md` に静的調査の記録あり）。その後、実ブラウザ確認で **描画は正常であると判明（ユーザーの見誤り）**。併せて進捗色は既に 'week' を踏襲して 'day' にも適用され、'day' での DnD も問題ないことを確認。

**その結果、本 Issue の実装は「コードは（main に）既にある」状態である。**
- `resolveEventColor` は既に day / agenda / work_week に進捗色を返す（ロジック変更不要）。
- 実際に変更・確定したのは、以下の 2 点のみ。
  1. `CalendarView.tsx` のリファクタ前残骸 `stateAll.length > 2` ガードを除去（ユーザーのイベントが 2 件以下でも描画されるように）。回帰防止テストを追加。
  2. `resolveEventColor` の day / agenda / work_week テストを `src/tests/progressColor.spec.ts` に追加（既存挙動を固定）。

## スコープ内
1. **（実装済み）** `CalendarView.tsx` の `stateAll.length > 2` ガード除去と回帰防止テスト
2. **（実装済み）** `resolveEventColor`（week / day / agenda / work_week）の進捗配色テストを固定
3. **（実装済み）** 仕様・計画・アーキテクチャドキュメント（`specs/2026-09-25-spec.md` `tasks/issue-35/` `docs/architecture/README.md`）の view 表を week のみ → **week / day / agenda / work_week** に更新

## スコープ外
- 'month' ビューの配色（引き続き `#3174ad`（単日時間）/ `#00695c`（フルデイ・日跨ぎ）のみ。進捗配色は**出さない**）
- 進捗値の保存形式の是正（`InputItem` の NativeSelect のラベル value 仕様そのもの）
- タイムライン（`react-calendar-timeline`）側の配色
- バックエンド変更
- 色の具体的なトーン調整（進捗 4 色は Issue #35 で確定済みの `#3949ab / #5e35b1 / #8e24aa / #d81b60` を維持）

## 受け入れ要件
1. `resolveEventColor(event, 'day')` / `('agenda')` / `('work_week')` が `('week')` と同様に進捗色を返す（単体テスト済み）
2. `resolveEventColor(event, 'month')` は従来どおり `MONTH_FULLDAY_COLOR` / `undefined` のみ（**変更なし**）
3. ユーザーのイベントが 2 件以下でもカレンダーに描画される（集成テスト済み）
4. 実ブラウザで day / agenda にイベントと進捗色が表示される（ユーザー確認済み）
5. 品質ゲート `bun run testrun` / `bun run lint` / `bun run build` が全て緑
