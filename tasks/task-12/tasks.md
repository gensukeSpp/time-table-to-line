# Task-12 tasks — 実装タスク

> 本調査（2026-09-08）にて調査・実装・検証済み。以下は再現・適用用の bite-sized タスク。
> 大部分は完了済みであるため、ここでは「適用済みの内容を確認/再現する」形で整理する。

## 前提・環境

- 起動: バックエンド `uvicorn app.main:app` (light_token_server, port 8000, `ENABLE_MILESTONE_SCHEDULER=false` 推奨) / フロント `bun run dev` (port 5173)。
- ログイン: 社員番号 `201`（admin）/ パスワード `projectA2`。→ バックエンド `/login` からログインし、`/timetable/auth` 経由でフロント `/timeline` へ。
- 検証用 DB データ（PostgreSQL `timetable_db`）:
  - milestone 1 = waiting（色 `#9c27b0`）→ イベント 19「止めたレビューで出費」
  - milestone 2 = open（色 `#009688`）→ イベント 14「ジャンプチームの手伝い」

## T1. エラーの再現（修正前を確認）

1. `git checkout` 等で修正前の `TimelinePage.tsx` を確認（`getItemProps({ style: decor })` 版）。
2. フロント起動、`/timeline` を開く。
3. イベント「止めたレビューで出費」をクリック → `#ffc107` になる。
4. 別の未所属イベントをクリック → 「止めたレビューで出費」が `#2196f3`（デフォルト）に戻ることを確認。→ **バグ再現**。

## T2. itemRenderer を修正（適用済み）

`src/components/pages/TimelinePage.tsx` の `itemRenderer` を architecture.md の「修正後」に変更。

要点:
- `itemContext` 型に `'selected'` を追加。
- `getItemProps({ style: decor })` → `getItemProps({ style: {} })`。
- `applyMilestoneStyle`（ref コールバック）で非選択時 `!important` 付き `background-color` + `opacity` を適用、選択時は `removeProperty`。
- `itemRef` でライブラリの ref と `applyMilestoneStyle` を合成。
- 未所属イベントは早期 return（透明化回帰ガード）。

```bash
bun run lint      # --max-warnings 0 で通る
bun run build     # tsc + vite build 0 エラー
```

## T3. 実ブラウザで受け入れ要件を確認

`test-plan.md` の「実ブラウザ手動確認」の操作手順を実施。特に:

- 選択解除後に「止めたレビューで出費」→ `#9c27b0`、「ジャンプチームの手伝い」→ `#009688` に戻ること。
- 未所属イベントは選択解除後 `#2196f3` のまま。
- 選択中（該当イベントが選択色のとき）は `#ffc107`。

## T4. 回帰確認（全テスト + lint + build）

```bash
bun run testrun   # 単体テスト（72 passed / 1 skipped 前提）
bun run lint
bun run build
```

## T5. コミット/ブランチ（利用者の判断事項）

本修正は `src/components/pages/TimelinePage.tsx` の 1 ファイルのみ。commit 先は利用者が判断（現ブランチ `feature/automate-close/11` はタスク内容と無関係なため、別ブランチ化が望ましい場合は相談）。