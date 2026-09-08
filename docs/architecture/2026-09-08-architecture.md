# Architecture Snapshot — 2026-09-08-2

## Purpose
タイムライン上でマイルストーン所属イベントをクリック（選択）し、その後別のイベントを選択して元のイベントの選択を解除した際、マイルストーン色を失いデフォルト色 (`#2196f3`) に戻ってしまうバグを修正しました。

## Overview
`react-calendar-timeline` のアイテム描画 (`itemRenderer`) において、React の宣言的な `style` prop 経由で適用していた背景色を、DOM ノードへの直接的な `!important` 付き `background-color` 適用 (imperative) に変更しました。これにより、ライブラリ内部の imperative なスタイル上書きに競り勝ち、正しいマイルストーン色を維持できるようにしました。

## Key Design Decisions
- **Imperative スタイル適用**: `itemRenderer` の `ref` コールバックで `element.style.setProperty` を使用し、`!important` を付与することで、ライブラリのスタイリングを確実にオーバーライド。
- **背景色の永続化**: ライブラリの `getItemProps` には `style: {}` を渡し、背景色の決定権を自作の ref コールバックに集約。
- **状態管理**: `itemContext.selected` を活用し、選択時はライブラリ既定の選択色 (`#ffc107`) を維持し、解除後は `decor` (マイルストーン色) に戻る制御を実現。
- **ガード処理**: 未所属イベントには背景色を適用しない早期 return を実装し、初期版で発生した透明化回帰を防止。

## Changed Files
- `src/components/pages/TimelinePage.tsx`
- `docs/architecture/README.md` (Update)

## Commits
- 6131aba: feat #260908: 実装済み案件 (Task-11 対応と合わせて Task-12 も対応)
