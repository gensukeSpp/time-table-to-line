# Task-12 test-plan — 検証計画

## 1. 静的品質ゲート

```bash
bun run lint      # --max-warnings 0 → 0 警告
bun run build     # tsc + vite build → 0 エラー
bun run testrun   # 単体テスト → 72 passed / 1 skipped（2026-09-08 時点）
```

## 2. 単体テスト

- `src/tests/milestoneLookup.spec.ts`（純関数 `computeItemDecorations` など）は変更なしで継続グリーン。
- `itemRenderer` はライブラリ描画依存のため単体では検証せず、実ブラウザ確認に委ねる（本 issue の方針）。必要なら Storybook で確認。

## 3. 実ブラウザ手動確認（受け入れ要件）

環境:
- バックエンド `uvicorn app.main:app`（port 8000）/ フロント `bun run dev`（port 5173）
- ログイン: 社員番号 `201` / パスワード `projectA2` → `/timetable/auth` 経由で `/timeline`

操作手順（Playwright 等で再現可）:

| # | 操作 | 期待 |
|---|---|---|
| 1 | `/timeline` を開く（未選択） | 止めたレビューで出費 = `#9c27b0`、ジャンプチーム = `#009688`、未所属 = `#2196f3` |
| 2 | 「止めたレビューで出費」(waiting) をクリック | `#ffc107`（選択色）+ opacity 0.7 |
| 3 | 別の未所属イベント（例「起床」）をクリック | 止めたレビューで出費が **`#9c27b0`** に戻る（デフォルトにならない）、起床が `#ffc107` |
| 4 | 「ジャンプチームの手伝い」(open) をクリック | `#ffc107` |
| 5 | 別イベントをクリック | ジャンプチームが **`#009688`** に戻る |
| 6 | 未所属イベントを選択 → 解除 | `#ffc107` → `#2196f3` を往復（既定どおり） |
| 7 | 一度も選択しないまま放置 | 全イベントの初期色が維持される |

## 4. 回帰リスク対応

- **未所属イベントの透明化**（初期版で踏んだ回帰）:
  `applyMilestoneStyle` が `!decor.backgroundColor` で早期 return することを確認。未所属イベントに `removeProperty` をかけない。
- **選択中に透明になるケース**:
  修正後は `getItemProps({style:{}})` により選択中はライブラリの `#ffc107`（`background` shorthand）が素直に当たる。`removeProperty('background-color')` は shorthand に触れないため透明化しない。実ブラウザで #3 の手順 2/4 で確認。

## 5. 検証ログ（本調査で実施済み 2026-09-08）

実ブラウザ（dedicated Chrome via CDP, 社員 201）で確認済み:
- 修正後、選択解除後に「止めたレビューで出費」→ `rgb(156,39,176)`（#9c27b0）、「ジャンプチームの手伝い」→ `rgb(0,150,136)`（#009688）、未所属 → `rgb(33,150,243)`（#2196f3）に復帰。
- lint / build / testrun 全て green。
- ※ タイムラインの時間窓/水平スクロールにより、特定座標への実クリックが画面外に外れやすいため、手動確認はイベントが見える位置で行う。