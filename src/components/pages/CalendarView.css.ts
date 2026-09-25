import { globalStyle, style } from '@vanilla-extract/css';

export const flexXmandatory = style({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  overflowX: "auto",
  scrollSnapType: "x mandatory"
});

export const gridArea = style({
  display: 'grid',
  gridTemplateRows: '1fr 19fr',
  margin: '0 1%'
});

// Issue #30 - 対策3: EW リサイズアンカーのヒット領域拡大 + 隣イベントより上に。
// dnd styles.css の既定は中身（3px の icon）しか当たり判定がなく、z-index 未指定のため、
// 隣スロットのイベントと重なると掴めない。各イベントの内部に収まる幅を持たせ、上に重ねる。
// 10px は隣接イベントの共有境界を越えないため、左右アンカーのヒット領域が衝突しない。
// （こちらも selector は :global() ラッパ不要）
globalStyle('.rbc-addons-dnd-resize-ew-anchor', {
  width: '10px',
  zIndex: 2,
});