# 低-3: イベント title の展開がキーボード操作不可

## 概要
`src/components/organisms/MilestoneEventsDrawer.tsx:17-22` の `Text onClick` で展開しているため、クリックのみで開閉でき、フォーカス・Enter/Space で操作できない。

## 修正方向
- `UnstyledButton` 化、または `role="button"` / `tabIndex={0}` / onKeyDown を付与

## 対象ファイル
- `src/components/organisms/MilestoneEventsDrawer.tsx`
