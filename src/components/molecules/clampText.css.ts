import { style } from '@vanilla-extract/css';

// タイトル用: 既定 1 行（三点リーダー）、クリックで 2 行（クラス切替）。
// Issue #40 の MilestoneEventsDrawer と Issue #41 の ClosedMilestoneDrawer で共有する。
//
// flex: 1 / minWidth: 0 は Issue #41 の ClosedMilestoneDrawer で
// eventTitleRow (display: flex) の直下に UnstyledButton を配置するために追加。
// Issue #40 の MilestoneEventsDrawer では eventRow に display: flex を追加し、
// clampLine の flex: 1 が効くようにしている（T-1, T-2 参照）。
// 今後の DOM 変更で挙動が変わる可能性があるため、変更時は両コンポーネントの表示を確認すること。
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
