# Issue #41 'closed' マイルストーンのイベント参照 — 実装計画

> **For Hermes:** 実行時は `tasks/issue-41/tasks.md`（Task 0〜8、完全なコード付き）をタスク単位で消化する。詳細設計は `tasks/issue-41/architecture.md`、テストは `tasks/issue-41/test-plan.md`。

**Goal:** 管理者が「閉じたマイルストーン」ボタンから右 Drawer を開き、closed マイルストーン（達成日降順）→ 完了イベントのタイトル → `staff_id` / グループ名 / `end_time` の 3 段で振り返れるようにする。

**Architecture:** closed 一覧を返す API が存在しないため `GET /milestone/closed`（admin 限定・達成日降順・NULL 末尾）を新設。既存 `GET /milestone/closed/{id}/events` は変更せず、フロントで `progress == '完了'` に絞る。UI は Issue #40 の「右 Drawer + クリックで開閉 + 1 行三点リーダー → 2 行」パターンを踏襲し、clamp CSS を `molecules/clampText.css.ts` に抽出して共有する。

**Tech Stack:** React 19 / TypeScript 5.7 / Mantine v7 / Vanilla Extract / TanStack Query 5 / date-fns / Vitest / FastAPI + SQLAlchemy (pytest)

---

## 1. 現状（調査済みの事実）

| 事実 | 根拠 |
|------|------|
| `GET /milestone/closed/{milestone_id}/events` は**既存**（admin gate あり、404 契約あり） | `light_token_server/app/routers/timetable.py:331-339` |
| **closed マイルストーンの一覧 API は無い**。`GET /milestone/all` は `status in (open, waiting)` 固定 | `app/routers/timetable.py:286-294` |
| closed イベント dict には `group_name` が付与済み（Issue #40） | `_get_milestone_events` / `models.py:142` |
| `accomplished_date` が NULL の closed が存在し得る（`DELETE /milestone/remove` 経由） | `app/routers/timetable.py:387-402` |
| 管理者判定は `useAuthInfo().admin`（JWT claims 由来） | `src/components/pages/TimelinePage.tsx:45-46` |
| 「マイルストーン作成」ボタンは `MilestoneAddButton`（admin のみ、`adminBar` 未導入） | `src/components/organisms/MilestoneAddButton.tsx` |
| clamp スタイル（1 行 ⇄ 2 行）は `MilestoneEventsDrawer.css.ts` にあり | 同ファイル `clampLine/clamp1/clamp2` |
| バックエンドのテストは `.venv/bin/python -m pytest`（pyenv 3.13 未インストール） | `.python-version` / `.venv` |
| バックエンド repo は `fix/2points-from-front` ブランチで別作業中 | `git branch --show-current` |

## 2. API 契約（新規 1 本のみ）

### `GET /milestone/closed`（admin 限定）

- 認可: `require_token` + `claims["admin"]` 偽 → **403** `{"detail": "admin only"}`
- 対象: `MilestoneORM.status == "closed"`
- 並び: `.order_by(accomplished_date.is_(None), accomplished_date.desc())`（NULL は末尾）
- 返り値: `[MilestoneORM.to_dict()]`（`id, staff_id, title, description, color, status, created_at, guideline_end_date, accomplished_date`）

```python
@router.get("/milestone/closed")
def get_closed_milestones(claims: dict = Depends(require_token), db: Session = Depends(get_db)):
    """Issue #41: 閉じたマイルストーンの一覧 (管理者のみ)。"""
    if not claims.get("admin"):
        raise HTTPException(status_code=403, detail="admin only")
    rows = (
        db.query(MilestoneORM)
        .filter(MilestoneORM.status == MILESTONE_CLOSED)
        .order_by(MilestoneORM.accomplished_date.is_(None), MilestoneORM.accomplished_date.desc())
        .all()
    )
    return [m.to_dict() for m in rows]
```

既存 `GET /milestone/closed/{id}/events` は**仕様変更なし**（フロントで `progress` 絞り込み）。

## 3. ステップバイステップ（`tasks/issue-41/tasks.md` の要約）

