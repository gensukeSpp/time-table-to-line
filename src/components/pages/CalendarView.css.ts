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

// Issue #30 - 対策1: フルデイイベントの色分け。
// デフォルト .rbc-event の #3174ad から区別し、赤・紫（マイルストーン色）を避け、
// 白抜き文字（rbc 既定 color:#fff）が読める濃色にする。候補 #00695c（Teal 800）。
globalStyle(':global(.rbc-event-allday)', {
  backgroundColor: '#00695c',
});

// Issue #30 - 対策3: EW リサイズアンカーのヒット領域拡大 + 隣イベントより上に。
// dnd styles.css の既定は中身（3px の icon）しか当たり判定がなく、z-index 未指定のため、
// 隣スロットのイベントと重なると掴めない。幅を持たせ、上に重ねる。
globalStyle(':global(.rbc-addons-dnd-resize-ew-anchor)', {
  width: '20px',
  zIndex: 2,
});
