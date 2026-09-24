# Issue #30 — test-plan.md

## 検証システム / 前提
- リポジトリ: `the-calendar-to-timeline/time-table-to-line`（フロントエンドのみ）
- フレームワーク: Vitest + jsdom + Testing Library。実ブラウザ確認は開発者（user）が実施
- ゲート: `bun run testrun` / `bun run lint`（`--max-warnings 0`）/ `bun run build`

## 1. 静的品質ゲート
すべてのタスク完了後に実行し、緑であること:
```bash
bun run testrun
bun run lint
bun run build
```
注意:
- 未使用 import / 変数 / 型の残存は `--max-warnings 0` で落ちる。Task 2 で `eventPropGetter` を削除した後、`uncontrolStyle` / `controlStyle` や不要になった import が残らないこと
- `.css.ts` の `globalStyle` は `@vanilla-extract/css` から import（Task 3 で `style` と併記）
- `console.log` の残存禁止（AGENTS.md セキュリティ方針）

## 2. 単体テスト（Vitest）
### `src/tests/slot.spec.ts`（Task 1）
#### `shouldBlockMonthDnd`
- month + フルデイ（0:00–23:59）→ `false`（操作可）
- month + 時間イベント（9:00–10:00）→ `true`（ブロック）
- week + 時間イベント → `false`（'week' は従来どおり）
- month 以外の view（`agenda` 等）→ `false`

実行:
```bash
bunx vitest run src/tests/slot.spec.ts 2>&1 | tail -20
```

### `src/tests/CalendarView.spec.tsx`（Task 2）
#### アクセサ wiring
- view=week（既定）: `draggableAccessor` / `resizableAccessor` が時間イベントに `true`
- view=month へ切替後: 時間イベントに `false`、フルデイイベントに `true`
- `stubRegistry.props` から props を取得して検証（既存の stub 構成を流用）

実行:
```bash
bunx vitest run src/tests/CalendarView.spec.tsx 2>&1 | tail -20
```

### 既存テストへの影響
- `CalendarView.spec.tsx`: `eventPropGetter` 削除による既存アサート依存はなし（イベントProps進行には影響しない）。`Calendar.spec.tsx` / `DialogOnSlot.spec.tsx` はビューの DnD 描画と作成経路のみで、`eventPropGetter` / accessor に依存しない → 変更不要（実行して確認）

## 3. 実ブラウザ確認（user 実施、受け入れ要件）
ログイン（バックエンド `/login`）→ `/auth?token=...` → `/calendar` で確認。

### 対策 1（色分け）
- [x] 'month' にフルデイイベント（`0:00–23:59`）と時間イベントを用意し、フルデイが候補色（例 `#00695c`）で表示される
- [x] 時間イベントは従来の `#3174ad` のまま区別できる
- [x] 白抜き文字が読める（候補色が白とコントラスト不足なら `color` を明示）
- [x] マイルストーン色（赤・紫）と紛らわしくない

### 対策 2（DnD 不可）
- [x] 'month' で時間イベントを掴んでリサイズ → **ハンドルが出ず伸縮できない**
- [x] 'month' で時間イベントをドラッグ（移動）→ **移動できない**
- [x] 'month' でフルデイイベントは EW（横）リサイズハンドルが出て伸縮できる
- [x] 確認ダイアログは出ない（不可を採用。ダイアログ方式は Issue #31）

### 対策 3（リサイズ 操作）
- [x] 'month' で隣セルに別イベントがあるフルデイイベントを用意 → 右端 EW ハンドルを確実に掴んで伸縮できる
- [x] 隣接境界の数ピクセル範囲で、左イベントの右端と右イベントの左端をそれぞれ個別に操作できる（同じイベントが選択され続けない）
- [x] イベントの幅は日セル・マルチデイのグリッドからズレない（width 縮小はしていない）
- [x] アンカー拡大でイベント選択（クリック → 詳細）が邪魔されない

### 回帰（'week'）
- [x] 'week' 時間列のイベント移動（ドラッグ）が従来どおり
- [x] 'week' 時間列の縦リサイズが従来どおり
- [x] 'week' のフルデイイベントが `.rbc-row`（バンド行）に表示され `.rbc-event-allday` 色がついている
- [x] 同時刻重なりイベントの表示（幅自動分割）が保たれている

## 4. 回帰テスト（その他）
- [x] `bun run testrun` で既存全スイート緑（特に `Calendar.spec.tsx` / `DialogOnSlot.spec.tsx` / `TitleInput.spec.tsx`）
- [x] `bun run lint` / `bun run build` 緑

## 5. リスク対応
| リスク | 対応 |
|--------|------|
| `.rbc-event-allday` 着色だけでは区別が弱い | 必要なら `eventPropGetter` で `background` を返す方式に切替（時間列でも `background` は生存するため）。ただし CSS を優先 |
| EW アンカー拡大でクリックが邪魔 | `width` を小さく（8–12px）へ調整。z-index を下げる等も選択肢。実ブラウザで最小値確認 |
| accessor の identity が毎 render 変わる性能懸念 | closure 参照はビュー切替時のみ更新。リサイズ/ドラッグ中は毎フレーム newState 更新が既にあるため実害なし。ベンチ不要 |
| 人為的な `0:00–23:59` イベントが無効化対象に | `isFullDayEvent` の既存契約でフルデイ扱い。実用上望ましい挙動と判断（overview.md リスク5） |
| `eventPropGetter` 削除で「他ユーザーの半透明化」を失う | 表示は既に自分のイベントのみ（`CalendarView.tsx:31-33`）なので影響なし。もし必要なら `opacity` を戻せる |