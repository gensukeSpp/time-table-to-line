# Issue #23 — イベントのマイルストーン所属と配色

> **紐付け元:** GitHub Issue #23 `[Feature]イベントのマイルストーン所属と配色`
> **共有要件:** [`requirement-03.md`](../../requirement-03.md)（マイルストーン機能、フロント / バックエンド共通）
> **既存前提:** `/milestone/*`（add / all / update / remove）は Issue #16/#18 で実装済み。`TimelineEventProps.milestone_id` / `completed`、`MilestoneProps`、`MilestoneStatus`、`useMilestonesQuery` / `fetchMilestones` も実装済み。本 Issue は「**イベント → マイルストーン所属（セレクト）**」と「**タイムラインでの配色**」を足す。

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`architecture.md`](./architecture.md) | 型・API 契約・TanStack Query / コンポーネント配置の設計 |
| [`overview.md`](./overview.md) | Issue 概要・スコープ内外・依存・リスク |
| [`tasks.md`](./tasks.md) | 実装タスク（TDD 形式、bite-sized、直列依存順） |
| [test-plan.md](./test-plan.md) | 単体テスト / リンター / 実ブラウザ確認の検証計画 |

## この Issue のスコープ（再掲）

**スコープ内**
1. Calendar のイベント詳細（`AddChildForm`）に、**open 状態のマイルストーンだけ**を列挙するセレクトボックスを追加（実装要件 1）
2. 所属変更を `/event/update/{event_id}` へ送信（既存の「更新」ボタンに乗せる）
3. Timeline 側で、所属マイルストーンの色でイベントを配色（`milestone_id` → `MilestoneProps.color`、実装要件 2）
4. 所属マイルストーンの status が `waiting` なら `opacity: 0.7` の網掛け（実装要件 3、`completed` は boolean のまま）
5. Timeline 詳細（readOnly）で所属マイルストーン名を表示

**スコープ外**
- マイルストーンの close → `completed` 自動 True（バックエンド側の Issue #18 で既対応）
- Calendar（react-big-calendar）側のイベント配色
- マイルストーン自体の CRUD UI（Issue #16/#18 済み）

## 受け入れ要件（Issue #23）

1. セレクトボックスには **open 状態のマイルストーンのみ** が表示されるか
2. 所属されたイベントはデフォルト色 `#2196f3` → 所属マイルストーンの色で Timeline に表示される
3. waiting 状態のマイルストーン所属イベントには `opacity: 0.7` の網掛けがかかる