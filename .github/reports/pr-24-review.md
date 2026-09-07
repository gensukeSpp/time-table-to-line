# PR #24 レビュー: feat #23: イベントのマイルストーン所属と配色

> **PR URL:** https://github.com/gensukeSpp/time-table-to-line/pull/24
> **ブランチ:** feature/event-belong-milestone/23 → main
> **作成者:** gensukeSpp
> **レビュー日:** 2026-09-07
> **レビュー結果:** ✅ Approve（軽微な指摘あり）

---

## 参照資料

| 資料 | 状態 |
|------|------|
| Issue #23 | 確認済 — `[Feature]イベントのマイルストーン所属と配色` |
| requirement-03.md | 確認済 — マイルストーン機能の共通要件定義 |
| specs/2026-09-07-1-spec.md | 確認済 — Issue #23 の実装完了報告 |
| docs/architecture/2026-09-07-1-architecture.md | 確認済 — マイルストーン所属と配色の設計 |
| tasks/issue-23/*.md | 確認済 — PR 内に含まれるタスク計画（README, architecture, overview, tasks, test-plan） |

---

## 総評

Issue #23 の受け入れ要件 3 件を全て満たす実装。イベントのマイルストーン所属を Calendar のフォームで設定し、Timeline 上でマイルストーンの色で配色し、waiting 状態なら opacity: 0.7 の網掛けを適用する。純粋関数へのロジック切り出し、型安全性、テストカバレッジとも良好。品質ゲート（build / lint / test）は全て通過。

---

## 良い点

1. **純粋関数の分離** — `src/lib/milestoneLookup.ts` に color/status lookup と装飾計算を切り出し、テスト容易性を確保。`computeItemDecorations` が `milestoneId == null` で `undefined | null` を吸収する設計が簡潔
2. **型安全性** — `itemRenderer` で `any` を使わず `Pick<ItemContext, ...>` による明示的型注釈を採用。ライブラリが `ItemRendererProps` を公開していない制約下で lint `no-explicit-any` を回避
3. **round-trip 対応** — waiting/closed マイルストーンに所属中のイベントでも、セレクトの選択肢から消えないよう現在所属を `unshift` で補完（受け入れ要件 1 のエッジケース）
4. **テスト充実** — 純粋ヘルパ 5 ケース + UI テスト 3 ケースで Issue #23 の受け入れ要件 1〜3 を全てカバー
5. **品質ゲート通過** — `bun run build` 0 error / `bun run lint` 0 warning / `bun run testrun` 72 passed (1 skipped は既存 Calendar.spec.tsx 由来)

---

## 指摘事項

### P1: [Low] PR スコープ逸脱 — `devtools/` ファイル削除

**ファイル:** `devtools/review_worker.py`, `devtools/watch_reviews.sh`

`devtools/` 配下の 2 ファイル（watchmedo ベースの Python 自動レビュー worker）が削除されているが、Issue #23「イベントのマイルストーン所属と配色」とは無関係。PR を小さく保つ原則に反し、レビューの焦点がぼやける原因となる。

**推奨対応:** 別 PR に分離する。不要ファイルの整理自体は正しい判断の可能性があるが、混在は避けるべき。

---

### P2: [Low] `milestoneLookup.ts` の null coalescing 冗長

**ファイル:** `src/lib/milestoneLookup.ts:5,11`

```ts
for (const m of milestones ?? []) map.set(m.id, m.color);
```

引数型は `MilestoneProps[]`（nullable ではない）であり、呼び出し側（`TimelinePage.tsx:50-51`, `InputItem.tsx:62`）で既に `milestones ?? []` としているため二重防御になっている。

**推奨対応:** `for (const m of milestones)` に簡略化。または引数を `MilestoneProps[] | undefined | null` に変更して関数内で null 吸収する責務を明確にする（二者択一）。

---

### P3: [Low] `InputItem.tsx` の `const` 配列に対する `unshift` ミューテーション

**ファイル:** `src/components/organisms/InputItem.tsx:62-68`

```ts
const milestoneOptions = (milestones ?? [])
  .filter((m) => m.status === 'open')
  .map((m) => ({ value: String(m.id), label: m.title }));
// ...
if (cur) milestoneOptions.unshift(...);
```

コメントで「毎レンダーで新配列を作るので unshift は `const` でも安全（prefer-const 対策）」と説明されているが、`const` は再代入不可であり `prefer-const` ルールは再代入を検出するもので、ミューテーションとは無関係。`const` で守られているように見えるが実際にはミューテーション可能。

**動作に影響なし。** ただし `[cur, ...milestoneOptions]` のスプレッドで新配列を作る方が意図が明確。

---

### P4: [Info] `itemRenderer` の毎レンダー再生成

**ファイル:** `src/components/pages/TimelinePage.tsx:148-170`

`itemRenderer` はコンポーネント内で毎レンダーごとに再生成される。`milestones` が変わると `colorByMilestoneId` / `statusByMilestoneId` が `useMemo` で再計算されるが、`itemRenderer` 自体は `useCallback` でメモ化されていないため、`<Timeline>` の props が毎回変わり不要な再レンダーの可能性がある。

**現時点では実用上問題ない**（マイルストーン数は少なく、Timeline のアイテム数が大量でない限り）。パフォーマンス課題が出た場合の改善候補。

---

### P5: [Info] テストフィクスチャの closed マイルストーン

**ファイル:** `src/tests/milestoneLookup.spec.ts:12`

フィクスチャに closed マイルストーン (id=3) を含めているが、テストケースでは id=99 の「map に存在しない id」で検証しており、closed の id=3 は直接テストで使われていない。`/milestone/all` は closed を返さない設計であるため、フィクスチャの closed が紛らわしい可能性がある。

**テスト結果に影響なし。** 将来的に closed の色を検証するテストを追加する際の参考情報として記録。

---

## 品質ゲート確認結果

| コマンド | 結果 |
|---------|------|
| `bun run build` | ✅ 0 errors |
| `bun run lint` | ✅ 0 warnings (`--max-warnings 0`) |
| `bun run testrun` | ✅ 14 files, 72 passed, 1 skipped (既存) |

---

## 受け入れ要件適合性

| # | 要件 | 状態 | 根拠 |
|---|------|------|------|
| 1 | セレクトボックスに open 状態のマイルストーンのみ表示 | ✅ 達成 | `InputItem.tsx:63` の `.filter((m) => m.status === 'open')` + テスト `InputItem.spec.tsx:114-118` |
| 2 | 所属イベントがマイルストーン色で Timeline 表示 | ✅ 達成 | `TimelinePage.tsx:161` の `computeItemDecorations` → `getItemProps({ style: decor })` + テスト `milestoneLookup.spec.ts:22-25` |
| 3 | waiting 状態で opacity: 0.7 の網掛け | ✅ 達成 | `milestoneLookup.ts:26` + テスト `milestoneLookup.spec.ts:28-31` |

---

## Issue #23 の目的との整合性

Issue #23 の目的「個別の作業(イベント)が、一つのマイルストーンの所属による管理と、そうであることを視覚的に明瞭化させるため」に対して:

- ✅ Calendar でイベントにマイルストーンを所属させる（セレクト追加）
- ✅ Timeline で所属マイルストーンの色で配色
- ✅ waiting 状態なら網掛け（opacity 0.7）
- ✅ readOnly 詳細で所属マイルストーン名を表示（スコープ外ではない追加実装、有用）
- ✅ 型変更なし（`TimelineEventProps.milestone_id` は既存型を維持）
- ✅ バックエンド変更不要（既存 `/event/update` の `milestone_id` 受容を活用）

---

## 改善提案

| 優先度 | 内容 |
|--------|------|
| 推奨 | `devtools/` 削除を別 PR に分離 |
| 任意 | `milestoneLookup.ts` の null coalescing を整理 |
| 任意 | `milestoneOptions` の `unshift` をスプレッドに変更 |
| 将来 | `itemRenderer` の `useCallback` メモ化（パフォーマンス課題が顕在化した場合） |