| Task | 内容 | 完了条件 |
|------|------|---------|
| 0 | フロントは `feature/milestone-events/41`、バックエンドは `main` から `feature/milestone-closed/41` を切る | `git branch --show-current` が期待どおり |
| 1 | バックエンド: `GET /milestone/closed` + pytest 4 件（降順 / NULL 末尾 / open・waiting 除外 / 非 admin 403） | `pytest tests/test_milestone.py -q` 全 PASS |
| 2 | `filterCompletedEvents`（`milestoneEvents.ts`）+ `formatAccomplishedDate`（`milestone.ts`）+ 単体テスト（`milestoneEvents.spec.ts` 追記 / `milestone.spec.ts` 新規） | RED → GREEN、`testrun` PASS |
| 3 | `milestoneKeys.closed()/closedEvents(id)`、`fetchClosedMilestones/fetchClosedMilestoneEvents`、`useClosedMilestonesQuery(enabled)`、`useClosedMilestoneEventsQuery(id, enabled)`、`queries.spec.tsx` に mock 追加 + enabled ゲート 2 件 | `testrun` PASS（factory の列挙漏れに注意） |
| 4 | clamp スタイルを `molecules/clampText.css.ts` へ抽出し、`MilestoneEventsDrawer` の import を差し替え | Issue #40 のテスト 3 件 PASS のまま |
| 5 | `ClosedMilestoneDrawer.tsx` + `.css.ts`（3 段: マイルストーン行 → 完了イベント行 → 3 メタ行） | `lint` / `build` 0 エラー |
| 6 | `MilestoneClosedButton.tsx`（admin のみ）+ `TimelinePage` を `adminBar`（縦積み右寄せ）で配線、`addButtonArea` の margin 調整 | 「作成」の直下にボタン、非 admin 非表示 |
| 7 | `ClosedMilestoneDrawer.test.tsx`（4 件）+ `MilestoneClosedButton.test.tsx`（2 件） | 6 件 PASS |
| 8 | 品質ゲート（下記）を親が実行 | 全て緑 + 実ブラウザ確認 |

### UI 構造

```
toolbar
├── MilestoneList                （open / waiting, 既存）
└── adminBar (column, flex-end)
    ├── MilestoneAddButton       （既存）
    └── MilestoneClosedButton    （新規, admin のみ）
        └── ClosedMilestoneDrawer (position="right")
            ├── ClosedMilestoneRow      … タイトル + 達成日 / クリックで開閉 + 2 行化
            │   └── ClosedMilestoneEvents … filterCompletedEvents → 完了イベントのみ
            │       └── ClosedEventItem  … タイトル / クリックで 3 メタ行
            └── …
```

## 4. 変更ファイル一覧

**バックエンド（`../light_token_server`）**
- `app/routers/timetable.py`（`get_closed_milestone_events` の直前に新規ルート）
- `tests/test_milestone.py`（末尾に 4 件 + `_close_directly` ヘルパ）

**フロント（`time-table-to-line`）**
- `src/lib/milestoneEvents.ts` / `src/lib/milestone.ts` / `src/tests/milestoneEvents.spec.ts` / `src/tests/milestone.spec.ts`（新規）
- `src/resources/cache.ts` / `fetch.ts` / `queries.ts` / `queries.spec.tsx`
- `src/components/molecules/clampText.css.ts`（新規）
- `src/components/organisms/MilestoneEventsDrawer.css.ts` / `.tsx`（clamp 抽出）
- `src/components/organisms/ClosedMilestoneDrawer.tsx` / `.css.ts`（新規）
- `src/components/organisms/MilestoneClosedButton.tsx`（新規）
- `src/components/organisms/ClosedMilestoneDrawer.test.tsx` / `MilestoneClosedButton.test.tsx`（新規）
- `src/components/pages/TimelinePage.tsx` / `TimelinePage.css.ts` / `src/components/organisms/MilestoneAddButton.css.ts`

## 5. 検証

```bash
# フロント
bun run testrun && bun run lint && bun run build

# バックエンド
cd ../light_token_server && .venv/bin/python -m pytest tests/test_milestone.py -q
```

実ブラウザ（ユーザー実施）: 管理者で「閉じたマイルストーン」→ 達成日降順 → 行クリックで完了イベントのみ → イベントクリックで staff_id / グループ名 / 終了日時。一般ユーザーではボタン非表示（＋API 直叩きで 403）。

## 6. リスク / トレードオフ / 未決事項

| 項目 | 判断 |
|------|------|
| closed 一覧の取得方法 | **新規 `GET /milestone/closed`** を採用。`/milestone/all?status=closed` への拡張は既存契約（open + waiting 固定）を壊すため不採用 = **決定済み** |
| 達成日 NULL の closed | バックエンドで末尾固定 + フロントで「達成日なし」表示 = **決定済み** |
| 絞り込みの場所 | フロント（`normalizeProgressGroup === '完了'`）。英字トークン `complete` も完了扱い = **決定済み** |
| 開閉 UI | Mantine `Accordion` ではなく自前 `useState`。タイトルクリックで「開閉 + 2 行化」を同時に満たす最小実装 = **決定済み** |
| アニメーション | Issue 本文で**打ち消し線**のため実装しない = **決定済み** |
| 未決 | なし（実ブラウザ確認で UI 調整が入る可能性のみ） |

**前提:** Issue #40 の Drawer/型/クエリはマージ済み（フロント `39a9f8f` 系、バックエンド `39979be`）。別 repo のため、スキーマ/フィールド名の契約変更は行わない（新規フィールド追加なし）。
