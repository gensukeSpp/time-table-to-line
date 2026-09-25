# Issue #37 — tasks.md（実装記録・残作業）

> 実ブラウザ確認で「day / agenda 空表示」は**見誤り**と判明し、進捗色は既に 'day' へ適用・DnD も動作しているため、**機能実装は不要**。
> 実際に実施したのは、リファクタ前残骸の除去＋テスト固定の **2 点のみ**。以下が実装記録と残作業。

## Task 1（実施済み）: `CalendarView.tsx` の `stateAll.length > 2` ガードを除去する

**Objective**: ユーザーのイベントが 2 件以下でもカレンダーに描画されるようにする（リファクタ前残骸の除去）。

**Files**:
- Modify: `src/components/pages/CalendarView.tsx:32-34`

**変更内容（TDD: RED → GREEN）**
1. 失敗テスト（`src/tests/Calendar.spec.tsx`）：状態全体 2 件（AuthUser=1 は 1 件）で `MyCalendar` をレンダーし、**1 件描画**を検証 → **旧コードでは state=undefined になり 0 件で FAIL**。
2. 実装：ガード条件 `auth.type === 'auth' && stateAll.length > 2` を `auth.type === 'auth'` に変更（コメントで除去理由を明記）。
3. 検証：`bunx vitest run src/tests/Calendar.spec.tsx` → PASS。

**根拠（副作用なしの確認）**: `useEventsState()` は常に配列を返す（undefined なら throw。`src/hooks/useContextFamily.ts:13-17`）。ガードが false のとき `state=undefined` → 非 auth の場合と同一経路を通るため、`[]` / 0 件の既存テスト（`Calendar.spec.tsx` の空配列テスト）も通ることを確認。

## Task 2（実施済み）: `resolveEventColor` の week/day/agenda/work_week テストを追加する

**Objective**: 進捗配色が week 以外のビューでも適用されることを単体テストで固定（Issue #37 の仕様確定）。

**Files**:
- Modify: `src/tests/progressColor.spec.ts`（`describe.each(['day','agenda','work_week'])` を追加）

**検証**: `bunx vitest run src/tests/progressColor.spec.ts` → 18 tests PASS。
- 進捗なし（null/undefined）→ `undefined`（rbc 既定 `#3174ad` へ委譲）
- 進捗あり → 対応色（例 `'完了'`→`#d81b60`）。week と同挙動。

## Task 3（実施済み）: 既存テストの stale コメント修正

**Files**: `src/tests/Calendar.spec.tsx`
- `fullDayEvents` テストの「`stateAll.length > 2` のときのみフィルタ表示するため 3 件用意する」コメントを、ガード除去後の実態（staff1 のフルデイ/時間を all-day 判定するための構成）に更新。
- 併せて `console.log(eventTitles)` を削除（AGENTS.md の console.log 禁止遵守）。

## Task 4（実施済み）: ドキュメントの view 表を week / day / agenda / work_week へ更新

**Objective**: 進捗配色の対象 view を仕様・計画・アーキテクチャ文書で統一する。

**Files**:
- Create: `specs/2026-09-25-spec.md`（本 Issue の仕様記録）
- Modify: `tasks/issue-35/README.md` / `tasks/issue-35/architecture.md`（view 表を明示化）
- Modify: `docs/architecture/README.md`（2026-09-25 行を追加）

**実績**:
- `specs/2026-09-25-spec.md` を新規作成（確定仕様・経緯・品質ゲートを記録）。
- `tasks/issue-35/architecture.md` の view 表を `week / 他` → `week / day / agenda / work_week` に明示し、Issue #37 による拡張の注記を追加。
- `tasks/issue-35/README.md` に「初期は week のみ → Issue #37 で week/day/agenda/work_week へ拡張」の注記を追加。
- `docs/architecture/README.md` に 2026-09-25 行を追加。
- grep で「weekのみ」系の残存が無いことを確認（`docs/architecture/2026-09-24-architecture.md` は Issue #35 時点のスナップショットのため履歴として維持）。

**Commit**:
```bash
git add specs/2026-09-25-spec.md tasks/issue-35/ docs/architecture/
git commit -m "docs(issue-37): 進捗配色対象 view を week/day/agenda/work_week に統一"
```

## Task 5（残）: 品質ゲート

```bash
bun run testrun   # 全テスト 1 回実行（緑）
bun run lint      # --max-warnings 0
bun run build     # tsc + vite build 0 errors
```
- 実ブラウザで day / agenda の進捗色・DnD を再確認（ユーザー実施）。

## 検証済みコマンド
- `bunx vitest run src/tests/Calendar.spec.tsx`（+ `CalendarView.spec.tsx`）→ 15 passed / 1 skipped
- `bunx vitest run src/tests/progressColor.spec.ts` → 18 passed