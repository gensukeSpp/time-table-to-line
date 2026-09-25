# Issue #35 — 進捗別に色分けをする（実装計画）

## 紐付け元
- GitHub Issue: **[#35 [Feature] 進捗別に色分けをする](https://github.com/…/issues/35)**（`gensukeSpp`）
- ブランチ: `feature/progress-color/35`（`origin/main` ベース）
- 対象リポジトリ: `the-calendar-to-timeline/time-table-to-line`（**フロントエンドのみ**。バックエンド契約変更なし）

## ドキュメント一覧
| ファイル | 内容 |
|---|---|
| `README.md` | 紐付け元、スコープ内/外、受け入れ要件（本ファイル） |
| `overview.md` | 目的、ユーザーストーリー、前提・依存、リスク、完了条件 |
| `architecture.md` | 型定義、配色パレット・API 契約、`eventPropGetter` 実装方針、変更対象ファイル表 |
| `tasks.md` | 実装タスク（TDD・bite-sized・直列依存順） |
| `test-plan.md` | 静的品質ゲート、単体テスト、実ブラウザ確認、回帰、リスク対応 |

## スコープ内
- **'week' ビュー**での、`TimelineEventProp.progress` に応じたイベント配色の変更
- 進捗なし（`null` / 初期）＝デフォルト色 `#3174ad` に戻すこと
- フルデイイベントに対する配色方法をビューで切り替える（`eventPropGetter` 化）
- 'month' ビューで追加されたイベントが 'week' ビューでも進捗配色になること
- イベント「更新」で配色が表示イベントへ即時反映されること

> **注（後続 Issue #37）**: 進捗配色の対象は**初期は 'week' のみ**だったが、Issue #37（`tasks/issue-37/`）により **'week' / 'day' / 'agenda' / 'work_week' へ正式拡張**された。'month' は引き続き対象外（`#3174ad` / `#00695c` のみ）。

## スコープ外
- 'month' ビューの配色（引き続き `#3174ad` / `#00695c` の 2 色のみ）
- 進捗値の**保存形式の是正**（`InputItem` の NativeSelect がラベルを value として保存する現仕様そのものの変更）
- タイムライン（`react-calendar-timeline`）側の配色（対象は Calendar の week ビュー）
- バックエンド変更

## 受け入れ要件
1. 'week' ビューで、フルデイイベントが進捗なしのときデフォルト色 `#3174ad` で表示される（従来の月ビュー識別色 `#00695c` から戻る）
2. 'week' ビューで、進捗（これから / まだ / もうすぐ / 完了 / null）により異なる色で表示される
3. null＝進捗なしだけがデフォルト `#3174ad`（初期状態）。残り 4 段階は「青の強い紫 → 赤の強い紫」の 4 パターン
4. 'month' ビューでは引き続き `#3174ad` / `#00695c` のみ（進捗配色は見せない）
5. 'month' で追加したイベントも 'week' ビューでは進捗に応じた配色
6. イベント「更新」後、表示イベントの色が対応色へ即時反映

## 主な設計判断
- 配色は rbc の **`eventPropGetter`（inline style）に一本化**し、`.rbc-event-allday` の固定 CSS（Issue #30 由来の `#00695c`）は削除する。view 毎・イベント毎に色を変えるため、静的な Vanilla Extract `globalStyle` ではビュー切替ができないため。
- `eventPropGetter` は月（`TimeGridEvent.js:41`）・週全デイ行（`EventRowMixin→EventCell`）・月セル（`DateContentRow→EventCell`）の全てで `getters.eventProp(...).style` が inline 適用されることを確認済み（rbc 1.20.0）。
- 進捗値はラベル（これから等）と英字トークン（`from now` 等）の**両表現を正規化**して色に変換する（詳細は `architecture.md`）。

> **注意**: 最終的な進捗の 4 色は UX 判断のため、実装前にユーザー確認が必要（`overview.md` リスク4 / `test-plan.md` 参照）。
