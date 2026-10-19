import { style } from '@vanilla-extract/css';

// タイトル用: 既定 1 行（三点リーダー）、クリックで 2 行（クラス切替）。
// Issue #40 の MilestoneEventsDrawer と Issue #41 の ClosedMilestoneDrawer で共有する。
export const clampLine = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
  wordBreak: 'break-word',
  flex: 1,
  minWidth: 0,
});

export const clamp1 = style({ WebkitLineClamp: 1 });
export const clamp2 = style({ WebkitLineClamp: 2 });
